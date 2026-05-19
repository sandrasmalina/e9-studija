-- ============================================================
-- 002_courses_schema.sql
-- Course Platform — Full Schema
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
-- ============================================================

-- ============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name           text,
  avatar_url          text,
  bio                 text,
  role                text NOT NULL DEFAULT 'student', -- student | instructor | admin
  website             text,
  social_links        jsonb,
  affiliate_code      text UNIQUE,
  stripe_account_id   text,
  revenue_share_pct   int NOT NULL DEFAULT 70,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON profiles;
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Own profile write" ON profiles;
CREATE POLICY "Own profile write" ON profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'student'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. INSTRUCTOR APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS instructor_applications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  motivation    text,
  expertise     text,
  portfolio_url text,
  status        text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  reject_reason text,
  reviewed_by   uuid REFERENCES profiles,
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE instructor_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own application read" ON instructor_applications;
CREATE POLICY "Own application read" ON instructor_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own application insert" ON instructor_applications;
CREATE POLICY "Own application insert" ON instructor_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin all instructor_applications" ON instructor_applications;
CREATE POLICY "Admin all instructor_applications" ON instructor_applications FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en    text NOT NULL,
  name_lv    text,
  slug       text UNIQUE NOT NULL,
  icon       text,
  sort_order int NOT NULL DEFAULT 0,
  is_active  bool NOT NULL DEFAULT true,
  parent_id  uuid REFERENCES categories
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read categories" ON categories;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write categories" ON categories;
CREATE POLICY "Admin write categories" ON categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Seed default categories
INSERT INTO categories (name_en, name_lv, slug, icon, sort_order) VALUES
  ('AI Skills',             'AI Prasmes',         'ai-skills',              '🤖', 0),
  ('Technology',            'Tehnoloģijas',        'technology',             '💻', 1),
  ('Business',              'Bizness',             'business',               '📊', 2),
  ('Marketing',             'Mārketings',          'marketing',              '📣', 3),
  ('Creativity',            'Radošums',            'creativity',             '🎨', 4),
  ('Education',             'Izglītība',           'education',              '🎓', 5),
  ('Personal Development',  'Personālā Izaugsme',  'personal-development',   '🌱', 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 4. COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id           uuid REFERENCES profiles ON DELETE SET NULL,
  category_id             uuid REFERENCES categories ON DELETE SET NULL,
  title_en                text NOT NULL,
  title_lv                text,
  slug                    text UNIQUE NOT NULL,
  short_description_en    text,
  short_description_lv    text,
  description_en          text,
  description_lv          text,
  thumbnail_url           text,
  promo_video_url         text,
  promo_video_type        text, -- 'vimeo' | 'youtube'
  price                   numeric(10,2) NOT NULL DEFAULT 0,
  currency                text NOT NULL DEFAULT 'EUR',
  discount_price          numeric(10,2),
  discount_ends_at        timestamptz,
  status                  text NOT NULL DEFAULT 'draft', -- draft | review | published | unpublished
  is_free                 bool NOT NULL DEFAULT false,
  level                   text, -- beginner | intermediate | advanced | all
  language                text NOT NULL DEFAULT 'en',
  requirements            text[],
  what_you_learn          text[],
  target_audience         text,
  certificate_enabled     bool NOT NULL DEFAULT true,
  total_duration_minutes  int NOT NULL DEFAULT 0,
  total_lectures          int NOT NULL DEFAULT 0,
  enrollment_count        int NOT NULL DEFAULT 0,
  rating_avg              numeric(3,2) NOT NULL DEFAULT 0,
  rating_count            int NOT NULL DEFAULT 0,
  stripe_price_id         text,
  stripe_product_id       text,
  meta_title              text,
  meta_description        text,
  published_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published courses" ON courses;
CREATE POLICY "Public read published courses" ON courses FOR SELECT
  USING (status = 'published' OR (
    auth.uid() IS NOT NULL AND (
      instructor_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  ));

DROP POLICY IF EXISTS "Instructor write own courses" ON courses;
CREATE POLICY "Instructor write own courses" ON courses FOR ALL TO authenticated
  USING (instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS courses_updated_at ON courses;
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. SECTIONS (course chapters)
-- ============================================================
CREATE TABLE IF NOT EXISTS sections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  uuid NOT NULL REFERENCES courses ON DELETE CASCADE,
  title_en   text NOT NULL,
  title_lv   text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read sections" ON sections;
CREATE POLICY "Public read sections" ON sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Instructor write sections" ON sections;
CREATE POLICY "Instructor write sections" ON sections FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM courses c WHERE c.id = course_id AND (
      c.instructor_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM courses c WHERE c.id = course_id AND (
      c.instructor_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  ));

-- ============================================================
-- 6. ENROLLMENTS (moved before lectures — lectures RLS references this table)
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  course_id                 uuid NOT NULL REFERENCES courses ON DELETE CASCADE,
  stripe_payment_intent_id  text,
  amount_paid               numeric(10,2),
  currency                  text,
  status                    text NOT NULL DEFAULT 'active', -- active | refunded | expired
  enrolled_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own enrollments" ON enrollments;
CREATE POLICY "Own enrollments" ON enrollments FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM courses c WHERE c.id = course_id AND c.instructor_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "System insert enrollment" ON enrollments;
CREATE POLICY "System insert enrollment" ON enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 7. LECTURES
-- ============================================================
CREATE TABLE IF NOT EXISTS lectures (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id             uuid NOT NULL REFERENCES sections ON DELETE CASCADE,
  course_id              uuid NOT NULL REFERENCES courses ON DELETE CASCADE,
  title_en               text NOT NULL,
  title_lv               text,
  description_en         text,
  description_lv         text,
  sort_order             int NOT NULL DEFAULT 0,
  video_url              text,
  video_type             text, -- 'vimeo' | 'youtube'
  video_duration_seconds int NOT NULL DEFAULT 0,
  is_preview             bool NOT NULL DEFAULT false,
  content_type           text NOT NULL DEFAULT 'video', -- video | text | quiz
  text_content           text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read preview lectures" ON lectures;
CREATE POLICY "Public read preview lectures" ON lectures FOR SELECT
  USING (
    is_preview = true OR
    EXISTS (
      SELECT 1 FROM enrollments e WHERE e.course_id = lectures.course_id AND e.user_id = auth.uid() AND e.status = 'active'
    ) OR
    EXISTS (
      SELECT 1 FROM courses c WHERE c.id = lectures.course_id AND (
        c.instructor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "Instructor write lectures" ON lectures;
CREATE POLICY "Instructor write lectures" ON lectures FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM courses c WHERE c.id = course_id AND (
      c.instructor_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM courses c WHERE c.id = course_id AND (
      c.instructor_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  ));

-- ============================================================
-- 8. LECTURE RESOURCES
-- ============================================================
CREATE TABLE IF NOT EXISTS lecture_resources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id      uuid NOT NULL REFERENCES lectures ON DELETE CASCADE,
  title           text NOT NULL,
  file_url        text NOT NULL,
  file_type       text, -- pdf | image | zip | other
  file_size_bytes int,
  sort_order      int NOT NULL DEFAULT 0
);

ALTER TABLE lecture_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enrolled read resources" ON lecture_resources;
CREATE POLICY "Enrolled read resources" ON lecture_resources FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM lectures l
    JOIN enrollments e ON e.course_id = l.course_id
    WHERE l.id = lecture_id AND e.user_id = auth.uid() AND e.status = 'active'
  ));

-- ============================================================
-- 9. LECTURE PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS lecture_progress (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  lecture_id             uuid NOT NULL REFERENCES lectures ON DELETE CASCADE,
  course_id              uuid NOT NULL REFERENCES courses ON DELETE CASCADE,
  completed              bool NOT NULL DEFAULT false,
  last_position_seconds  int NOT NULL DEFAULT 0,
  completed_at           timestamptz,
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lecture_id)
);

ALTER TABLE lecture_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own progress" ON lecture_progress;
CREATE POLICY "Own progress" ON lecture_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 10. REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  course_id   uuid NOT NULL REFERENCES courses ON DELETE CASCADE,
  rating      int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text,
  is_approved bool NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read approved reviews" ON reviews;
CREATE POLICY "Public read approved reviews" ON reviews FOR SELECT
  USING (is_approved = true);

DROP POLICY IF EXISTS "Own review write" ON reviews;
CREATE POLICY "Own review write" ON reviews FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 11. AFFILIATE LINKS
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_links (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  course_id         uuid NOT NULL REFERENCES courses ON DELETE CASCADE,
  code              text UNIQUE NOT NULL,
  commission_pct    int NOT NULL DEFAULT 10,
  click_count       int NOT NULL DEFAULT 0,
  conversion_count  int NOT NULL DEFAULT 0,
  total_earned      numeric(10,2) NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own affiliate links" ON affiliate_links;
CREATE POLICY "Own affiliate links" ON affiliate_links FOR ALL TO authenticated
  USING (auth.uid() = affiliate_user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (auth.uid() = affiliate_user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- 12. AFFILIATE CONVERSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id uuid NOT NULL REFERENCES affiliate_links ON DELETE CASCADE,
  enrollment_id     uuid NOT NULL REFERENCES enrollments ON DELETE CASCADE,
  amount_earned     numeric(10,2),
  paid_out          bool NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own affiliate conversions" ON affiliate_conversions;
CREATE POLICY "Own affiliate conversions" ON affiliate_conversions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM affiliate_links al WHERE al.id = affiliate_link_id AND al.affiliate_user_id = auth.uid()
  ) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- 13. PAYOUTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payouts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id       uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  amount             numeric(10,2) NOT NULL,
  currency           text NOT NULL DEFAULT 'EUR',
  type               text, -- 'instructor_revenue' | 'affiliate_commission'
  stripe_transfer_id text,
  status             text NOT NULL DEFAULT 'pending', -- pending | completed | failed
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own payouts" ON payouts;
CREATE POLICY "Own payouts" ON payouts FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admin write payouts" ON payouts;
CREATE POLICY "Admin write payouts" ON payouts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- 14. INVITATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'instructor',
  token       text UNIQUE NOT NULL,
  status      text NOT NULL DEFAULT 'pending',
  invited_by  uuid REFERENCES profiles,
  used_at     timestamptz,
  expires_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage invitations" ON invitations;
CREATE POLICY "Admin manage invitations" ON invitations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Public can read invitation by token (for invite acceptance page)
DROP POLICY IF EXISTS "Public read invitation by token" ON invitations;
CREATE POLICY "Public read invitation by token" ON invitations FOR SELECT
  USING (true);

-- ============================================================
-- 15. WISHLISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlists (
  user_id    uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  course_id  uuid NOT NULL REFERENCES courses ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own wishlist" ON wishlists;
CREATE POLICY "Own wishlist" ON wishlists FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 16. PLATFORM SETTINGS (key/value store)
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read settings" ON platform_settings;
CREATE POLICY "Public read settings" ON platform_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write settings" ON platform_settings;
CREATE POLICY "Admin write settings" ON platform_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO platform_settings (key, value) VALUES
  ('instructor_revenue_share_pct', '70'),
  ('affiliate_default_commission_pct', '10'),
  ('auto_approve_courses', 'false')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 17. STORAGE BUCKETS (run in Supabase dashboard if not via CLI)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('course-thumbnails', 'course-thumbnails', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('lecture-resources', 'lecture-resources', false) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', false) ON CONFLICT DO NOTHING;
