import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enrollmentId } = await req.json();
    if (!enrollmentId) {
      return NextResponse.json({ error: 'enrollmentId required' }, { status: 400 });
    }

    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .select('id, user_id, status, stripe_subscription_id, course:courses(id, billing_type)')
      .eq('id', enrollmentId)
      .eq('user_id', user.id)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    const course = Array.isArray(enrollment.course) ? enrollment.course[0] : enrollment.course;
    const isSubscriptionCourse = course?.billing_type === 'subscription' || Boolean(enrollment.stripe_subscription_id);

    if (!isSubscriptionCourse) {
      return NextResponse.json({ error: 'Only subscription courses can be unsubscribed here' }, { status: 400 });
    }

    if (enrollment.status !== 'active') {
      return NextResponse.json({ ok: true });
    }

    if (enrollment.stripe_subscription_id) {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(enrollment.stripe_subscription_id);
    }

    await supabaseAdmin
      .from('enrollments')
      .update({ status: 'canceled', canceled_at: new Date().toISOString(), expires_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', enrollment.id)
      .eq('user_id', user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[enrollments/unsubscribe]', err);
    return NextResponse.json({ error: 'Could not unsubscribe from course' }, { status: 500 });
  }
}
