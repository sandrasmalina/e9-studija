-- Multi-service course pricing: service models + payment plans.
-- Backward compatible: existing single-price courses are backfilled into one
-- default service model with one default payment plan, so the course page and
-- checkout behave exactly as before until an admin adds more options.

-- ============================================================
-- 1. SERVICE MODELS  (1..3 per course — what the student gets)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_models (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name_en       text NOT NULL,
  name_lv       text,
  description_en text,
  description_lv text,
  sort_order    int  NOT NULL DEFAULT 0,
  is_default    boolean NOT NULL DEFAULT false,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_models_course ON public.service_models(course_id, sort_order);

-- ============================================================
-- 2. PAYMENT PLANS  (1..3 per service model — how the student pays)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_plans (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_model_id   uuid NOT NULL REFERENCES public.service_models(id) ON DELETE CASCADE,
  type               text NOT NULL DEFAULT 'one_time' CHECK (type IN ('one_time', 'installments', 'subscription')),
  label_en           text NOT NULL,
  label_lv           text,
  currency           text NOT NULL DEFAULT 'EUR',
  total_price        numeric(10,2),                       -- null allowed for open-ended subscriptions
  original_price     numeric(10,2),                       -- strikethrough / compare-at
  upfront_amount     numeric(10,2),                       -- e.g. "€150 upfront + €39/mo"
  installment_count  int,                                 -- required when type = installments
  installment_amount numeric(10,2),                       -- per-installment charge
  interval           text CHECK (interval IN ('weekly', 'monthly', 'yearly')), -- subscription/spaced installments
  provider_price_id  text,                                -- optional Stripe Price/Plan id
  sort_order         int  NOT NULL DEFAULT 0,
  is_default         boolean NOT NULL DEFAULT false,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_plans_service_model ON public.payment_plans(service_model_id, sort_order);

-- ============================================================
-- 3. ENROLLMENT REFERENCES  (which model + plan a student chose)
-- ============================================================
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS service_model_id uuid REFERENCES public.service_models(id) ON DELETE SET NULL;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS payment_plan_id  uuid REFERENCES public.payment_plans(id) ON DELETE SET NULL;

-- ============================================================
-- 4. PAYMENT PLAN CHARGES  (ledger for installments/subscriptions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_plan_charges (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id     uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  payment_plan_id   uuid REFERENCES public.payment_plans(id) ON DELETE SET NULL,
  sequence          int NOT NULL DEFAULT 1,               -- 1..installment_count
  due_date          timestamptz,
  amount            numeric(10,2) NOT NULL,
  currency          text NOT NULL DEFAULT 'EUR',
  status            text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'paid', 'failed', 'canceled')),
  provider_charge_id text,
  paid_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_plan_charges_enrollment ON public.payment_plan_charges(enrollment_id, sequence);

-- ============================================================
-- 5. updated_at touch triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_pricing_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_models_touch_updated_at ON public.service_models;
CREATE TRIGGER service_models_touch_updated_at BEFORE UPDATE ON public.service_models
  FOR EACH ROW EXECUTE FUNCTION public.touch_pricing_updated_at();

DROP TRIGGER IF EXISTS payment_plans_touch_updated_at ON public.payment_plans;
CREATE TRIGGER payment_plans_touch_updated_at BEFORE UPDATE ON public.payment_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_pricing_updated_at();

DROP TRIGGER IF EXISTS payment_plan_charges_touch_updated_at ON public.payment_plan_charges;
CREATE TRIGGER payment_plan_charges_touch_updated_at BEFORE UPDATE ON public.payment_plan_charges
  FOR EACH ROW EXECUTE FUNCTION public.touch_pricing_updated_at();

-- ============================================================
-- 6. RLS
-- ============================================================
ALTER TABLE public.service_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_plan_charges ENABLE ROW LEVEL SECURITY;

-- service_models: public reads active rows; course owner + admin manage
DROP POLICY IF EXISTS "Public read active service_models" ON public.service_models;
CREATE POLICY "Public read active service_models" ON public.service_models FOR SELECT
  USING (
    is_active = true
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (
      c.instructor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    ))
  );

DROP POLICY IF EXISTS "Owner manage service_models" ON public.service_models;
CREATE POLICY "Owner manage service_models" ON public.service_models FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (
    c.instructor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (
    c.instructor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )));

