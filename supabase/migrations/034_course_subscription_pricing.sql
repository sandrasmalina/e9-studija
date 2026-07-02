ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'one_time';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS subscription_interval text NOT NULL DEFAULT 'month';

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_billing_type_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_billing_type_check CHECK (billing_type IN ('one_time', 'subscription'));

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_subscription_interval_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_subscription_interval_check CHECK (subscription_interval IN ('month', 'year'));

NOTIFY pgrst, 'reload schema';