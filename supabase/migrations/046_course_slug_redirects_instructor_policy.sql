-- 046: Let assigned instructors keep old course URLs working when they edit a course slug.

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
DROP POLICY IF EXISTS "Course owners manage course slug redirects" ON public.course_slug_redirects;

CREATE POLICY "Course owners manage course slug redirects" ON public.course_slug_redirects FOR ALL TO authenticated
  USING (
    public.current_user_has_role(ARRAY['admin'])
    OR EXISTS (
      SELECT 1
      FROM public.courses course
      WHERE course.id = course_slug_redirects.course_id
        AND course.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.course_instructors assignment
      WHERE assignment.course_id = course_slug_redirects.course_id
        AND assignment.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    public.current_user_has_role(ARRAY['admin'])
    OR EXISTS (
      SELECT 1
      FROM public.courses course
      WHERE course.id = course_slug_redirects.course_id
        AND course.instructor_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.course_instructors assignment
      WHERE assignment.course_id = course_slug_redirects.course_id
        AND assignment.instructor_id = auth.uid()
    )
  );

GRANT SELECT ON public.course_slug_redirects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_slug_redirects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_slug_redirects TO service_role;

NOTIFY pgrst, 'reload schema';