ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS scheduled_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;

ALTER TABLE public.email_templates
  DROP CONSTRAINT IF EXISTS email_templates_send_timing_check;

ALTER TABLE public.email_templates
  ADD CONSTRAINT email_templates_send_timing_check CHECK (send_timing IN ('immediate', 'scheduled', 'manual'));

CREATE INDEX IF NOT EXISTS idx_email_templates_scheduled_due
  ON public.email_templates(scheduled_send_at, is_active, last_sent_at)
  WHERE send_timing = 'scheduled';

NOTIFY pgrst, 'reload schema';
