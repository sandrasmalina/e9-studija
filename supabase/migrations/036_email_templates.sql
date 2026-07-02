CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  class_id uuid,
  subject text NOT NULL,
  preheader text,
  body_html text,
  body_text text,
  language text NOT NULL DEFAULT 'en',
  sender_name text,
  reply_to_email text,
  send_timing text NOT NULL DEFAULT 'immediate',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_templates_type_check CHECK (type IN ('account_created', 'course_purchased', 'ticket_submitted', 'course_reminder', 'class_reminder', 'recording_available', 'course_announcement')),
  CONSTRAINT email_templates_language_check CHECK (language IN ('en', 'lv', 'both'))
);

CREATE INDEX IF NOT EXISTS idx_email_templates_course_type
  ON public.email_templates(course_id, type, is_active);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  resend_email_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_logs_status_check CHECK (status IN ('sent', 'failed', 'skipped'))
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Course owners manage email templates" ON public.email_templates;
CREATE POLICY "Course owners manage email templates" ON public.email_templates FOR ALL TO authenticated
  USING (
    public.current_user_has_role(ARRAY['admin'])
    OR course_id IS NULL AND public.current_user_has_role(ARRAY['admin'])
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
        )
    )
  )
  WITH CHECK (
    public.current_user_has_role(ARRAY['admin'])
    OR course_id IS NULL AND public.current_user_has_role(ARRAY['admin'])
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Admins and course owners read email logs" ON public.email_logs;
CREATE POLICY "Admins and course owners read email logs" ON public.email_logs FOR SELECT TO authenticated
  USING (
    public.current_user_has_role(ARRAY['admin'])
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
        AND (
          c.instructor_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO service_role;
GRANT SELECT ON public.email_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_logs TO service_role;

NOTIFY pgrst, 'reload schema';