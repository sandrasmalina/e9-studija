DROP POLICY IF EXISTS "Instructor write sections" ON public.sections;
CREATE POLICY "Instructor write sections" ON public.sections FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          OR public.current_user_has_role(ARRAY['admin'])
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          OR public.current_user_has_role(ARRAY['admin'])
        )
    )
  );

DROP POLICY IF EXISTS "Public read course availability groups" ON public.course_availability_groups;
CREATE POLICY "Public read course availability groups" ON public.course_availability_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.status = 'published'
          OR c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          OR public.current_user_has_role(ARRAY['admin'])
        )
    )
  );

DROP POLICY IF EXISTS "Instructor manage own course availability groups" ON public.course_availability_groups;
CREATE POLICY "Instructor manage own course availability groups" ON public.course_availability_groups FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          OR public.current_user_has_role(ARRAY['admin'])
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          OR public.current_user_has_role(ARRAY['admin'])
        )
    )
  );

NOTIFY pgrst, 'reload schema';