-- 009: Create social_links table (was missing from initial setup)
-- Run this in: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.social_links (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  platform   text        NOT NULL,
  url        text        NOT NULL,
  icon_name  text        DEFAULT 'Globe',
  sort_order integer     DEFAULT 0,
  is_active  boolean     DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read social_links"  ON public.social_links;
DROP POLICY IF EXISTS "Auth write social_links"   ON public.social_links;

CREATE POLICY "Public read social_links"
  ON public.social_links FOR SELECT USING (true);

CREATE POLICY "Auth write social_links"
  ON public.social_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Grants (consistent with 007_add_grants.sql)
GRANT SELECT                         ON public.social_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_links TO service_role;
