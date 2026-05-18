-- ============================================================
-- E9 Studija — FULL SCHEMA REFERENCE
-- This file documents the complete expected database schema.
-- Run 001_update_schema_for_e9next.sql if tables already exist.
-- Run this file only on a fresh Supabase project.
-- ============================================================

-- PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                TEXT NOT NULL,
  title_lv             TEXT,
  category             TEXT NOT NULL,
  short_description    TEXT NOT NULL,
  short_description_lv TEXT,
  thumbnail_url        TEXT DEFAULT '',
  hero_image_url       TEXT DEFAULT '',
  client               TEXT DEFAULT '',
  overview             TEXT DEFAULT '',
  goals                TEXT DEFAULT '',
  process              TEXT DEFAULT '',
  features             TEXT DEFAULT '',
  results              TEXT DEFAULT '',
  testimonial          TEXT DEFAULT '',
  gallery_images       JSONB DEFAULT '[]',
  is_featured          BOOLEAN DEFAULT false,
  project_url          TEXT DEFAULT '',
  published            BOOLEAN DEFAULT false,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read projects"    ON projects FOR SELECT USING (published = true);
CREATE POLICY "Auth write projects"     ON projects FOR ALL   USING (auth.role() = 'authenticated');
CREATE INDEX IF NOT EXISTS idx_projects_published   ON projects(published);
CREATE INDEX IF NOT EXISTS idx_projects_is_featured ON projects(is_featured);


-- TEAM MEMBERS  (single row per person, bilingual)
CREATE TABLE IF NOT EXISTS team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  position_en TEXT,
  position_lv TEXT,
  bio_en      TEXT,
  bio_lv      TEXT,
  photo_url   TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read team_members" ON team_members FOR SELECT USING (true);
CREATE POLICY "Auth write team_members"  ON team_members FOR ALL   USING (auth.role() = 'authenticated');


-- SOCIAL LINKS
CREATE TABLE IF NOT EXISTS social_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform   TEXT NOT NULL,
  url        TEXT NOT NULL,
  icon_name  TEXT DEFAULT 'Globe',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read social_links" ON social_links FOR SELECT USING (true);
CREATE POLICY "Auth write social_links"  ON social_links FOR ALL   USING (auth.role() = 'authenticated');


-- TESTIMONIALS
CREATE TABLE IF NOT EXISTS testimonials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_role TEXT,
  content_en  TEXT NOT NULL,
  content_lv  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read testimonials" ON testimonials FOR SELECT USING (true);
CREATE POLICY "Auth write testimonials"  ON testimonials FOR ALL   USING (auth.role() = 'authenticated');


-- CONTACT SUBMISSIONS
CREATE TABLE IF NOT EXISTS contact_submissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  message    TEXT NOT NULL,
  time_slot  TEXT,
  status     TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert contact"        ON contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth manage contact"          ON contact_submissions FOR ALL   USING (auth.role() = 'authenticated');


-- TIME SLOTS (booking calendar)
CREATE TABLE IF NOT EXISTS time_slots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read time_slots" ON time_slots FOR SELECT USING (is_available = true);
CREATE POLICY "Auth write time_slots"  ON time_slots FOR ALL   USING (auth.role() = 'authenticated');


-- BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_slot_id UUID REFERENCES time_slots(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  message      TEXT DEFAULT '',
  status       TEXT DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth manage bookings"   ON bookings FOR ALL   USING (auth.role() = 'authenticated');


-- STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public read images"  ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "Auth upload images"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete images"  ON storage.objects FOR DELETE USING (bucket_id = 'images' AND auth.role() = 'authenticated');
