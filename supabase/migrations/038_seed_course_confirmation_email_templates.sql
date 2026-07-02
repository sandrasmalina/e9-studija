WITH templates AS (
  SELECT
    'en'::text AS language,
    'Purchase confirmation'::text AS name,
    'You are enrolled in {{course_title}}'::text AS subject,
    'Your course access is ready.'::text AS preheader,
    ARRAY[
      '<p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#26215C;">Hello, {{student_name}}</p>',
      '<p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">Thank you for joining <strong>{{course_title}}</strong>. Your access is ready and you can start learning now.</p>',
      '<p style="margin:28px 0;text-align:center;"><a href="{{course_access_link}}" style="display:inline-block;background:linear-gradient(135deg,#e879f9,#a855f7);background-color:#a855f7;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.3px;">Start learning &rarr;</a></p>',
      '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:0 10px 10px 0;margin:0 0 32px;"><tr><td style="padding:18px 20px;"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">Live sessions</p><p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;">If this course includes live classes, you can find session details and the Zoom link inside the course materials.</p></td></tr></table>',
      '<p style="margin:0 0 14px;font-size:14px;font-weight:600;color:#26215C;text-transform:uppercase;letter-spacing:1px;">What to do next</p>',
      '<ol style="margin:0 0 32px;padding-left:22px;color:#374151;font-size:15px;line-height:1.7;"><li>Open the course and review the first session materials.</li><li>Prepare the idea or question you want to bring to the first session.</li><li>Reply to this email if you have any questions before we start.</li></ol>',
      '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">See you in the first session,<br><strong style="color:#26215C;">{{teacher_name}}</strong></p>'
    ]::text[] AS html_parts,
    ARRAY[
      'Hello {{student_name}},',
      '',
      'Thank you for joining {{course_title}}. Your access is ready and you can start learning now:',
      '{{course_access_link}}',
      '',
      'What to do next:',
      '1. Open the course and review the first session materials.',
      '2. Prepare the idea or question you want to bring to the first session.',
      '3. Reply to this email if you have any questions before we start.',
      '',
      'See you in the first session,',
      '{{teacher_name}}'
    ]::text[] AS text_parts
  UNION ALL
  SELECT
    'lv'::text,
    'Pirkuma apstiprinājums'::text,
    'Jūs esat reģistrēts kursam {{course_title}}'::text,
    'Jūsu piekļuve kursam ir gatava.'::text,
    ARRAY[
      '<p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#26215C;">Sveiki, {{student_name}}!</p>',
      '<p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">Paldies, ka pievienojāties kursam <strong>{{course_title}}</strong>. Jūsu piekļuve ir gatava, un jūs varat sākt mācīties jau tagad.</p>',
      '<p style="margin:28px 0;text-align:center;"><a href="{{course_access_link}}" style="display:inline-block;background:linear-gradient(135deg,#e879f9,#a855f7);background-color:#a855f7;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.3px;">Sākt mācības &rarr;</a></p>',
      '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:0 10px 10px 0;margin:0 0 32px;"><tr><td style="padding:18px 20px;"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">Tiešsaistes nodarbības</p><p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;">Ja kursā ir tiešsaistes nodarbības, nodarbību informāciju un Zoom saiti atradīsiet kursa materiālos.</p></td></tr></table>',
      '<p style="margin:0 0 14px;font-size:14px;font-weight:600;color:#26215C;text-transform:uppercase;letter-spacing:1px;">Ko darīt tālāk</p>',
      '<ol style="margin:0 0 32px;padding-left:22px;color:#374151;font-size:15px;line-height:1.7;"><li>Atveriet kursu un apskatiet pirmās nodarbības materiālus.</li><li>Sagatavojiet ideju vai jautājumu, ko vēlaties paņemt līdzi uz pirmo nodarbību.</li><li>Atbildiet uz šo e-pastu, ja pirms sākuma ir kādi jautājumi.</li></ol>',
      '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Uz tikšanos pirmajā nodarbībā,<br><strong style="color:#26215C;">{{teacher_name}}</strong></p>'
    ]::text[],
    ARRAY[
      'Sveiki, {{student_name}}!',
      '',
      'Paldies, ka pievienojāties kursam {{course_title}}. Jūsu piekļuve ir gatava, un jūs varat sākt mācīties jau tagad:',
      '{{course_access_link}}',
      '',
      'Ko darīt tālāk:',
      '1. Atveriet kursu un apskatiet pirmās nodarbības materiālus.',
      '2. Sagatavojiet ideju vai jautājumu, ko vēlaties paņemt līdzi uz pirmo nodarbību.',
      '3. Atbildiet uz šo e-pastu, ja pirms sākuma ir kādi jautājumi.',
      '',
      'Uz tikšanos pirmajā nodarbībā,',
      '{{teacher_name}}'
    ]::text[]
), prepared AS (
  SELECT
    language,
    name,
    subject,
    preheader,
    array_to_string(html_parts, E'\n') AS body_html,
    array_to_string(text_parts, E'\n') AS body_text
  FROM templates
)
INSERT INTO public.email_templates (
  name,
  type,
  course_id,
  subject,
  preheader,
  body_html,
  body_text,
  language,
  sender_name,
  send_timing,
  is_active
)
SELECT
  name,
  'course_purchased',
  NULL,
  subject,
  preheader,
  body_html,
  body_text,
  language,
  'E9 Studija',
  'immediate',
  true
FROM prepared
WHERE NOT EXISTS (
  SELECT 1
  FROM public.email_templates existing
  WHERE existing.course_id IS NULL
    AND existing.type = 'course_purchased'
    AND existing.language = prepared.language
);

