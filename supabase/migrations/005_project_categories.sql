-- 005: Project categories
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS project_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en    text NOT NULL,
  name_lv    text NOT NULL DEFAULT '',
  slug       text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read project_categories" ON project_categories;
CREATE POLICY "Public read project_categories"
  ON project_categories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Auth write project_categories" ON project_categories;
CREATE POLICY "Auth write project_categories"
  ON project_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed default categories
INSERT INTO project_categories (name_en, name_lv, slug, sort_order) VALUES
  ('Web Pages',      'Tīmekļa lapas',  'web-pages',     0),
  ('Applications',   'Aplikācijas',    'applications',  1),
  ('AI Agents',      'AI Aģenti',      'ai-agents',     2),
  ('Digital Assets', 'Digitālie aktīvi','digital-assets',3),
  ('Audio',          'Audio',          'audio',         4)
ON CONFLICT (slug) DO NOTHING;
