-- Tracks guest checkout attempts before payment so we can measure drop-off
-- and send abandoned checkout reminders without creating auth users.
CREATE TABLE IF NOT EXISTS public.checkout_intents (
  id bigserial PRIMARY KEY,
  stripe_checkout_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  course_slug text NOT NULL,
  guest_email text NOT NULL,
  guest_name text,
  purchase_language text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'expired', 'failed')),
  checkout_url text,
  recovery_url text,
  amount_total numeric(10,2),
  currency text,
  paid_at timestamptz,
  expired_at timestamptz,
  failed_at timestamptz,
  reminder_1_sent_at timestamptz,
  reminder_2_sent_at timestamptz,
  converted_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  converted_enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_intents_status_created
  ON public.checkout_intents(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkout_intents_guest_email
  ON public.checkout_intents(guest_email);

CREATE OR REPLACE FUNCTION public.touch_checkout_intents_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS checkout_intents_touch_updated_at ON public.checkout_intents;
CREATE TRIGGER checkout_intents_touch_updated_at
  BEFORE UPDATE ON public.checkout_intents
  FOR EACH ROW EXECUTE FUNCTION public.touch_checkout_intents_updated_at();

ALTER TABLE public.checkout_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read checkout_intents" ON public.checkout_intents;
CREATE POLICY "Admin read checkout_intents" ON public.checkout_intents
  FOR SELECT TO authenticated
  USING (public.current_user_has_role(ARRAY['admin']) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_intents TO service_role;
GRANT SELECT ON public.checkout_intents TO authenticated;
