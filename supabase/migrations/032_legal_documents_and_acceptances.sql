CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type IN ('terms', 'privacy')),
  version int NOT NULL,
  title text NOT NULL,
  content_html text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_type, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_current
  ON public.legal_documents(document_type, version DESC);

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('terms', 'privacy')),
  version int NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_type)
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read legal documents" ON public.legal_documents;
CREATE POLICY "Public read legal documents" ON public.legal_documents FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin manage legal documents" ON public.legal_documents;
CREATE POLICY "Admin manage legal documents" ON public.legal_documents FOR ALL TO authenticated
  USING (public.current_user_has_role(ARRAY['admin']) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (public.current_user_has_role(ARRAY['admin']) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users read own legal acceptances" ON public.legal_acceptances;
CREATE POLICY "Users read own legal acceptances" ON public.legal_acceptances FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_has_role(ARRAY['admin']));

DROP POLICY IF EXISTS "Users accept legal documents" ON public.legal_acceptances;
CREATE POLICY "Users accept legal documents" ON public.legal_acceptances FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own legal acceptances" ON public.legal_acceptances;
CREATE POLICY "Users update own legal acceptances" ON public.legal_acceptances FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

INSERT INTO public.legal_documents (document_type, version, title, content_html)
VALUES
  ('terms', 1, 'Terms of Service', '<h2>Terms of Service</h2><p>These terms describe how E9 Studija services, courses, and digital learning products may be used. Update this text in Admin → Legal before publishing the final policy.</p><h3>Use of services</h3><p>Users agree to use the platform lawfully, respect course content ownership, and keep account access secure.</p><h3>Courses and payments</h3><p>Course access, pricing, refunds, and availability are managed according to the information shown at the time of purchase or enrollment.</p>'),
  ('privacy', 1, 'Privacy Policy', '<h2>Privacy Policy</h2><p>This policy explains how E9 Studija handles account, contact, course, and payment-related information. Update this text in Admin → Legal before publishing the final policy.</p><h3>Information we collect</h3><p>We may collect account details, contact form submissions, course progress, purchases, and technical data needed to provide the service.</p><h3>How information is used</h3><p>Information is used to provide access to courses, communicate with users, improve the platform, and meet legal obligations.</p>')
ON CONFLICT (document_type, version) DO NOTHING;

NOTIFY pgrst, 'reload schema';