WITH templates AS (
  SELECT
    'en'::text AS language,
    'Purchase confirmation'::text AS name,
    'You are enrolled in {{course_title}}'::text AS subject,
    'Your course access is ready.'::text AS preheader,
    ARRAY[
      '<p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#26215C;">Hello, {{student_name}}</p>',
      '<p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">Thank you for joining <strong>{{course_title}}</strong>. Your access is ready and you can start learning now.</p>',
      '<p style="margin:28px 0;text-align:center;"><a href="{{course_access_link}}" style="display:inline-block;background:linear-gradient(135deg,#e879f9,#a855f7);background-color:#a855f7;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.3px;">Start learning &rarr;</a></p>',
      '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:0 10px 10px 0;margin:0 0 32px;"><tr><td style="padding:18px 20px;"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">Live sessions</p><p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;">If this course includes live classes, you can find session details and the Zoom link inside the course materials.</p></td></tr></table>',
      '<p style="margin:0 0 14px;font-size:14px;font-weight:600;color:#26215C;text-transform:uppercase;letter-spacing:1px;">What to do next</p>',
      '<ol style="margin:0 0 32px;padding-left:22px;color:#374151;font-size:15px;line-height:1.7;"><li>Open the course and review the first session materials.</li><li>Prepare the idea or question you want to bring to the first session.</li><li>Reply to this email if you have any questions before we start.</li></ol>',
      '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">See you in the first session,<br><strong style="color:#26215C;">{{teacher_name}}</strong></p>'
    ]::text[] AS html_parts,
    ARRAY['Hello {{student_name}},', '', 'Thank you for joining {{course_title}}. Your access is ready and you can start learning now:', '{{course_access_link}}', '', 'What to do next:', '1. Open the course and review the first session materials.', '2. Prepare the idea or question you want to bring to the first session.', '3. Reply to this email if you have any questions before we start.', '', 'See you in the first session,', '{{teacher_name}}']::text[] AS text_parts
  UNION ALL
  SELECT
    'lv'::text,
    'Pirkuma apstiprinājums'::text,
    'Jūs esat reģistrēts kursam {{course_title}}'::text,
    'Jūsu piekļuve kursam ir gatava.'::text,
    ARRAY[
      '<p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#26215C;">Sveiki, {{student_name}}!</p>',
      '<p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">Paldies, ka pievienojāties kursam <strong>{{course_title}}</strong>. Jūsu piekļuve ir gatava, un jūs varat sākt mācīties jau tagad.</p>',
      '<p style="margin:28px 0;text-align:center;"><a href="{{course_access_link}}" style="display:inline-block;background:linear-gradient(135deg,#e879f9,#a855f7);background-color:#a855f7;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.3px;">Sākt mācības &rarr;</a></p>',
      '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:0 10px 10px 0;margin:0 0 32px;"><tr><td style="padding:18px 20px;"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">Tiešsaistes nodarbības</p><p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;">Ja kursā ir tiešsaistes nodarbības, nodarbību informāciju un Zoom saiti atradīsiet kursa materiālos.</p></td></tr></table>',
      '<p style="margin:0 0 14px;font-size:14px;font-weight:600;color:#26215C;text-transform:uppercase;letter-spacing:1px;">Ko darīt tālāk</p>',
      '<ol style="margin:0 0 32px;padding-left:22px;color:#374151;font-size:15px;line-height:1.7;"><li>Atveriet kursu un apskatiet pirmās nodarbības materiālus.</li><li>Sagatavojiet ideju vai jautājumu, ko vēlaties paņemt līdzi uz pirmo nodarbību.</li><li>Atbildiet uz šo e-pastu, ja pirms sākuma ir kādi jautājumi.</li></ol>',
      '<p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">Uz tikšanos pirmajā nodarbībā,<br><strong style="color:#26215C;">{{teacher_name}}</strong></p>'
    ]::text[],
    ARRAY['Sveiki, {{student_name}}!', '', 'Paldies, ka pievienojāties kursam {{course_title}}. Jūsu piekļuve ir gatava, un jūs varat sākt mācīties jau tagad:', '{{course_access_link}}', '', 'Ko darīt tālāk:', '1. Atveriet kursu un apskatiet pirmās nodarbības materiālus.', '2. Sagatavojiet ideju vai jautājumu, ko vēlaties paņemt līdzi uz pirmo nodarbību.', '3. Atbildiet uz šo e-pastu, ja pirms sākuma ir kādi jautājumi.', '', 'Uz tikšanos pirmajā nodarbībā,', '{{teacher_name}}']::text[]
), prepared AS (
  SELECT
    language,
    name,
    subject,
    preheader,
    array_to_string(html_parts, E'\n') AS body_html,
    array_to_string(text_parts, E'\n') AS body_text
  FROM templates
)
UPDATE public.email_templates existing
SET
  name = prepared.name,
  subject = prepared.subject,
  preheader = prepared.preheader,
  body_html = prepared.body_html,
  body_text = prepared.body_text,
  updated_at = now()
FROM prepared
WHERE existing.type = 'course_purchased'
  AND existing.language = prepared.language
  AND (
    existing.body_html IS NULL
    OR existing.body_html ILIKE '%Thank you for buying <strong>{{course_title}}</strong>%'
    OR existing.body_html ILIKE '%Paldies, ka iegādājāties kursu <strong>{{course_title}}</strong>%'
  );

NOTIFY pgrst, 'reload schema';
