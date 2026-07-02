import { Resend } from 'resend';

interface CourseEnrollmentEmailInput {
  to: string;
  studentName?: string | null;
  courseTitle: string;
  courseUrl: string;
  amountPaid: number;
  currency: string;
  billingType?: string | null;
  subscriptionInterval?: string | null;
  purchaseLanguage?: 'en' | 'lv' | string | null;
  teacherName?: string | null;
  teacherEmail?: string | null;
  supportEmail?: string | null;
  extraVariables?: RenderVariables;
  template?: CourseEmailTemplate | null;
}

export interface CourseEmailTemplate {
  id?: string;
  subject: string;
  preheader?: string | null;
  body_html?: string | null;
  body_text?: string | null;
  sender_name?: string | null;
  reply_to_email?: string | null;
}

interface RenderVariables {
  [key: string]: string;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(amount: number, currency: string, billingType?: string | null, subscriptionInterval?: string | null) {
  const formatted = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);

  if (billingType !== 'subscription') return formatted;
  return `${formatted}/${subscriptionInterval === 'year' ? 'year' : 'month'}`;
}

function defaultSubject(input: CourseEnrollmentEmailInput) {
  if (input.purchaseLanguage === 'lv') return `Jūs esat reģistrēts kursam ${input.courseTitle}`;
  return `You are enrolled in ${input.courseTitle}`;
}

function defaultText(input: CourseEnrollmentEmailInput, price: string) {
  if (input.purchaseLanguage === 'lv') {
    return [
      input.studentName ? `Sveiki, ${input.studentName}!` : 'Sveiki!',
      '',
      `Jūsu reģistrācija kursam ${input.courseTitle} ir apstiprināta.`,
      `Maksājums: ${price}`,
      '',
      `Sākt mācības: ${input.courseUrl}`,
      '',
      'E9 Studija',
    ].join('\n');
  }

  return [
    input.studentName ? `Hi ${input.studentName},` : 'Hi,',
    '',
    `Your enrollment in ${input.courseTitle} is confirmed.`,
    `Payment: ${price}`,
    '',
    `Start learning: ${input.courseUrl}`,
    '',
    'E9 Studija',
  ].join('\n');
}

function renderTemplate(value: string, variables: RenderVariables) {
  return value.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => variables[key] ?? '');
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.e9studija.lv').replace(/\/$/, '');
}

function wrapEmailHtml(content: string, courseTitle: string, preheader = '') {
  const siteUrl = getSiteUrl();
  const safeCourseTitle = escapeHtml(courseTitle);
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f3ff;padding:40px 0;font-family:'Segoe UI',Arial,sans-serif;">
      <tr>
        <td align="center">
          ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ''}
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
            <tr>
              <td style="background:linear-gradient(135deg,#f0eeff 0%,#e879f9 60%,#a855f7 100%);background-color:#a855f7;border-radius:16px 16px 0 0;padding:44px 48px 38px;text-align:center;">
                <img src="${siteUrl}/logo-512.png" width="96" height="96" alt="" style="display:block;margin:0 auto 24px;max-width:96px;border:0;outline:none;text-decoration:none;border-radius:18px;" />
                <h1 style="margin:0;font-size:26px;font-weight:700;color:#26215C;line-height:1.3;">${safeCourseTitle}</h1>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;padding:48px 48px 40px;color:#18181b;line-height:1.6;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="background:#f5f3ff;border-radius:0 0 16px 16px;padding:28px 48px;text-align:center;">
                <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">You received this email because you enrolled in a course on E9 Studija.</p>
                <p style="margin:0;font-size:12px;color:#c4b5fd;">&copy; 2026 E9 Studija · <a href="${siteUrl}" style="color:#a855f7;text-decoration:none;">e9studija.lv</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function getFromAddress(template?: CourseEmailTemplate | null) {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) return null;
  if (!template?.sender_name?.trim()) return from;

  const addressMatch = from.match(/<([^>]+)>/);
  const emailAddress = addressMatch?.[1] ?? from;
  return `${template.sender_name.trim()} <${emailAddress}>`;
}

function buildCourseVariables(input: CourseEnrollmentEmailInput, price: string): RenderVariables {
  return {
    student_name: input.studentName ?? '',
    course_title: input.courseTitle,
    course_access_link: input.courseUrl,
    login_link: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.e9studija.lv',
    teacher_name: input.teacherName ?? '',
    teacher_email: input.teacherEmail ?? '',
    support_email: input.supportEmail ?? process.env.E9_SUPPORT_EMAIL ?? process.env.E9_ADMIN_EMAIL ?? '',
    payment_amount: price,
    billing_type: input.billingType === 'subscription' ? 'subscription' : 'single purchase',
    subscription_interval: input.subscriptionInterval === 'year' ? 'year' : input.subscriptionInterval === 'month' ? 'month' : '',
    class_title: '',
    class_date: '',
    class_time: '',
    zoom_link: '',
    recording_link: '',
    ...(input.extraVariables ?? {}),
  };
}

