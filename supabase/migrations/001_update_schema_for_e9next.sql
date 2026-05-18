-- ============================================================
-- E9 Studija — Schema update for e9-next
-- Run this in Supabase SQL Editor (safe to run multiple times)
-- ============================================================

-- ┌─────────────────────────────────────────┐
-- │  1. TEAM MEMBERS — migrate to bilingual │
-- └─────────────────────────────────────────┘

-- Add new columns (keep old ones intact for safety)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS position_en TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS position_lv TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS bio_en     TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS bio_lv     TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS photo_url  TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Migrate existing EN data: role → position_en, bio → bio_en, image_url → photo_url
UPDATE team_members
SET
  position_en = COALESCE(position_en, role),
  bio_en      = COALESCE(bio_en, bio),
  photo_url   = COALESCE(photo_url, image_url)
WHERE language = 'en' OR language IS NULL;

-- For LV rows, promote to position_lv / bio_lv columns
-- (old schema stored EN+LV as separate rows — new schema is single row per person)
-- First, copy LV role/bio into EN row's lv columns by matching on name
UPDATE team_members en_row
SET
  position_lv = lv_row.role,
  bio_lv      = lv_row.bio
FROM team_members lv_row
WHERE en_row.name = lv_row.name
  AND (en_row.language = 'en' OR en_row.language IS NULL)
  AND lv_row.language = 'lv';

-- Delete the old LV-language duplicate rows (now merged into EN row)
DELETE FROM team_members WHERE language = 'lv';

-- Set sort_order based on existing row order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 AS rn
  FROM team_members
)
UPDATE team_members t SET sort_order = r.rn FROM ranked r WHERE t.id = r.id;

-- Add auth write policy for admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'team_members' AND policyname = 'Auth write team_members'
  ) THEN
    CREATE POLICY "Auth write team_members"
      ON team_members FOR ALL
      USING (auth.role() = 'authenticated');
  END IF;
END$$;


-- ┌────────────────────────────────────────────────────┐
-- │  2. PROJECTS — add bilingual + featured columns    │
-- └────────────────────────────────────────────────────┘

ALTER TABLE projects ADD COLUMN IF NOT EXISTS title_lv             TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS short_description_lv TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_featured          BOOLEAN DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_url          TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_is_featured ON projects(is_featured);

-- Add auth write policy for admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'projects' AND policyname = 'Auth write projects'
  ) THEN
    CREATE POLICY "Auth write projects"
      ON projects FOR ALL
      USING (auth.role() = 'authenticated');
  END IF;
END$$;


-- ┌──────────────────────────────────────────────────────┐
-- │  3. SOCIAL LINKS — add sort_order                    │
-- └──────────────────────────────────────────────────────┘

ALTER TABLE social_links ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Number existing rows
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 AS rn
  FROM social_links
)
UPDATE social_links s SET sort_order = r.rn FROM ranked r WHERE s.id = r.id;

-- Add auth write policy for admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'social_links' AND policyname = 'Auth write social_links'
  ) THEN
    CREATE POLICY "Auth write social_links"
      ON social_links FOR ALL
      USING (auth.role() = 'authenticated');
  END IF;
END$$;


-- ┌──────────────────────────────────────────────────────┐
-- │  4. CONTACT SUBMISSIONS — add time_slot field        │
-- └──────────────────────────────────────────────────────┘

ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS time_slot TEXT;

-- Add auth write policy so admin can delete submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contact_submissions' AND policyname = 'Auth manage contact_submissions'
  ) THEN
    CREATE POLICY "Auth manage contact_submissions"
      ON contact_submissions FOR ALL
      USING (auth.role() = 'authenticated');
  END IF;
END$$;


-- ┌──────────────────────────────────────────────────────────────┐
-- │  5. STORAGE — images bucket (skip if already exists in UI)   │
-- └──────────────────────────────────────────────────────────────┘

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Public read images'
  ) THEN
    CREATE POLICY "Public read images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'images');
  END IF;
END$$;

-- Auth upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Auth upload images'
  ) THEN
    CREATE POLICY "Auth upload images"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');
  END IF;
END$$;

-- Auth delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
      AND policyname = 'Auth delete images'
  ) THEN
    CREATE POLICY "Auth delete images"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'images' AND auth.role() = 'authenticated');
  END IF;
END$$;


-- ┌──────────────────────────────────────────────────────────────┐
-- │  6. TESTIMONIALS — client quotes slider                      │
-- └──────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS testimonials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_role TEXT,
  content_en  TEXT NOT NULL,
  content_lv  TEXT,
  is_published BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Public read (published only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'testimonials' AND policyname = 'Public read testimonials'
  ) THEN
    CREATE POLICY "Public read testimonials"
      ON testimonials FOR SELECT
      USING (is_published = true);
  END IF;
END$$;

-- Auth write for admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'testimonials' AND policyname = 'Auth write testimonials'
  ) THEN
    CREATE POLICY "Auth write testimonials"
      ON testimonials FOR ALL
      USING (auth.role() = 'authenticated');
  END IF;
END$$;
