DROP POLICY IF EXISTS "Course owners manage course instructors" ON public.course_instructors;
CREATE POLICY "Course owners manage course instructors" ON public.course_instructors FOR ALL TO authenticated
  USING (
    instructor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR public.current_user_has_role(ARRAY['admin'])
  )
  WITH CHECK (
    instructor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR public.current_user_has_role(ARRAY['admin'])
  );

NOTIFY pgrst, 'reload schema';