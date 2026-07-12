-- 046: Let assigned instructors keep old course URLs working when they edit a course slug.

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

NOTIFY pgrst, 'reload schema';