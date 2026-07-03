import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyTurnstileToken } from '@/lib/turnstile';

interface SupportTicketPayload {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
  turnstileToken?: string;
}

function getFromAddress() {
  return process.env.RESEND_FROM_EMAIL ?? null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ticketEmailHtml(input: { name: string; ticketNumber: string; subject: string; message: string }) {
  return `
    <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f5f3ff;padding:32px 0;color:#18181b;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#f0eeff 0%,#e879f9 60%,#a855f7 100%);padding:28px 36px;text-align:center;">
          <img src="https://www.e9studija.lv/logo_e9.png" width="132" alt="E9 Studija" style="display:block;margin:0 auto 12px;max-width:132px;border:0;" />
          <p style="margin:0;font-size:18px;font-weight:600;color:#30285f;">Support ticket received</p>
        </div>
        <div style="padding:34px 36px;">
          <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#26215C;">Hello, ${escapeHtml(input.name)}</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;">We received your support request and created ticket <strong>${escapeHtml(input.ticketNumber)}</strong>.</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:0 10px 10px 0;margin:0 0 24px;"><tr><td style="padding:18px 20px;"><p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(input.subject)}</p><p style="margin:0;font-size:14px;color:#4b5563;line-height:1.6;white-space:pre-wrap;">${escapeHtml(input.message)}</p></td></tr></table>
          <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">We will reply to this email as soon as possible.</p>
        </div>
      </div>
    </div>
  `;
}

async function sendSupportEmails(input: { ticketNumber: string; name: string; email: string; phone?: string | null; subject: string; message: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getFromAddress();
  if (!apiKey || !from) return;

  const adminEmail = process.env.SUPPORT_ADMIN_EMAIL ?? process.env.E9_ADMIN_EMAIL ?? 'e9studija@gmail.com';
  const resend = new Resend(apiKey);
  const userSubject = `Support ticket ${input.ticketNumber}: ${input.subject}`;
  const adminSubject = `New support ticket ${input.ticketNumber}: ${input.subject}`;
  const userText = [
    `Hello ${input.name},`,
    '',
    `We received your support request and created ticket ${input.ticketNumber}.`,
    '',
    `Subject: ${input.subject}`,
    input.message,
    '',
    'We will reply as soon as possible.',
    'E9 Studija',
  ].join('\n');
  const adminText = [
    `Ticket: ${input.ticketNumber}`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.phone ? `Phone: ${input.phone}` : '',
    `Subject: ${input.subject}`,
    '',
    input.message,
  ].filter(Boolean).join('\n');

  await Promise.allSettled([
    resend.emails.send({
      from,
      to: input.email,
      subject: userSubject,
      text: userText,
      html: ticketEmailHtml(input),
    }),
    resend.emails.send({
      from,
      to: adminEmail,
      replyTo: input.email,
      subject: adminSubject,
      text: adminText,
    }),
  ]);
}

async function sendTelegramNotification(input: { ticketNumber: string; name: string; email: string; phone?: string | null; subject: string; message: string }) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  const text = [
    'New support ticket',
    '',
    `Ticket: ${input.ticketNumber}`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.phone ? `Phone: ${input.phone}` : '',
    `Subject: ${input.subject}`,
    '',
    input.message,
  ].filter(Boolean).join('\n');

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {});
}

export async function POST(request: NextRequest) {
  const body = await request.json() as SupportTicketPayload;
  const name = body.name?.trim() ?? '';
  const email = body.email?.trim() ?? '';
  const phone = body.phone?.trim() ?? '';
  const subject = body.subject?.trim() ?? '';
  const message = body.message?.trim() ?? '';

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const remoteIp = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const turnstileValid = await verifyTurnstileToken(body.turnstileToken, remoteIp);
  if (!turnstileValid) {
    return NextResponse.json({ error: 'Invalid security challenge' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };

  const { data: ticket, error } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      user_id: user?.id ?? null,
      name,
      email,
      phone: phone || null,
      subject,
      message,
    })
    .select('id, ticket_number')
    .single();

  if (error || !ticket) {
    return NextResponse.json({ error: error?.message ?? 'Could not create support ticket' }, { status: 500 });
  }

  const notificationInput = { ticketNumber: ticket.ticket_number as string, name, email, phone: phone || null, subject, message };
  await Promise.allSettled([
    sendSupportEmails(notificationInput),
    sendTelegramNotification(notificationInput),
  ]);

  return NextResponse.json({ success: true, ticketNumber: ticket.ticket_number });
}
