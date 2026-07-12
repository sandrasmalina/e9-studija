-- 045: Keep old public course URLs working after course slug edits.

CREATE TABLE IF NOT EXISTS public.course_slug_redirects (
  old_slug text PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_slug_redirects_course_id
  ON public.course_slug_redirects(course_id);

ALTER TABLE public.course_slug_redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read course slug redirects" ON public.course_slug_redirects;
CREATE POLICY "Public read course slug redirects" ON public.course_slug_redirects FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin manage course slug redirects" ON public.course_slug_redirects;
CREATE POLICY "Admin manage course slug redirects" ON public.course_slug_redirects FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['admin']) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (public.current_user_has_role(ARRAY['admin']) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

GRANT SELECT ON public.course_slug_redirects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_slug_redirects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_slug_redirects TO service_role;

NOTIFY pgrst, 'reload schema';