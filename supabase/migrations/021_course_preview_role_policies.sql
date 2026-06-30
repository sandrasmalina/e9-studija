DROP POLICY IF EXISTS "Public read published courses" ON public.courses;
CREATE POLICY "Public read published courses" ON public.courses FOR SELECT
  USING (
    status = 'published'
    OR instructor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR public.current_user_has_role(ARRAY['admin'])
  );

DROP POLICY IF EXISTS "Instructor write own courses" ON public.courses;
CREATE POLICY "Instructor write own courses" ON public.courses FOR ALL TO authenticated
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