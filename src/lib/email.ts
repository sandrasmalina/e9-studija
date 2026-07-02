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
    html: customHtml ?? `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#18181b;max-width:560px;margin:0 auto;padding:24px;">
        ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ''}
        <h1 style="font-size:24px;margin:0 0 16px;">${input.purchaseLanguage === 'lv' ? 'Reģistrācija apstiprināta' : 'Enrollment confirmed'}</h1>
        <p>${input.purchaseLanguage === 'lv' ? (safeStudentName ? `Sveiki, ${safeStudentName}!` : 'Sveiki!') : (safeStudentName ? `Hi ${safeStudentName},` : 'Hi,')}</p>
        <p>${input.purchaseLanguage === 'lv' ? `Jūsu reģistrācija kursam <strong>${safeCourseTitle}</strong> ir apstiprināta.` : `Your enrollment in <strong>${safeCourseTitle}</strong> is confirmed.`}</p>
        <p><strong>${input.purchaseLanguage === 'lv' ? 'Maksājums' : 'Payment'}:</strong> ${escapeHtml(price)}</p>
        <p style="margin:28px 0;">
          <a href="${safeCourseUrl}" style="background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block;">${input.purchaseLanguage === 'lv' ? 'Sākt mācības' : 'Start learning'}</a>
        </p>
        <p style="font-size:13px;color:#71717a;">${input.purchaseLanguage === 'lv' ? 'Ja poga nedarbojas, atveriet šo saiti' : 'If the button does not work, open this link'}: ${safeCourseUrl}</p>
        <p style="margin-top:28px;">E9 Studija</p>
      </div>
    `,
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
