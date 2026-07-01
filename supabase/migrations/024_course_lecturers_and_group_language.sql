ALTER TABLE public.course_availability_groups ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'both';

CREATE TABLE IF NOT EXISTS public.course_instructors (
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'teacher',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, instructor_id)
);

ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read course instructors" ON public.course_instructors;
CREATE POLICY "Public read course instructors" ON public.course_instructors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Course owners manage course instructors" ON public.course_instructors;
CREATE POLICY "Course owners manage course instructors" ON public.course_instructors FOR ALL TO authenticated
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
  );

DROP POLICY IF EXISTS "Public read published courses" ON public.courses;
CREATE POLICY "Public read published courses" ON public.courses FOR SELECT
  USING (
    status = 'published'
    OR (
      auth.uid() IS NOT NULL AND (
        instructor_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = id AND ci.instructor_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR public.current_user_has_role(ARRAY['admin'])
      )
    )
  );

DROP POLICY IF EXISTS "Instructor write own courses" ON public.courses;
CREATE POLICY "Instructor write own courses" ON public.courses FOR ALL TO authenticated
  USING (
    instructor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = id AND ci.instructor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR public.current_user_has_role(ARRAY['admin'])
  )
  WITH CHECK (
    instructor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = id AND ci.instructor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR public.current_user_has_role(ARRAY['admin'])
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_instructors TO authenticated;
GRANT SELECT ON public.course_instructors TO anon;

DROP POLICY IF EXISTS "Course owners manage enrollments" ON public.enrollments;
CREATE POLICY "Course owners manage enrollments" ON public.enrollments FOR ALL TO authenticated
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