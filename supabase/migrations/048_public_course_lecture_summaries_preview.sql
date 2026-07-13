-- 048: Include preview/draft courses in safe public lecture summaries.

CREATE OR REPLACE VIEW public.public_course_lecture_summaries AS
SELECT
  lecture.id,
  lecture.section_id,
  lecture.course_id,
  lecture.title_en,
  lecture.title_lv,
  lecture.video_duration_seconds,
  lecture.is_preview,
  lecture.content_type,
  lecture.sort_order
FROM public.lectures lecture;

GRANT SELECT ON public.public_course_lecture_summaries TO anon;
GRANT SELECT ON public.public_course_lecture_summaries TO authenticated;
GRANT SELECT ON public.public_course_lecture_summaries TO service_role;

NOTIFY pgrst, 'reload schema';