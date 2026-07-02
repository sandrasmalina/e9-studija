ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      ORDER BY enrollment_count DESC, created_at DESC, id
    ) * 10 AS next_sort_order
  FROM public.courses
)
UPDATE public.courses c
SET sort_order = ranked.next_sort_order
FROM ranked
WHERE c.id = ranked.id
  AND c.sort_order = 0;

CREATE INDEX IF NOT EXISTS idx_courses_status_sort_order
  ON public.courses(status, sort_order, created_at DESC);

NOTIFY pgrst, 'reload schema';
