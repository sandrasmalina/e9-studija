ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS thumbnail_url_lv text;

NOTIFY pgrst, 'reload schema';