-- payment_plans: public reads active rows; course owner + admin manage (via service_model → course)
DROP POLICY IF EXISTS "Public read active payment_plans" ON public.payment_plans;
CREATE POLICY "Public read active payment_plans" ON public.payment_plans FOR SELECT
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM public.service_models sm JOIN public.courses c ON c.id = sm.course_id
      WHERE sm.id = service_model_id AND (
        c.instructor_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "Owner manage payment_plans" ON public.payment_plans;
CREATE POLICY "Owner manage payment_plans" ON public.payment_plans FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.service_models sm JOIN public.courses c ON c.id = sm.course_id
    WHERE sm.id = service_model_id AND (
      c.instructor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.service_models sm JOIN public.courses c ON c.id = sm.course_id
    WHERE sm.id = service_model_id AND (
      c.instructor_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = c.id AND ci.instructor_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  ));

-- payment_plan_charges: student reads own; course owner + admin read; service role manages
DROP POLICY IF EXISTS "Read own payment_plan_charges" ON public.payment_plan_charges;
CREATE POLICY "Read own payment_plan_charges" ON public.payment_plan_charges FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enrollments e WHERE e.id = enrollment_id AND (
      e.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = e.course_id AND c.instructor_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  ));

-- ============================================================
-- 7. Grants
-- ============================================================
GRANT SELECT ON public.service_models TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_models TO authenticated, service_role;
GRANT SELECT ON public.payment_plans TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_plans TO authenticated, service_role;
GRANT SELECT ON public.payment_plan_charges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_plan_charges TO service_role;

-- ============================================================
-- 8. Backfill existing courses → 1 default service model + 1 default plan
-- ============================================================
INSERT INTO public.service_models (course_id, name_en, sort_order, is_default, is_active)
SELECT c.id, 'Standard', 0, true, true
FROM public.courses c
WHERE NOT EXISTS (SELECT 1 FROM public.service_models sm WHERE sm.course_id = c.id);

INSERT INTO public.payment_plans (service_model_id, type, label_en, currency, total_price, original_price, interval, is_default, is_active, sort_order)
SELECT
  sm.id,
  CASE WHEN c.billing_type = 'subscription' THEN 'subscription' ELSE 'one_time' END,
  CASE WHEN c.billing_type = 'subscription' THEN 'Subscription' ELSE 'Pay in full' END,
  COALESCE(NULLIF(c.currency, ''), 'EUR'),
  CASE WHEN c.billing_type = 'subscription' THEN NULL ELSE COALESCE(c.discount_price, c.price, 0) END,
  CASE WHEN c.discount_price IS NOT NULL AND c.discount_price < c.price THEN c.price ELSE NULL END,
  CASE WHEN c.billing_type = 'subscription' THEN (CASE WHEN c.subscription_interval = 'year' THEN 'yearly' ELSE 'monthly' END) ELSE NULL END,
  true, true, 0
FROM public.service_models sm
JOIN public.courses c ON c.id = sm.course_id
WHERE sm.is_default = true
  AND NOT EXISTS (SELECT 1 FROM public.payment_plans pp WHERE pp.service_model_id = sm.id);

-- ============================================================
-- 9. Auto-create default pricing for every NEW course
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_default_course_pricing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sm_id uuid;
BEGIN
  INSERT INTO public.service_models (course_id, name_en, sort_order, is_default, is_active)
  VALUES (NEW.id, 'Standard', 0, true, true)
  RETURNING id INTO sm_id;

  INSERT INTO public.payment_plans (service_model_id, type, label_en, currency, total_price, original_price, interval, is_default, is_active, sort_order)
  VALUES (
    sm_id,
    CASE WHEN NEW.billing_type = 'subscription' THEN 'subscription' ELSE 'one_time' END,
    CASE WHEN NEW.billing_type = 'subscription' THEN 'Subscription' ELSE 'Pay in full' END,
    COALESCE(NULLIF(NEW.currency, ''), 'EUR'),
    CASE WHEN NEW.billing_type = 'subscription' THEN NULL ELSE COALESCE(NEW.discount_price, NEW.price, 0) END,
    CASE WHEN NEW.discount_price IS NOT NULL AND NEW.discount_price < NEW.price THEN NEW.price ELSE NULL END,
    CASE WHEN NEW.billing_type = 'subscription' THEN (CASE WHEN NEW.subscription_interval = 'year' THEN 'yearly' ELSE 'monthly' END) ELSE NULL END,
    true, true, 0
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courses_create_default_pricing ON public.courses;
CREATE TRIGGER courses_create_default_pricing AFTER INSERT ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.create_default_course_pricing();

NOTIFY pgrst, 'reload schema';
