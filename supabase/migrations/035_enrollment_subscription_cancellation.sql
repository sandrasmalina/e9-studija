ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS stripe_session_id text;

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_enrollments_stripe_subscription
  ON public.enrollments(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';