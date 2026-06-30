-- 015: Stripe Connect payout controls
-- Platform fee can be configured globally and overridden per teacher profile.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_fee_pct integer NOT NULL DEFAULT 30;

UPDATE public.profiles
SET platform_fee_pct = GREATEST(0, LEAST(100, 100 - COALESCE(revenue_share_pct, 70)))
WHERE platform_fee_pct IS NULL OR platform_fee_pct = 30;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_platform_fee_pct_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_platform_fee_pct_check CHECK (platform_fee_pct BETWEEN 0 AND 100);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_revenue_share_pct_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_revenue_share_pct_check CHECK (revenue_share_pct BETWEEN 0 AND 100);

INSERT INTO public.platform_settings (key, value) VALUES
  ('platform_fee_pct', '30')
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Admin manage profiles" ON public.profiles;
CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['admin']))
  WITH CHECK (public.current_user_has_role(ARRAY['admin']));

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
