ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS meta_keywords text DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS og_title text DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS og_description text DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS og_image text DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS canonical_url text DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS no_index boolean NOT NULL DEFAULT false;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS ai_summary text DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS key_takeaways text DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS faq_items text DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS tags_ai_topics text DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS expertise_level text DEFAULT '';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS industry text DEFAULT '';

UPDATE public.courses
SET og_title = COALESCE(NULLIF(og_title, ''), meta_title, title_en),
    og_description = COALESCE(NULLIF(og_description, ''), meta_description, short_description_en),
    og_image = COALESCE(NULLIF(og_image, ''), thumbnail_url),
    canonical_url = COALESCE(NULLIF(canonical_url, ''), '/courses/' || slug)
WHERE COALESCE(og_title, og_description, og_image, canonical_url, '') = '';
