-- 017: Store first and last names separately while preserving full_name compatibility.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text DEFAULT '';

UPDATE public.profiles
SET first_name = COALESCE(NULLIF(first_name, ''), split_part(COALESCE(full_name, ''), ' ', 1)),
    last_name = COALESCE(
      NULLIF(last_name, ''),
      NULLIF(trim(regexp_replace(COALESCE(full_name, ''), '^\S+\s*', '')), '')
    )
WHERE COALESCE(full_name, '') <> '';

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
