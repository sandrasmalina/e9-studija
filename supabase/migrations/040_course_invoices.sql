CREATE TABLE IF NOT EXISTS public.course_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE SET NULL,
  stripe_invoice_id text NOT NULL UNIQUE,
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  invoice_number text,
  billing_reason text,
  status text,
  currency text NOT NULL DEFAULT 'eur',
  amount_due numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  hosted_invoice_url text,
  invoice_pdf_url text,
  period_start timestamptz,
  period_end timestamptz,
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_invoices_user_issued
  ON public.course_invoices(user_id, issued_at DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_invoices_course
  ON public.course_invoices(course_id);

CREATE INDEX IF NOT EXISTS idx_course_invoices_subscription
  ON public.course_invoices(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.course_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their course invoices" ON public.course_invoices;
CREATE POLICY "Users read their course invoices" ON public.course_invoices FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read course invoices" ON public.course_invoices;
CREATE POLICY "Admins read course invoices" ON public.course_invoices FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR public.current_user_has_role(ARRAY['admin'])
  );

GRANT SELECT ON public.course_invoices TO authenticated;

NOTIFY pgrst, 'reload schema';
