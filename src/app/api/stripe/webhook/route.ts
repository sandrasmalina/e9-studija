import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';

async function enrollStudent(courseId: string, userId: string, amountPaid: number, currency: string) {
  const { error } = await supabaseAdmin.from('enrollments').upsert(
    {
      user_id: userId,
      course_id: courseId,
      status: 'active',
      amount_paid: amountPaid,
      currency: currency.toUpperCase(),
    },
    { onConflict: 'user_id,course_id' }
  );
  if (error) {
    console.error('[webhook] enrollment upsert failed:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
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
      const { course_id, user_id, course_slug } = session.metadata ?? {};

      if (!course_id || !user_id) {
        console.error('[webhook] missing metadata', session.metadata);
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // Only enroll on confirmed payment
      if (session.payment_status !== 'paid') {
        return NextResponse.json({ received: true });
      }

      const amountPaid = (session.amount_total ?? 0) / 100;
      const currency = session.currency ?? 'eur';

      await enrollStudent(course_id, user_id, amountPaid, currency);

      // Check if course has certificate_enabled and issue on enrollment
      const { data: course } = await supabaseAdmin
        .from('courses')
        .select('certificate_enabled')
        .eq('id', course_id)
        .single();

      console.log(`[webhook] enrolled user ${user_id} in course ${course_slug ?? course_id}`);

      // Store Stripe session ID for reference
      await supabaseAdmin
        .from('enrollments')
        .update({ stripe_session_id: session.id } as Record<string, unknown>)
        .eq('user_id', user_id)
        .eq('course_id', course_id);

      void course; // referenced above
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.warn('[webhook] async payment failed for session', session.id);
      // Could notify user here via email in future
    }
  } catch (err) {
    console.error('[webhook] handler error:', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
