UPDATE public.email_templates
SET
  body_html = replace(
    body_html,
    'font-size:22px;font-weight:600;color:#26215C;',
    'font-size:18px;font-weight:600;line-height:1.35;color:#26215C;'
  ),
  updated_at = now()
WHERE type = 'course_purchased'
  AND body_html LIKE '%font-size:22px;font-weight:600;color:#26215C;%';

NOTIFY pgrst, 'reload schema';
