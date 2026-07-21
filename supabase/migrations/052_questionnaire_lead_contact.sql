-- Capture a contact for questionnaire leads (esp. the "talk to someone" path).
-- Signed-in users are captured automatically; anonymous visitors can opt in.

ALTER TABLE public.questionnaire_sessions ADD COLUMN IF NOT EXISTS lead_email text;
ALTER TABLE public.questionnaire_sessions ADD COLUMN IF NOT EXISTS lead_name text;

NOTIFY pgrst, 'reload schema';
