-- 003: Add progress-tracking columns to enrollments
-- (used by Phase 4 dashboard and Phase 5 course player)
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS progress_pct       int          NOT NULL DEFAULT 0;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS last_accessed_at   timestamptz;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS completed_at       timestamptz;

-- wishlists table (used by Phase 4 /dashboard/wishlist)
CREATE TABLE IF NOT EXISTS wishlists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  course_id  uuid NOT NULL REFERENCES courses  ON DELETE CASCADE,
  added_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own wishlist" ON wishlists;
CREATE POLICY "Own wishlist" ON wishlists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- certificates table (used by Phase 4 /dashboard/certificates)
CREATE TABLE IF NOT EXISTS certificates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  course_id        uuid NOT NULL REFERENCES courses  ON DELETE CASCADE,
  certificate_url  text,
  issued_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own certificates" ON certificates;
CREATE POLICY "Own certificates" ON certificates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System insert certificate" ON certificates;
CREATE POLICY "System insert certificate" ON certificates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- platform_settings table (used by Phase 3 /admin/settings)
CREATE TABLE IF NOT EXISTS platform_settings (
  key    text PRIMARY KEY,
  value  text NOT NULL DEFAULT ''
);
-- Seed defaults
INSERT INTO platform_settings (key, value) VALUES
  ('instructor_revenue_share_pct', '70'),
  ('affiliate_commission_pct',     '10'),
  ('platform_name',                'E9 Studija'),
  ('support_email',                ''),
  ('certificate_signature',        'E9 Studija Team')
ON CONFLICT (key) DO NOTHING;