export async function sendCourseEnrollmentEmail(input: CourseEnrollmentEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getFromAddress(input.template);

  if (!apiKey || !from) {
    console.warn('[email] RESEND_API_KEY or RESEND_FROM_EMAIL missing; skipping enrollment email');
    return { status: 'skipped' as const };
  }

  const resend = new Resend(apiKey);
  const safeCourseTitle = escapeHtml(input.courseTitle);
  const safeStudentName = input.studentName ? escapeHtml(input.studentName) : null;
  const safeCourseUrl = escapeHtml(input.courseUrl);
  const price = formatPrice(input.amountPaid, input.currency, input.billingType, input.subscriptionInterval);
  const variables = buildCourseVariables(input, price);
  const subject = input.template?.subject ? renderTemplate(input.template.subject, variables) : defaultSubject(input);
  const text = input.template?.body_text
    ? renderTemplate(input.template.body_text, variables)
    : defaultText(input, price);
  const customHtml = input.template?.body_html ? renderTemplate(input.template.body_html, variables) : null;
  const preheader = input.template?.preheader ? renderTemplate(input.template.preheader, variables) : '';

  const result = await resend.emails.send({
    from,
    to: input.to,
    subject,
    ...(input.template?.reply_to_email ? { replyTo: input.template.reply_to_email } : {}),
    text: customHtml && !input.template?.body_text ? stripHtml(customHtml) : text,
    html: customHtml ? wrapEmailHtml(customHtml, input.courseTitle, preheader) : wrapEmailHtml(`
        <p style="margin:0 0 8px;font-size:22px;font-weight:600;color:#26215C;">${input.purchaseLanguage === 'lv' ? (safeStudentName ? `Sveiki, ${safeStudentName}!` : 'Sveiki!') : (safeStudentName ? `Hello, ${safeStudentName}` : 'Hello')}</p>
        <p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">${input.purchaseLanguage === 'lv' ? 'Paldies, ka pievienojāties kursam. Jūsu piekļuve ir gatava, un jūs varat sākt mācīties jau tagad.' : 'Thank you for joining the course. Your access is ready and you can start learning now.'}</p>
        <p style="margin:28px 0;text-align:center;">
          <a href="${safeCourseUrl}" style="display:inline-block;background:linear-gradient(135deg,#e879f9,#a855f7);background-color:#a855f7;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.3px;">${input.purchaseLanguage === 'lv' ? 'Sākt mācības &rarr;' : 'Start learning &rarr;'}</a>
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:0 10px 10px 0;margin:0 0 32px;">
          <tr>
            <td style="padding:18px 20px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">${input.purchaseLanguage === 'lv' ? 'Tiešsaistes nodarbības' : 'Live sessions'}</p>
              <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;">${input.purchaseLanguage === 'lv' ? 'Ja kursā ir tiešsaistes nodarbības, nodarbību informāciju un Zoom saiti atradīsiet kursa materiālos.' : 'If this course includes live classes, you can find session details and the Zoom link inside the course materials.'}</p>
            </td>
          </tr>
        </table>
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">${input.purchaseLanguage === 'lv' ? 'Uz tikšanos pirmajā nodarbībā,' : 'See you in the first session,'}<br><strong style="color:#26215C;">${escapeHtml(input.teacherName ?? 'E9 Studija')}</strong></p>
    `, input.courseTitle, preheader),
  });

  if (result.error) throw result.error;

  return { status: 'sent' as const, id: result.data?.id ?? null, subject };
}

export async function sendAdminEnrollmentNotification(input: CourseEnrollmentEmailInput) {
  const adminEmail = process.env.E9_ADMIN_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!adminEmail || !apiKey || !from) return;

  const resend = new Resend(apiKey);
  const price = formatPrice(input.amountPaid, input.currency, input.billingType, input.subscriptionInterval);

  const result = await resend.emails.send({
    from,
    to: adminEmail,
    subject: `New course purchase: ${input.courseTitle}`,
    text: [
      `Course: ${input.courseTitle}`,
      `Student email: ${input.to}`,
      input.studentName ? `Student name: ${input.studentName}` : null,
      `Payment: ${price}`,
      `Course: ${input.courseUrl}`,
    ].filter(Boolean).join('\n'),
  });

  if (result.error) throw result.error;
}
