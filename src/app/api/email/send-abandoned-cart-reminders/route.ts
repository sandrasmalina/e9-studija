import { NextRequest, NextResponse } from 'next/server';
import { sendAbandonedCheckoutReminderEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase';

interface CheckoutIntentRow {
  id: number;
  course_id: string | null;
  course_slug: string;
  guest_email: string;
  guest_name: string | null;
  purchase_language: string | null;
  status: 'open' | 'expired' | 'paid' | 'failed';
  checkout_url: string | null;
  recovery_url: string | null;
  created_at: string;
  reminder_1_sent_at: string | null;
  reminder_2_sent_at: string | null;
  paid_at: string | null;
}

function isAuthorized(req: NextRequest) {
  const secret = process.env.SCHEDULED_EMAIL_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const authHeader = req.headers.get('authorization') ?? '';
  return authHeader === `Bearer ${secret}`;
}

function reminderStage(intent: CheckoutIntentRow, nowMs: number): 1 | 2 | null {
  if (intent.paid_at) return null;
  const ageMs = nowMs - new Date(intent.created_at).getTime();
  if (!intent.reminder_1_sent_at && ageMs >= 4 * 60 * 60 * 1000) return 1;
  if (intent.reminder_1_sent_at && !intent.reminder_2_sent_at && ageMs >= 24 * 60 * 60 * 1000) return 2;
  return null;
}

export async function GET(req: NextRequest) {
  return sendReminders(req);
}

export async function POST(req: NextRequest) {
  return sendReminders(req);
}

async function sendReminders(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const { data: intents, error } = await supabaseAdmin
      .from('checkout_intents')
      .select('id, course_id, course_slug, guest_email, guest_name, purchase_language, status, checkout_url, recovery_url, created_at, reminder_1_sent_at, reminder_2_sent_at, paid_at')
      .in('status', ['open', 'expired'])
      .is('paid_at', null)
      .lte('created_at', fourHoursAgo)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.e9studija.lv').replace(/\/$/, '');
    const nowMs = Date.now();
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of (intents ?? []) as CheckoutIntentRow[]) {
      const stage = reminderStage(row, nowMs);
      if (!stage) continue;

      const { data: course } = row.course_id
        ? await supabaseAdmin
            .from('courses')
            .select('title_en, title_lv, slug')
            .eq('id', row.course_id)
            .maybeSingle()
        : { data: null };

      const language = row.purchase_language === 'lv' ? 'lv' : 'en';
      const courseTitle = language === 'lv' && course?.title_lv ? course.title_lv : (course?.title_en ?? row.course_slug.replace(/-/g, ' '));
      // Prefer a Stripe-generated recovery link when present. Otherwise link to our own
      // checkout page, which always regenerates a fresh Stripe session. The raw session
      // `checkout_url` is intentionally NOT used because Stripe sessions expire (~24h) and
      // the second reminder fires after that, which would produce a dead link.
      const checkoutUrl = row.recovery_url || `${siteUrl}/checkout/${course?.slug ?? row.course_slug}`;

      try {
        const delivery = await sendAbandonedCheckoutReminderEmail({
          to: row.guest_email,
          courseTitle,
          checkoutUrl,
          studentName: row.guest_name,
          language,
          reminderNumber: stage,
        });

        if (delivery.status === 'sent') {
          sent += 1;
          await supabaseAdmin
            .from('checkout_intents')
            .update(
              stage === 1
                ? { reminder_1_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }
                : { reminder_2_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            )
            .eq('id', row.id);
        } else {
          skipped += 1;
        }

        await supabaseAdmin.from('email_logs').insert({
          recipient_email: row.guest_email,
          subject: delivery.status === 'sent'
            ? (language === 'lv' ? `Jūsu kursa rezervācija gaida: ${courseTitle}` : `Your checkout is waiting: ${courseTitle}`)
            : (language === 'lv' ? `Atgādinājums izlaists: ${courseTitle}` : `Reminder skipped: ${courseTitle}`),
          status: delivery.status,
          resend_email_id: delivery.status === 'sent' ? delivery.id ?? null : null,
          sent_at: delivery.status === 'sent' ? new Date().toISOString() : null,
        });
      } catch (sendError) {
        failed += 1;
        await supabaseAdmin.from('email_logs').insert({
          recipient_email: row.guest_email,
          subject: language === 'lv' ? `Atgādinājums neizdevās: ${courseTitle}` : `Reminder failed: ${courseTitle}`,
          status: 'failed',
          error_message: sendError instanceof Error ? sendError.message : String(sendError),
        });
      }
    }

    return NextResponse.json({ ok: true, candidates: intents?.length ?? 0, sent, skipped, failed });
  } catch (err) {
    console.error('[email/send-abandoned-cart-reminders]', err);
    return NextResponse.json({ error: 'Could not send abandoned cart reminders' }, { status: 500 });
  }
}
