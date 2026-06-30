-- 014: Reusable campaign invitations
-- Supports controlled public links such as teacher campaign links.

ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS is_campaign boolean NOT NULL DEFAULT false;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS campaign_label text DEFAULT '';
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS max_uses integer;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS use_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  invite_token text;
  invite_row public.invitations%ROWTYPE;
  assigned_roles text[];
  role_name text;
BEGIN
  invite_token := NEW.raw_user_meta_data->>'invite_token';

  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'student'
  )
  ON CONFLICT (id) DO NOTHING;

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
      UPDATE public.invitations SET status = 'used', used_at = now() WHERE id = invite_row.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Public read invitation by token" ON public.invitations;
CREATE POLICY "Public read invitation by token" ON public.invitations FOR SELECT
  USING (
    status = 'pending'
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses)
  );
