import { Resend } from 'resend';

const DEFAULT_RESEND_FROM_EMAIL = 'E9 Studija <noreply@inbound.e9studija.lv>';
const ROOT_DOMAIN_FROM_ADDRESS_PATTERN = /@e9studija\.lv(?=>|$)/i;

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
  attachments?: EmailAttachment[];
  accountConfirmationRequired?: boolean;
}

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface CourseEmailTemplate {
  id?: string;
  language?: 'en' | 'lv' | 'both' | string | null;
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

function wrapEmailHtml(content: string, language: string | null | undefined, preheader = '') {
  const siteUrl = getSiteUrl();
  const isLatvian = language === 'lv';
  const slogan = isLatvian ? 'Tava digitālā pasaule' : 'Your digital world';
  const footerText = isLatvian
    ? 'Jūs saņēmāt šo e-pastu, jo reģistrējāties kursam E9 Studija platformā.'
    : 'You received this email because you enrolled in a course on E9 Studija.';
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f3ff;padding:40px 0;font-family:'Segoe UI',Arial,sans-serif;">
      <tr>
        <td align="center">
          ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ''}
          <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
            <tr>
              <td style="background:linear-gradient(135deg,#f0eeff 0%,#e879f9 60%,#a855f7 100%);background-color:#a855f7;border-radius:16px 16px 0 0;padding:34px 48px 30px;text-align:center;">
                <img src="${siteUrl}/logo_e9.png" width="148" alt="" style="display:block;margin:0 auto 16px;max-width:148px;border:0;outline:none;text-decoration:none;" />
                <h1 style="margin:0;font-size:21px;font-weight:500;color:#30285f;line-height:1.35;letter-spacing:0.2px;">${slogan}</h1>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;padding:48px 48px 40px;color:#18181b;line-height:1.6;">
                ${content}
              </td>
            </tr>
            <tr>
              <td style="background:#f5f3ff;border-radius:0 0 16px 16px;padding:28px 48px;text-align:center;">
                <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">${footerText}</p>
                <p style="margin:0;font-size:12px;color:#c4b5fd;">&copy; 2026 E9 Studija · <a href="${siteUrl}" style="color:#a855f7;text-decoration:none;">e9studija.lv</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export function getResendFromAddress(template?: CourseEmailTemplate | null) {
  const from = (process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_RESEND_FROM_EMAIL)
    .replace(ROOT_DOMAIN_FROM_ADDRESS_PATTERN, '@inbound.e9studija.lv');
  if (!template?.sender_name?.trim()) return from;

  const addressMatch = from.match(/<([^>]+)>/);
  const emailAddress = addressMatch?.[1] ?? from;
  return `${template.sender_name.trim()} <${emailAddress}>`;
}

// Sends a 6-digit sign-in code via Resend (bypasses Supabase Auth email limits).
export async function sendLoginCodeEmail(input: { to: string; code: string; language?: 'en' | 'lv' | string | null }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getResendFromAddress();
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY missing; cannot send login code');
    return { status: 'skipped' as const };
  }
  const isLv = input.language === 'lv';
  const subject = isLv ? `Jūsu pieslēgšanās kods: ${input.code}` : `Your sign-in code: ${input.code}`;
  const heading = isLv ? 'Jūsu pieslēgšanās kods' : 'Your sign-in code';
  const sub = isLv ? 'Ievadiet šo kodu E9 Studija vietnē, lai turpinātu.' : 'Enter this code on the E9 Studija website to continue.';
  const expiry = isLv
    ? 'Šis kods ir derīgs 10 minūtes. Ja jūs to nepieprasījāt, ignorējiet šo e-pastu.'
    : 'This code expires in 10 minutes. If you did not request it, you can safely ignore this email.';
  const content = `
    <div style="text-align:center;">
      <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#26215C;">${heading}</p>
      <p style="margin:0 0 32px;font-size:15px;color:#6b7280;">${sub}</p>
      <div style="display:inline-block;background:#f5f3ff;border:2px solid #a855f7;border-radius:16px;padding:20px 40px;margin:0 0 32px;">
        <span style="font-size:36px;font-weight:700;letter-spacing:0.3em;color:#26215C;font-family:monospace;">${escapeHtml(input.code)}</span>
      </div>
      <p style="margin:0;font-size:13px;color:#9ca3af;">${expiry}</p>
    </div>
  `;
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: input.to,
    subject,
    text: `${heading}: ${input.code}\n${expiry}`,
    html: wrapEmailHtml(content, isLv ? 'lv' : 'en', subject),
  });
  if (result.error) throw result.error;
  return { status: 'sent' as const, id: result.data?.id ?? null };
}

