DROP POLICY IF EXISTS "Instructor write lectures" ON public.lectures;
CREATE POLICY "Instructor write lectures" ON public.lectures FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          OR public.current_user_has_role(ARRAY['admin'])
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.course_instructors ci
      WHERE ci.course_id = lectures.course_id
        AND ci.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          OR public.current_user_has_role(ARRAY['admin'])
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.course_instructors ci
      WHERE ci.course_id = lectures.course_id
        AND ci.instructor_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';