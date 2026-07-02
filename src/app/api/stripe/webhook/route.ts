import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { sendAdminEnrollmentNotification, sendCourseEnrollmentEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase';

interface EmailDeliveryResult {
  status: 'sent' | 'skipped';
  id?: string | null;
  subject?: string;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

async function enrollStudent(courseId: string, userId: string, amountPaid: number, currency: string, accessDurationMonths: number | null, stripeSubscriptionId: string | null, stripeCustomerId: string | null) {
  const expiresAt = accessDurationMonths ? addMonths(new Date(), accessDurationMonths).toISOString() : null;
  const { error } = await supabaseAdmin.from('enrollments').upsert(
    {
      user_id: userId,
      course_id: courseId,
      status: 'active',
      amount_paid: amountPaid,
      currency: currency.toUpperCase(),
      expires_at: expiresAt,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: stripeCustomerId,
    },
    { onConflict: 'user_id,course_id' }
  );
  if (error) {
    console.error('[webhook] enrollment upsert failed:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const { course_id, user_id, course_slug, guest_email, guest_name, purchase_language } = session.metadata ?? {};

      if (!course_id) {
        console.error('[webhook] missing course_id in metadata', session.metadata);
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // Only enroll on confirmed payment
      if (session.payment_status !== 'paid') {
        return NextResponse.json({ received: true });
      }

      const amountPaid = (session.amount_total ?? 0) / 100;
      const currency = session.currency ?? 'eur';

      // Resolve userId: logged-in user OR guest (find/create by email)
      let resolvedUserId = user_id ?? null;

      if (!resolvedUserId && guest_email) {
        // Find existing user by email, or invite them (creates account + sends welcome email)
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000, page: 1 });
        const existing = users.find(u => u.email?.toLowerCase() === guest_email.toLowerCase());

        if (existing) {
          resolvedUserId = existing.id;
          console.log(`[webhook] found existing user ${existing.id} for guest email ${guest_email}`);
        } else {
          // Create account and send invitation email so they can set a password
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.e9studija.lv';
          const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
            guest_email,
            {
              data: { full_name: guest_name ?? '' },
              redirectTo: `${siteUrl}/learn/${course_slug ?? ''}`,
            }
          );
          if (inviteErr || !inviteData?.user) {
            console.error('[webhook] failed to create guest user:', inviteErr);
            return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
          }
          resolvedUserId = inviteData.user.id;
          console.log(`[webhook] created new user ${resolvedUserId} for guest email ${guest_email}`);
        }
      }

      if (!resolvedUserId) {
        console.error('[webhook] no user_id or guest_email in metadata', session.metadata);
        return NextResponse.json({ error: 'Missing user info' }, { status: 400 });
      }

      const { data: course } = await supabaseAdmin
        .from('courses')
        .select('title_en, title_lv, slug, certificate_enabled, access_duration_months, billing_type, subscription_interval, instructor:profiles!courses_instructor_id_fkey(full_name)')
        .eq('id', course_id)
        .single();

      const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;

      await enrollStudent(course_id, resolvedUserId, amountPaid, currency, course?.access_duration_months ?? null, stripeSubscriptionId, stripeCustomerId);

      console.log(`[webhook] enrolled user ${resolvedUserId} in course ${course_slug ?? course_id}`);

      // Store Stripe session ID for reference
      await supabaseAdmin
        .from('enrollments')
        .update({ stripe_session_id: session.id } as Record<string, unknown>)
        .eq('user_id', resolvedUserId)
        .eq('course_id', course_id);

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(resolvedUserId);
      const recipientEmail = authUser.user?.email ?? guest_email ?? session.customer_details?.email ?? null;
      const recipientName = authUser.user?.user_metadata?.full_name ?? guest_name ?? session.customer_details?.name ?? null;

      if (recipientEmail && course) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.e9studija.lv';
        const courseUrl = `${siteUrl}/learn/${course.slug ?? course_slug ?? ''}`;
        const preferredLanguage = purchase_language === 'lv' ? 'lv' : 'en';
        const { data: templates } = await supabaseAdmin
          .from('email_templates')
          .select('id, subject, preheader, body_html, body_text, sender_name, reply_to_email, language, course_id')
          .eq('type', 'course_purchased')
          .or(`course_id.eq.${course_id},course_id.is.null`)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(10);
        const courseTemplates = (templates ?? []).filter(item => item.course_id === course_id);
        const globalTemplates = (templates ?? []).filter(item => !item.course_id);
        const template = courseTemplates.find(item => item.language === preferredLanguage)
          ?? globalTemplates.find(item => item.language === preferredLanguage)
          ?? courseTemplates.find(item => item.language === 'both')
          ?? globalTemplates.find(item => item.language === 'both')
          ?? courseTemplates.find(item => item.language === 'en')
          ?? globalTemplates.find(item => item.language === 'en')
          ?? null;
        const instructor = Array.isArray(course.instructor) ? course.instructor[0] : course.instructor;
        const emailInput = {
          to: recipientEmail,
          studentName: recipientName,
          courseTitle: course.title_en ?? 'E9 Studija course',
          courseUrl,
          amountPaid,
          currency,
          billingType: course.billing_type,
          subscriptionInterval: course.subscription_interval,
          purchaseLanguage: preferredLanguage,
          teacherName: instructor?.full_name ?? null,
          supportEmail: process.env.E9_SUPPORT_EMAIL ?? process.env.E9_ADMIN_EMAIL ?? null,
          template: template ?? null,
        };

        const emailResults = await Promise.allSettled([
          sendCourseEnrollmentEmail(emailInput),
          sendAdminEnrollmentNotification(emailInput),
        ]);
        const studentEmailResult = emailResults[0];
        if (studentEmailResult.status === 'fulfilled') {
          const delivery = studentEmailResult.value as EmailDeliveryResult | undefined;
          if (delivery) {
            await supabaseAdmin.from('email_logs').insert({
              recipient_email: recipientEmail,
              subject: delivery.subject ?? `You are enrolled in ${course.title_en ?? 'E9 Studija course'}`,
              status: delivery.status,
              template_id: template?.id ?? null,
              course_id,
              resend_email_id: delivery.id ?? null,
              sent_at: delivery.status === 'sent' ? new Date().toISOString() : null,
            });
          }
        }
        if (studentEmailResult.status === 'rejected') {
          console.error('[webhook] enrollment email failed:', studentEmailResult.reason);
          await supabaseAdmin.from('email_logs').insert({
            recipient_email: recipientEmail,
            subject: template?.subject ?? `You are enrolled in ${course.title_en ?? 'E9 Studija course'}`,
            status: 'failed',
            template_id: template?.id ?? null,
            course_id,
            error_message: studentEmailResult.reason instanceof Error ? studentEmailResult.reason.message : String(studentEmailResult.reason),
          });
        }
        const adminEmailResult = emailResults[1];
        if (adminEmailResult.status === 'rejected') console.error('[webhook] admin enrollment email failed:', adminEmailResult.reason);
      }
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.warn('[webhook] async payment failed for session', session.id);
      // Could notify user here via email in future
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      await supabaseAdmin
        .from('enrollments')
        .update({ status: 'canceled', canceled_at: new Date().toISOString(), expires_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('stripe_subscription_id', subscription.id);
    }
  } catch (err) {
    console.error('[webhook] handler error:', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