export async function sendAccountSetupEmail(input: {
  to: string;
  setupUrl: string;
  studentName?: string | null;
  courseTitle?: string | null;
  language?: 'en' | 'lv' | string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getResendFromAddress();
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY missing; skipping account setup email');
    return { status: 'skipped' as const };
  }

  const isLv = input.language === 'lv';
  const subject = isLv ? 'Iestatiet savu E9 Studija paroli' : 'Set your E9 Studija password';
  const greeting = isLv
    ? (input.studentName ? `Sveiki, ${escapeHtml(input.studentName)}!` : 'Sveiki!')
    : (input.studentName ? `Hi ${escapeHtml(input.studentName)},` : 'Hi,');
  const body = isLv
    ? `Maksājums ir saņemts${input.courseTitle ? ` par kursu <strong>${escapeHtml(input.courseTitle)}</strong>` : ''}. Lai piekļūtu kursam, iestatiet paroli.`
    : `Your payment is confirmed${input.courseTitle ? ` for <strong>${escapeHtml(input.courseTitle)}</strong>` : ''}. Set your password to access the course.`;
  const button = isLv ? 'Iestatīt paroli' : 'Set password';
  const footer = isLv
    ? 'Ja šo pieprasījumu neveicāt jūs, ignorējiet šo e-pastu.'
    : 'If you did not request this, you can ignore this email.';

  const html = `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;line-height:1.35;color:#26215C;">${greeting}</p>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">${body}</p>
    <p style="margin:24px 0;text-align:center;">
      <a href="${escapeHtml(input.setupUrl)}" style="display:inline-block;background:linear-gradient(135deg,#e879f9,#a855f7);background-color:#a855f7;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 34px;border-radius:50px;letter-spacing:0.3px;">${button}</a>
    </p>
    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">${footer}</p>
  `;

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: input.to,
    subject,
    text: `${isLv ? 'Iestatiet savu paroli' : 'Set your password'}: ${input.setupUrl}`,
    html: wrapEmailHtml(html, isLv ? 'lv' : 'en', subject),
  });

  if (result.error) throw result.error;
  return { status: 'sent' as const, id: result.data?.id ?? null, subject };
}

