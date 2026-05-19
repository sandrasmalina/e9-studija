-- 006: Fix legacy NOT NULL columns on team_members
-- The original table had these columns with NOT NULL and no default.
-- The new schema uses position_en/lv, bio_en/lv, photo_url instead,
-- but the old columns still exist in the live DB.
-- This migration gives them safe defaults so the admin form can omit them.

DO $$
BEGIN
  BEGIN ALTER TABLE team_members ALTER COLUMN role      SET DEFAULT ''; EXCEPTION WHEN undefined_column THEN NULL; END;
  BEGIN ALTER TABLE team_members ALTER COLUMN bio       SET DEFAULT ''; EXCEPTION WHEN undefined_column THEN NULL; END;
  BEGIN ALTER TABLE team_members ALTER COLUMN email     SET DEFAULT ''; EXCEPTION WHEN undefined_column THEN NULL; END;
  BEGIN ALTER TABLE team_members ALTER COLUMN language  SET DEFAULT 'en'; EXCEPTION WHEN undefined_column THEN NULL; END;
  BEGIN ALTER TABLE team_members ALTER COLUMN image_url SET DEFAULT ''; EXCEPTION WHEN undefined_column THEN NULL; END;
  BEGIN ALTER TABLE team_members ALTER COLUMN phone     SET DEFAULT ''; EXCEPTION WHEN undefined_column THEN NULL; END;
  BEGIN ALTER TABLE team_members ALTER COLUMN linkedin  SET DEFAULT ''; EXCEPTION WHEN undefined_column THEN NULL; END;
  BEGIN ALTER TABLE team_members ALTER COLUMN department SET DEFAULT ''; EXCEPTION WHEN undefined_column THEN NULL; END;
END $$;
