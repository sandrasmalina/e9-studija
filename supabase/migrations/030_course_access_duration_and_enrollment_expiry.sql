ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS access_duration_months int;

ALTER TABLE public.courses
  DROP CONSTRAINT IF EXISTS courses_access_duration_months_check;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_access_duration_months_check
  CHECK (access_duration_months IS NULL OR access_duration_months > 0);

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_enrollments_user_course_expires
  ON public.enrollments(user_id, course_id, expires_at);

DROP POLICY IF EXISTS "Public read preview lectures" ON public.lectures;
CREATE POLICY "Public read preview lectures" ON public.lectures FOR SELECT
  USING (
    is_preview = true
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = lectures.course_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
        AND (e.expires_at IS NULL OR e.expires_at > now())
    )
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lectures.course_id
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
          OR public.current_user_has_role(ARRAY['admin'])
        )
    )
  );

DROP POLICY IF EXISTS "Enrolled read resources" ON public.lecture_resources;
CREATE POLICY "Enrolled read resources" ON public.lecture_resources FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.lectures l
    JOIN public.enrollments e ON e.course_id = l.course_id
    WHERE l.id = lecture_id
      AND e.user_id = auth.uid()
      AND e.status = 'active'
      AND (e.expires_at IS NULL OR e.expires_at > now())
  ));

NOTIFY pgrst, 'reload schema';