export async function sendAbandonedCheckoutReminderEmail(input: {
  to: string;
  courseTitle: string;
  checkoutUrl: string;
  studentName?: string | null;
  language?: 'en' | 'lv' | string | null;
  reminderNumber: 1 | 2;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getResendFromAddress();
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY missing; skipping abandoned checkout reminder');
    return { status: 'skipped' as const };
  }

  const isLv = input.language === 'lv';
  const subject = isLv
    ? `Jūsu kursa rezervācija gaida: ${input.courseTitle}`
    : `Your checkout is waiting: ${input.courseTitle}`;
  const greeting = isLv
    ? (input.studentName ? `Sveiki, ${escapeHtml(input.studentName)}!` : 'Sveiki!')
    : (input.studentName ? `Hi ${escapeHtml(input.studentName)},` : 'Hi,');
  const body = isLv
    ? `Jūs sākāt pieteikšanos kursam <strong>${escapeHtml(input.courseTitle)}</strong>, bet apmaksa vēl nav pabeigta.`
    : `You started checkout for <strong>${escapeHtml(input.courseTitle)}</strong>, but payment has not been completed yet.`;
  const urgency = isLv
    ? (input.reminderNumber === 1 ? 'Ja vēlaties turpināt, varat pabeigt apmaksu ar vienu klikšķi.' : 'Atgādinām vēlreiz: pabeidziet apmaksu, lai saņemtu piekļuvi kursam.')
    : (input.reminderNumber === 1 ? 'If you still want access, you can complete payment in one click.' : 'Final reminder: complete payment to unlock your course access.');
  const button = isLv ? 'Pabeigt apmaksu' : 'Complete checkout';

  const html = `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;line-height:1.35;color:#26215C;">${greeting}</p>
    <p style="margin:0 0 10px;font-size:15px;color:#4b5563;line-height:1.6;">${body}</p>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">${urgency}</p>
    <p style="margin:24px 0;text-align:center;">
      <a href="${escapeHtml(input.checkoutUrl)}" style="display:inline-block;background:linear-gradient(135deg,#e879f9,#a855f7);background-color:#a855f7;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 34px;border-radius:50px;letter-spacing:0.3px;">${button}</a>
    </p>
  `;

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: input.to,
    subject,
    text: `${stripHtml(greeting)}\n\n${stripHtml(body)}\n${stripHtml(urgency)}\n\n${input.checkoutUrl}`,
    html: wrapEmailHtml(html, isLv ? 'lv' : 'en', subject),
  });

  if (result.error) throw result.error;
  return { status: 'sent' as const, id: result.data?.id ?? null, subject };
}

function buildCourseVariables(input: CourseEnrollmentEmailInput, price: string): RenderVariables {
  return {
    student_name: input.studentName ?? '',
    course_title: input.courseTitle,
    course_access_link: input.courseUrl,
    login_link: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.e9studija.lv',
    teacher_name: input.teacherName?.trim() || 'E9 Studija',
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
  const from = getResendFromAddress(input.template);

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY missing; skipping enrollment email');
    return { status: 'skipped' as const };
  }

  const resend = new Resend(apiKey);
  const safeStudentName = input.studentName ? escapeHtml(input.studentName) : null;
  const safeCourseUrl = escapeHtml(input.courseUrl);
  const price = formatPrice(input.amountPaid, input.currency, input.billingType, input.subscriptionInterval);
  const variables = buildCourseVariables(input, price);
  const emailLanguage = input.template?.language === 'lv' || input.purchaseLanguage === 'lv' ? 'lv' : 'en';
  const subject = input.template?.subject ? renderTemplate(input.template.subject, variables) : defaultSubject(input);
  const text = input.template?.body_text
    ? renderTemplate(input.template.body_text, variables)
    : defaultText(input, price);
  const customHtml = input.template?.body_html ? renderTemplate(input.template.body_html, variables) : null;
  const preheader = input.template?.preheader ? renderTemplate(input.template.preheader, variables) : '';
  const accountConfirmationNote = input.accountConfirmationRequired
    ? (emailLanguage === 'lv'
      ? '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 10px 10px 0;margin:0 0 28px;"><tr><td style="padding:16px 18px;"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:1px;">Iestatiet paroli</p><p style="margin:0;font-size:14px;color:#166534;line-height:1.6;">Jūsu konts ir izveidots! Pārbaudiet e-pastu — mēs nosūtām atsevišķu e-pastu ar saiti paroles iestatīšanai. Pēc paroles iestatīšanas varēsiet pieslēgties un sākt kursu.</p></td></tr></table>'
      : '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 10px 10px 0;margin:0 0 28px;"><tr><td style="padding:16px 18px;"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:1px;">Set up your password</p><p style="margin:0;font-size:14px;color:#166534;line-height:1.6;">Your account has been created! Check your inbox — we\'ve sent you a separate email with a link to set your password. Once set, you can log in and start your course right away.</p></td></tr></table>')
    : '';
  const emailHtml = customHtml
    ? `${customHtml}\n${accountConfirmationNote}`
    : `
        <p style="margin:0 0 8px;font-size:18px;font-weight:600;line-height:1.35;color:#26215C;">${input.purchaseLanguage === 'lv' ? (safeStudentName ? `Sveiki, ${safeStudentName}!` : 'Sveiki!') : (safeStudentName ? `Hello, ${safeStudentName}` : 'Hello')}</p>
        <p style="margin:0 0 28px;font-size:16px;color:#6b7280;line-height:1.6;">${input.purchaseLanguage === 'lv' ? `Paldies, ka pievienojāties kursam <strong>${escapeHtml(input.courseTitle)}</strong>. Jūsu piekļuve ir gatava, un jūs varat sākt mācīties jau tagad.` : `Thank you for joining <strong>${escapeHtml(input.courseTitle)}</strong>. Your access is ready and you can start learning now.`}</p>
        ${accountConfirmationNote}
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
    `;

  const result = await resend.emails.send({
    from,
    to: input.to,
    subject,
    ...(input.template?.reply_to_email ? { replyTo: input.template.reply_to_email } : {}),
    ...(input.attachments?.length ? { attachments: input.attachments } : {}),
    text: customHtml && !input.template?.body_text ? stripHtml(customHtml) : text,
    html: wrapEmailHtml(emailHtml, emailLanguage, preheader),
  });

  if (result.error) throw result.error;

  return { status: 'sent' as const, id: result.data?.id ?? null, subject };
}

