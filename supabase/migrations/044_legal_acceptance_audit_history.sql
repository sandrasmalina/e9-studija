-- 044: Preserve legal acceptance history and allow future legal document types.

ALTER TABLE public.legal_documents DROP CONSTRAINT IF EXISTS legal_documents_document_type_check;
ALTER TABLE public.legal_acceptances DROP CONSTRAINT IF EXISTS legal_acceptances_document_type_check;

ALTER TABLE public.legal_acceptances
  ADD COLUMN IF NOT EXISTS document_id uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text;

UPDATE public.legal_acceptances acceptance
SET document_id = document.id
FROM public.legal_documents document
WHERE acceptance.document_id IS NULL
  AND acceptance.document_type = document.document_type
  AND acceptance.version = document.version;

DO $$
DECLARE
  old_unique_constraint record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'legal_acceptances_document_id_fkey'
      AND conrelid = 'public.legal_acceptances'::regclass
  ) THEN
    ALTER TABLE public.legal_acceptances
      ADD CONSTRAINT legal_acceptances_document_id_fkey
      FOREIGN KEY (document_id) REFERENCES public.legal_documents(id) ON DELETE SET NULL;
  END IF;

  FOR old_unique_constraint IN
    SELECT constraint_name
    FROM information_schema.key_column_usage
    WHERE table_schema = 'public'
      AND table_name = 'legal_acceptances'
      AND constraint_name IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'legal_acceptances'
          AND constraint_type = 'UNIQUE'
      )
    GROUP BY constraint_name
    HAVING array_agg(column_name::text ORDER BY ordinal_position) = ARRAY['user_id', 'document_type']::text[]
  LOOP
    EXECUTE format('ALTER TABLE public.legal_acceptances DROP CONSTRAINT %I', old_unique_constraint.constraint_name);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.key_column_usage
    WHERE table_schema = 'public'
      AND table_name = 'legal_acceptances'
      AND constraint_name IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'legal_acceptances'
          AND constraint_type = 'UNIQUE'
      )
    GROUP BY constraint_name
    HAVING array_agg(column_name::text ORDER BY ordinal_position) = ARRAY['user_id', 'document_type', 'version']::text[]
  ) THEN
    ALTER TABLE public.legal_acceptances
      ADD CONSTRAINT legal_acceptances_user_document_version_key
      UNIQUE (user_id, document_type, version);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user_document
  ON public.legal_acceptances(user_id, document_type, version DESC);

DROP POLICY IF EXISTS "Users update own legal acceptances" ON public.legal_acceptances;
DROP POLICY IF EXISTS "Users accept legal documents" ON public.legal_acceptances;
CREATE POLICY "Users accept legal documents" ON public.legal_acceptances FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.legal_documents document
      WHERE document.document_type = legal_acceptances.document_type
        AND document.version = legal_acceptances.version
        AND (legal_acceptances.document_id IS NULL OR document.id = legal_acceptances.document_id)
    )
  );

CREATE OR REPLACE FUNCTION public.record_legal_acceptances_from_metadata(target_user_id uuid, legal_acceptance jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  document_row jsonb;
  source_value text;
  accepted_at_value timestamptz;
  document_type_value text;
  document_version_value int;
  legal_document_id uuid;
BEGIN
  IF legal_acceptance IS NULL OR jsonb_typeof(legal_acceptance) <> 'object' THEN
    RETURN;
  END IF;

  source_value := left(COALESCE(NULLIF(legal_acceptance->>'source', ''), 'signup'), 50);

  BEGIN
    accepted_at_value := COALESCE(NULLIF(legal_acceptance->>'accepted_at', '')::timestamptz, now());
  EXCEPTION WHEN others THEN
    accepted_at_value := now();
  END;

  IF jsonb_typeof(legal_acceptance->'documents') <> 'array' THEN
    RETURN;
  END IF;

  FOR document_row IN SELECT value FROM jsonb_array_elements(legal_acceptance->'documents') LOOP
    document_type_value := trim(COALESCE(document_row->>'document_type', ''));
    document_version_value := NULL;

    BEGIN
      document_version_value := NULLIF(document_row->>'version', '')::int;
    EXCEPTION WHEN others THEN
      document_version_value := NULL;
    END;

    IF document_type_value <> '' AND document_version_value IS NOT NULL THEN
      SELECT id INTO legal_document_id
      FROM public.legal_documents
      WHERE document_type = document_type_value
        AND version = document_version_value
      LIMIT 1;

      IF legal_document_id IS NOT NULL THEN
        INSERT INTO public.legal_acceptances (user_id, document_id, document_type, version, accepted_at, source)
        VALUES (target_user_id, legal_document_id, document_type_value, document_version_value, accepted_at_value, source_value)
        ON CONFLICT (user_id, document_type, version) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  invite_token text;
  invite_row public.invitations%ROWTYPE;
  assigned_roles text[];
  role_name text;
  first_name_value text;
  last_name_value text;
  full_name_value text;
BEGIN
  invite_token := NEW.raw_user_meta_data->>'invite_token';
  first_name_value := trim(COALESCE(NEW.raw_user_meta_data->>'first_name', ''));
  last_name_value := trim(COALESCE(NEW.raw_user_meta_data->>'last_name', ''));
  full_name_value := trim(COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), concat_ws(' ', first_name_value, last_name_value)));

  INSERT INTO public.profiles (id, full_name, first_name, last_name, avatar_url, role)
  VALUES (
    NEW.id,
    full_name_value,
    first_name_value,
    last_name_value,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
    first_name = COALESCE(NULLIF(public.profiles.first_name, ''), EXCLUDED.first_name),
    last_name = COALESCE(NULLIF(public.profiles.last_name, ''), EXCLUDED.last_name);

  PERFORM public.record_legal_acceptances_from_metadata(NEW.id, NEW.raw_user_meta_data->'legal_acceptance');

  IF invite_token IS NOT NULL THEN
    SELECT * INTO invite_row
    FROM public.invitations
    WHERE token = invite_token
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_uses IS NULL OR use_count < max_uses)
      AND (is_campaign = true OR lower(email) = lower(NEW.email))
    LIMIT 1;
  END IF;

  assigned_roles := COALESCE(invite_row.roles, ARRAY['student']);

  FOREACH role_name IN ARRAY assigned_roles LOOP
    INSERT INTO public.user_roles (user_id, role_id)
    SELECT NEW.id, r.id FROM public.roles r WHERE r.name = role_name
    ON CONFLICT DO NOTHING;
  END LOOP;

  IF assigned_roles && ARRAY['admin'] THEN
    UPDATE public.profiles SET role = 'admin' WHERE id = NEW.id;
  ELSIF assigned_roles && ARRAY['instructor'] THEN
    UPDATE public.profiles SET role = 'instructor' WHERE id = NEW.id;
  ELSE
    UPDATE public.profiles SET role = 'student' WHERE id = NEW.id;
  END IF;

  IF invite_row.id IS NOT NULL THEN
    IF invite_row.is_campaign THEN
      UPDATE public.invitations
      SET use_count = use_count + 1,
          status = CASE WHEN max_uses IS NOT NULL AND use_count + 1 >= max_uses THEN 'used' ELSE status END,
          used_at = CASE WHEN max_uses IS NOT NULL AND use_count + 1 >= max_uses THEN now() ELSE used_at END
      WHERE id = invite_row.id;
    ELSE
      UPDATE public.invitations
      SET use_count = use_count + 1,
          used_at = COALESCE(used_at, now())
      WHERE id = invite_row.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';