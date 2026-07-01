DROP POLICY IF EXISTS "Enrolled read resources" ON public.lecture_resources;
CREATE POLICY "Read lecture resources with course access" ON public.lecture_resources FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.lectures l
    WHERE l.id = lecture_resources.lecture_id
      AND (
        l.is_preview = true
        OR EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.course_id = l.course_id
            AND e.user_id = auth.uid()
            AND e.status = 'active'
            AND (e.expires_at IS NULL OR e.expires_at > now())
        )
        OR EXISTS (
          SELECT 1 FROM public.courses c
          WHERE c.id = l.course_id
            AND (
              c.instructor_id = auth.uid()
              OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
              OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
              OR public.current_user_has_role(ARRAY['admin'])
            )
        )
      )
  ));

DROP POLICY IF EXISTS "Manage lecture resources for course teachers" ON public.lecture_resources;
CREATE POLICY "Manage lecture resources for course teachers" ON public.lecture_resources FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.lectures l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lecture_resources.lecture_id
      AND (
        c.instructor_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR public.current_user_has_role(ARRAY['admin'])
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.lectures l
    JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = lecture_resources.lecture_id
      AND (
        c.instructor_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR public.current_user_has_role(ARRAY['admin'])
      )
  ));

NOTIFY pgrst, 'reload schema';