export async function sendQuestionnaireLeadNotification(input: {
  to: string[];
  courseTitle: string;
  courseUrl?: string | null;
  leadName?: string | null;
  leadEmail?: string | null;
  answerLines: string[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getResendFromAddress();
  const recipients = Array.from(new Set(input.to.filter(Boolean)));
  if (!apiKey || recipients.length === 0) return { status: 'skipped' as const };

  const resend = new Resend(apiKey);
  const answersHtml = input.answerLines.map(line => `<li style="margin:0 0 4px;">${escapeHtml(line)}</li>`).join('');
  const content = `
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#26215C;">New call request</p>
    <p style="margin:0 0 16px;font-size:15px;color:#4b5563;">Someone asked to talk about <strong>${escapeHtml(input.courseTitle)}</strong>.</p>
    <p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>Name:</strong> ${escapeHtml(input.leadName || '—')}</p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;"><strong>Email:</strong> ${input.leadEmail ? `<a href="mailto:${escapeHtml(input.leadEmail)}" style="color:#a855f7;">${escapeHtml(input.leadEmail)}</a>` : '—'}</p>
    <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">Their answers</p>
    <ul style="margin:0 0 16px;padding-left:18px;font-size:14px;color:#4b5563;">${answersHtml}</ul>
    ${input.courseUrl ? `<p style="margin:0;font-size:13px;color:#9ca3af;">Course: <a href="${escapeHtml(input.courseUrl)}" style="color:#a855f7;">${escapeHtml(input.courseUrl)}</a></p>` : ''}
  `;
  const result = await resend.emails.send({
    from,
    to: recipients,
    subject: `New call request: ${input.courseTitle}`,
    ...(input.leadEmail ? { replyTo: input.leadEmail } : {}),
    text: [
      `New call request for ${input.courseTitle}`,
      `Name: ${input.leadName || '—'}`,
      `Email: ${input.leadEmail || '—'}`,
      '',
      'Answers:',
      ...input.answerLines,
      input.courseUrl ? `\nCourse: ${input.courseUrl}` : '',
    ].filter(Boolean).join('\n'),
    html: wrapEmailHtml(content, 'en', `New call request: ${input.courseTitle}`),
  });
  if (result.error) throw result.error;
  return { status: 'sent' as const, id: result.data?.id ?? null };
}

export async function sendAdminEnrollmentNotification(input: CourseEnrollmentEmailInput) {
  const adminEmail = process.env.E9_ADMIN_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  const from = getResendFromAddress();

  if (!adminEmail || !apiKey) return;

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

interface CourseInvoiceEmailInput {
  to: string;
  studentName?: string | null;
  courseTitle?: string | null;
  invoiceNumber?: string | null;
  invoiceUrl?: string | null;
  amountPaid: number;
  currency: string;
  language?: 'en' | 'lv' | string | null;
  attachments?: EmailAttachment[];
}

export async function sendCourseInvoiceEmail(input: CourseInvoiceEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getResendFromAddress();

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY missing; skipping invoice email');
    return { status: 'skipped' as const };
  }

  const resend = new Resend(apiKey);
  const isLatvian = input.language === 'lv';
  const safeStudentName = input.studentName ? escapeHtml(input.studentName) : null;
  const courseTitle = input.courseTitle ?? 'E9 Studija';
  const safeCourseTitle = escapeHtml(courseTitle);
  const safeInvoiceUrl = input.invoiceUrl ? escapeHtml(input.invoiceUrl) : null;
  const invoiceNumber = input.invoiceNumber ? escapeHtml(input.invoiceNumber) : null;
  const amount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: input.currency.toUpperCase() }).format(input.amountPaid);
  const subject = isLatvian
    ? `Rēķins${input.invoiceNumber ? ` ${input.invoiceNumber}` : ''} par ${courseTitle}`
    : `Invoice${input.invoiceNumber ? ` ${input.invoiceNumber}` : ''} for ${courseTitle}`;
  const greeting = isLatvian ? (safeStudentName ? `Sveiki, ${safeStudentName}!` : 'Sveiki!') : (safeStudentName ? `Hello, ${safeStudentName}` : 'Hello');
  const intro = isLatvian
    ? `Pievienojam rēķinu par <strong>${safeCourseTitle}</strong>.`
    : `Your invoice for <strong>${safeCourseTitle}</strong> is attached.`;
  const linkText = isLatvian ? 'Atvērt rēķinu' : 'Open invoice';
  const html = wrapEmailHtml(`
    <p style="margin:0 0 8px;font-size:18px;font-weight:600;line-height:1.35;color:#26215C;">${greeting}</p>
    <p style="margin:0 0 20px;font-size:16px;color:#6b7280;line-height:1.6;">${intro}</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:0 10px 10px 0;margin:0 0 28px;"><tr><td style="padding:18px 20px;"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">${invoiceNumber ?? (isLatvian ? 'Rēķins' : 'Invoice')}</p><p style="margin:0;font-size:15px;color:#4b5563;line-height:1.6;">${amount}</p></td></tr></table>
    ${safeInvoiceUrl ? `<p style="margin:28px 0;text-align:center;"><a href="${safeInvoiceUrl}" style="display:inline-block;background:linear-gradient(135deg,#e879f9,#a855f7);background-color:#a855f7;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:50px;">${linkText}</a></p>` : ''}
  `, input.language, isLatvian ? 'Jūsu E9 Studija rēķins.' : 'Your E9 Studija invoice.');

  const text = [
    greeting,
    '',
    isLatvian ? `Rēķins par ${input.courseTitle ?? 'E9 Studija'}.` : `Invoice for ${input.courseTitle ?? 'E9 Studija'}.`,
    invoiceNumber ? `${isLatvian ? 'Rēķins' : 'Invoice'}: ${invoiceNumber}` : '',
    `${isLatvian ? 'Summa' : 'Amount'}: ${amount}`,
    input.invoiceUrl ?? '',
  ].filter(Boolean).join('\n');

  const result = await resend.emails.send({
    from,
    to: input.to,
    subject,
    text,
    html,
    ...(input.attachments?.length ? { attachments: input.attachments } : {}),
  });

  if (result.error) throw result.error;
  return { status: 'sent' as const, id: result.data?.id ?? null, subject };
}
