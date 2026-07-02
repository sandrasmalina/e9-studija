import { NextRequest, NextResponse } from 'next/server';
import { sendCourseEnrollmentEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase';

interface EmailDeliveryResult {
  status: 'sent' | 'skipped';
  id?: string | null;
  subject?: string;
}

interface RenderVariables {
  [key: string]: string;
}

function isAuthorized(req: NextRequest) {
  const secret = process.env.SCHEDULED_EMAIL_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const authHeader = req.headers.get('authorization') ?? '';
  return authHeader === `Bearer ${secret}`;
}

function normalizeMetadata(value: unknown): RenderVariables {
  if (!value || typeof value !== 'object') return {};
  const metadata = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(metadata).map(([key, item]) => [key, typeof item === 'string' ? item : item == null ? '' : String(item)])
  );
}

export async function GET(req: NextRequest) {
  return sendDueScheduledEmails(req);
}

export async function POST(req: NextRequest) {
  return sendDueScheduledEmails(req);
}

async function sendDueScheduledEmails(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();
    const { data: templates, error: templateError } = await supabaseAdmin
      .from('email_templates')
      .select('id, type, name, subject, preheader, body_html, body_text, language, sender_name, reply_to_email, course_id, metadata, scheduled_send_at')
      .eq('is_active', true)
      .eq('send_timing', 'scheduled')
      .is('last_sent_at', null)
      .not('course_id', 'is', null)
      .lte('scheduled_send_at', now)
      .order('scheduled_send_at', { ascending: true })
      .limit(20);

    if (templateError) throw templateError;

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const template of templates ?? []) {
      const { data: course } = await supabaseAdmin
        .from('courses')
        .select('id, title_en, slug, billing_type, subscription_interval, instructor_id, instructor:profiles!courses_instructor_id_fkey(full_name)')
        .eq('id', template.course_id)
        .single();

      if (!course) continue;

      const { data: enrollments, error: enrollmentError } = await supabaseAdmin
        .from('enrollments')
        .select('id, user_id, status, expires_at, profile:profiles(full_name)')
        .eq('course_id', template.course_id)
        .eq('status', 'active')
        .or(`expires_at.is.null,expires_at.gt.${now}`);

      if (enrollmentError) throw enrollmentError;

      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.e9studija.lv').replace(/\/$/, '');
      const instructor = Array.isArray(course.instructor) ? course.instructor[0] : course.instructor;
      const extraVariables = normalizeMetadata(template.metadata);

      for (const enrollment of enrollments ?? []) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(enrollment.user_id);
        const recipientEmail = authUser.user?.email ?? null;
        if (!recipientEmail) continue;

        const profile = Array.isArray(enrollment.profile) ? enrollment.profile[0] : enrollment.profile;
        const emailInput = {
          to: recipientEmail,
          studentName: profile?.full_name ?? authUser.user?.user_metadata?.full_name ?? recipientEmail,
          courseTitle: course.title_en ?? 'E9 Studija course',
          courseUrl: `${siteUrl}/learn/${course.slug ?? ''}`,
          amountPaid: 0,
          currency: 'eur',
          billingType: course.billing_type,
          subscriptionInterval: course.subscription_interval,
          purchaseLanguage: template.language === 'lv' ? 'lv' : 'en',
          teacherName: instructor?.full_name ?? null,
          supportEmail: process.env.E9_SUPPORT_EMAIL ?? process.env.E9_ADMIN_EMAIL ?? null,
          extraVariables,
          template,
        };

        try {
          const delivery = await sendCourseEnrollmentEmail(emailInput) as EmailDeliveryResult | undefined;
          if (delivery?.status === 'sent') sent += 1;
          if (delivery?.status === 'skipped') skipped += 1;
          await supabaseAdmin.from('email_logs').insert({
            recipient_email: recipientEmail,
            subject: delivery?.subject ?? template.subject,
            status: delivery?.status ?? 'sent',
            template_id: template.id,
            course_id: template.course_id,
            resend_email_id: delivery?.id ?? null,
            sent_at: delivery?.status === 'sent' ? new Date().toISOString() : null,
          });
        } catch (error) {
          failed += 1;
          await supabaseAdmin.from('email_logs').insert({
            recipient_email: recipientEmail,
            subject: template.subject,
            status: 'failed',
            template_id: template.id,
            course_id: template.course_id,
            error_message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      await supabaseAdmin
        .from('email_templates')
        .update({ last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', template.id);
    }

    return NextResponse.json({ ok: true, templates: templates?.length ?? 0, sent, skipped, failed });
  } catch (error) {
    console.error('[email/send-scheduled-course-emails]', error);
    return NextResponse.json({ error: 'Could not send scheduled emails' }, { status: 500 });
  }
}
