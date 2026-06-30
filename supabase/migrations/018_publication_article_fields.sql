-- 018: Add professional article metadata and AI search optimization fields.

ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS article_type text NOT NULL DEFAULT 'article';
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS tags_ai_topics text DEFAULT '';
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS reading_time integer NOT NULL DEFAULT 1;
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS executive_summary text DEFAULT '';
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS ai_summary text DEFAULT '';
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS key_takeaways text DEFAULT '';
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS faq_items text DEFAULT '';
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS reference_sources text DEFAULT '';
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS expertise_level text DEFAULT '';
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS industry text DEFAULT '';
ALTER TABLE public.publications ADD COLUMN IF NOT EXISTS last_updated date DEFAULT CURRENT_DATE;

UPDATE public.publications
SET tags_ai_topics = COALESCE(NULLIF(tags_ai_topics, ''), seo_keywords)
WHERE COALESCE(seo_keywords, '') <> '';

ALTER TABLE public.publications DROP CONSTRAINT IF EXISTS publications_article_type_check;
ALTER TABLE public.publications ADD CONSTRAINT publications_article_type_check CHECK (article_type IN ('article', 'guide', 'opinion', 'case_study', 'interview', 'research_note', 'framework', 'news', 'tutorial', 'whitepaper'));

ALTER TABLE public.publications DROP CONSTRAINT IF EXISTS publications_expertise_level_check;
ALTER TABLE public.publications ADD CONSTRAINT publications_expertise_level_check CHECK (expertise_level IN ('', 'beginner', 'intermediate', 'advanced'));

ALTER TABLE public.publications DROP CONSTRAINT IF EXISTS publications_status_check;
ALTER TABLE public.publications ADD CONSTRAINT publications_status_check CHECK (status IN ('draft', 'published', 'archived'));
