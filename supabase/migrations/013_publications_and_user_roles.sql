-- 013: Publications and flexible user roles
-- Run in Supabase SQL Editor after previous migrations.

-- Profile fields used by public author blocks
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_title text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio_lv text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_profile_enabled boolean NOT NULL DEFAULT true;

-- Flexible roles, alongside the legacy profiles.role field used by courses
CREATE TABLE IF NOT EXISTS public.roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description  text DEFAULT '',
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id    uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

INSERT INTO public.roles (name, display_name, description, sort_order) VALUES
  ('admin',      'Admin',      'Full platform administration access', 0),
  ('instructor', 'Teacher',    'Can teach and manage assigned courses', 1),
  ('author',     'Author',     'Can create and publish publication content', 2),
  ('student',    'Student',    'Can access enrolled learning content', 3)
ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

CREATE OR REPLACE FUNCTION public.user_has_role(target_user_id uuid, role_names text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_user_id
      AND p.role = ANY(role_names)
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = target_user_id
      AND r.name = ANY(role_names)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_role(role_names text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public AS $$
  SELECT public.user_has_role(auth.uid(), role_names);
$$;

-- Backfill current profile.role values into user_roles
INSERT INTO public.user_roles (user_id, role_id)
SELECT p.id, r.id
FROM public.profiles p
JOIN public.roles r ON r.name = p.role
ON CONFLICT DO NOTHING;

-- Invitations can carry several roles
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT ARRAY['student'];
UPDATE public.invitations
SET roles = ARRAY[COALESCE(NULLIF(role, ''), 'student')]
WHERE roles IS NULL OR array_length(roles, 1) IS NULL;

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
      AND lower(email) = lower(NEW.email)
      AND (expires_at IS NULL OR expires_at > now())
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
    UPDATE public.invitations SET status = 'used', used_at = now() WHERE id = invite_row.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Publications
CREATE TABLE IF NOT EXISTS public.publication_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en       text NOT NULL,
  name_lv       text DEFAULT '',
  slug          text NOT NULL UNIQUE,
  description   text DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.publications (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en              text NOT NULL,
  title_lv              text DEFAULT '',
  slug                  text NOT NULL UNIQUE,
  short_description_en  text NOT NULL DEFAULT '',
  short_description_lv  text DEFAULT '',
  content_en            text NOT NULL DEFAULT '',
  content_lv            text DEFAULT '',
  has_lv                boolean NOT NULL DEFAULT false,
  featured_media_url    text DEFAULT '',
  featured_media_type   text NOT NULL DEFAULT 'image',
  featured_image_alt    text DEFAULT '',
  publication_date      date NOT NULL DEFAULT CURRENT_DATE,
  author_id             uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  external_source_url   text DEFAULT '',
  is_featured           boolean NOT NULL DEFAULT false,
  status                text NOT NULL DEFAULT 'draft',
  seo_title             text DEFAULT '',
  seo_description       text DEFAULT '',
  seo_keywords          text DEFAULT '',
  og_title              text DEFAULT '',
  og_description        text DEFAULT '',
  og_image              text DEFAULT '',
  canonical_url         text DEFAULT '',
  no_index              boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT publications_status_check CHECK (status IN ('draft', 'published')),
  CONSTRAINT publications_media_type_check CHECK (featured_media_type IN ('image', 'youtube', 'vimeo'))
);

CREATE TABLE IF NOT EXISTS public.publication_category_links (
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  category_id    uuid NOT NULL REFERENCES public.publication_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (publication_id, category_id)
);

INSERT INTO public.publication_categories (name_en, name_lv, slug, display_order) VALUES
  ('CEO Insights',      'CEO atziņas',         'ceo-insights',      0),
  ('Interviews',        'Intervijas',          'interviews',        1),
  ('Articles',          'Raksti',              'articles',          2),
  ('Press',             'Prese',               'press',             3),
  ('Case Studies',      'Gadījumu izpēte',     'case-studies',      4),
  ('Research',          'Pētījumi',            'research',          5),
  ('Events',            'Pasākumi',            'events',            6),
  ('Company News',      'Uzņēmuma jaunumi',    'company-news',      7),
  ('App Creation',      'Lietotņu izveide',    'app-creation',      8),
  ('AI Insights',       'AI atziņas',          'ai-insights',       9),
  ('GTM Strategy',      'GTM stratēģija',      'gtm-strategy',      10),
  ('Industry Insights', 'Nozares atziņas',     'industry-insights', 11)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_category_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read roles" ON public.roles;
CREATE POLICY "Public read roles" ON public.roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Own read user_roles" ON public.user_roles;
CREATE POLICY "Own read user_roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_has_role(ARRAY['admin']));

DROP POLICY IF EXISTS "Admin manage user_roles" ON public.user_roles;
CREATE POLICY "Admin manage user_roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['admin']));

DROP POLICY IF EXISTS "Public read publication_categories" ON public.publication_categories;
CREATE POLICY "Public read publication_categories" ON public.publication_categories FOR SELECT USING (is_active = true OR public.current_user_has_role(ARRAY['admin', 'author']));

DROP POLICY IF EXISTS "Author manage publication_categories" ON public.publication_categories;
CREATE POLICY "Author manage publication_categories" ON public.publication_categories FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['admin', 'author']))
  WITH CHECK (public.current_user_has_role(ARRAY['admin', 'author']));

DROP POLICY IF EXISTS "Public read published publications" ON public.publications;
CREATE POLICY "Public read published publications" ON public.publications FOR SELECT
  USING (status = 'published' OR author_id = auth.uid() OR public.current_user_has_role(ARRAY['admin']));

DROP POLICY IF EXISTS "Author manage own publications" ON public.publications;
CREATE POLICY "Author manage own publications" ON public.publications FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['admin']) OR (public.current_user_has_role(ARRAY['author']) AND author_id = auth.uid()))
  WITH CHECK (public.current_user_has_role(ARRAY['admin']) OR (public.current_user_has_role(ARRAY['author']) AND author_id = auth.uid()));

DROP POLICY IF EXISTS "Public read publication links" ON public.publication_category_links;
CREATE POLICY "Public read publication links" ON public.publication_category_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "Author manage publication links" ON public.publication_category_links;
CREATE POLICY "Author manage publication links" ON public.publication_category_links FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['admin', 'author']))
  WITH CHECK (public.current_user_has_role(ARRAY['admin', 'author']));

-- Make invitation reads by token still work for registration, but writes stay admin-only.
DROP POLICY IF EXISTS "Public read invitation by token" ON public.invitations;
CREATE POLICY "Public read invitation by token" ON public.invitations FOR SELECT
  USING (status = 'pending' AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS "Admin manage invitations" ON public.invitations;
CREATE POLICY "Admin manage invitations" ON public.invitations FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['admin']));

GRANT SELECT ON public.roles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated, service_role;
GRANT SELECT ON public.publication_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_categories TO authenticated, service_role;
GRANT SELECT ON public.publications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publications TO authenticated, service_role;
GRANT SELECT ON public.publication_category_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publication_category_links TO authenticated, service_role;
GRANT SELECT ON public.invitations TO anon;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_publications_slug ON public.publications(slug);
CREATE INDEX IF NOT EXISTS idx_publications_status_date ON public.publications(status, publication_date DESC);
CREATE INDEX IF NOT EXISTS idx_publications_author ON public.publications(author_id);
