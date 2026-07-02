import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

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
      const { course_id, user_id, course_slug, guest_email, guest_name } = session.metadata ?? {};

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
        .select('certificate_enabled, access_duration_months')
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

      void course; // referenced above
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
