-- "Is this for you?" self-assessment questionnaire — per-course, optional.
-- Instructor toggles it on/off; an optional sales-assist path can offer a call.

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS questionnaire_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS sales_assist_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS sales_assist_calendar_url text;

-- One row per questionnaire attempt.
CREATE TABLE IF NOT EXISTS public.questionnaire_sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  outcome            text CHECK (outcome IN ('call_offered', 'pricing_pointed')),
  sales_assist_shown boolean NOT NULL DEFAULT false,
  started_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_sessions_course ON public.questionnaire_sessions(course_id, started_at DESC);

-- One row per answered question.
CREATE TABLE IF NOT EXISTS public.questionnaire_answers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES public.questionnaire_sessions(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  answer_value text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_answers_session ON public.questionnaire_answers(session_id);

-- RLS: writes go through a service-role API route; admins/course owners can read.
ALTER TABLE public.questionnaire_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner read questionnaire_sessions" ON public.questionnaire_sessions;
CREATE POLICY "Owner read questionnaire_sessions" ON public.questionnaire_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (
      c.instructor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    ))
  );

DROP POLICY IF EXISTS "Owner read questionnaire_answers" ON public.questionnaire_answers;
CREATE POLICY "Owner read questionnaire_answers" ON public.questionnaire_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.questionnaire_sessions s
      JOIN public.courses c ON c.id = s.course_id
      WHERE s.id = session_id AND (
        c.instructor_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

GRANT SELECT ON public.questionnaire_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionnaire_sessions TO service_role;
GRANT SELECT ON public.questionnaire_answers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionnaire_answers TO service_role;

NOTIFY pgrst, 'reload schema';
