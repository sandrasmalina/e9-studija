import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const { courseSlug, guestEmail, guestName, language } = await req.json();
    if (!courseSlug) {
      return NextResponse.json({ error: 'courseSlug required' }, { status: 400 });
    }

    // 1. Auth check — either logged-in user OR guest email
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    // Guest checkout: no auth but email provided
    const isGuest = !user && !!guestEmail;
    if (!user && !guestEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch course
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('id, title_en, slug, price, discount_price, discount_starts_at, discount_ends_at, currency, thumbnail_url, is_free, billing_type, subscription_interval, instructor_id, profiles!courses_instructor_id_fkey(role,stripe_account_id,revenue_share_pct)')
      .eq('slug', courseSlug)
      .single();

    if (courseErr || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    if (course.is_free || course.price === 0) {
      return NextResponse.json({ error: 'Course is free' }, { status: 400 });
    }

    // 3. Check not already enrolled (only for logged-in users)
    if (user) {
      const { data: existing } = await supabase
        .from('enrollments')
        .select('id, status, expires_at')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .maybeSingle();
      const existingExpired = existing?.expires_at ? new Date(existing.expires_at).getTime() <= Date.now() : false;
      if (existing && existing.status === 'active' && !existingExpired) {
        return NextResponse.json({ error: 'Already enrolled' }, { status: 409 });
      }
    }

    const now = Date.now();
    const discountStarts = course.discount_starts_at ? new Date(course.discount_starts_at).getTime() : null;
    const discountEnds = course.discount_ends_at ? new Date(course.discount_ends_at).getTime() : null;
    const discountActive = course.discount_price !== null && course.discount_price < course.price && (!discountStarts || discountStarts <= now) && (!discountEnds || discountEnds >= now);
    const unitAmount = Math.round((discountActive ? course.discount_price : course.price) * 100);
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const instructorProfile = Array.isArray(course.profiles) ? course.profiles[0] : course.profiles;
    const isAdminCourse = instructorProfile?.role === 'admin';
    const stripeAccountId = isAdminCourse ? null : instructorProfile?.stripe_account_id;
    const platformFeePct = isAdminCourse ? 100 : Math.max(0, Math.min(100, 100 - (instructorProfile?.revenue_share_pct ?? 70)));
    const isSubscription = course.billing_type === 'subscription';
    const purchaseLanguage = language === 'lv' ? 'lv' : 'en';
    let paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData | undefined;
    let subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData | undefined;

    if (stripeAccountId) {
      try {
        const account = await stripe.accounts.retrieve(stripeAccountId);
        if (!account.deleted && account.charges_enabled && account.payouts_enabled) {
          if (isSubscription) {
            subscriptionData = {
              application_fee_percent: platformFeePct,
              transfer_data: { destination: stripeAccountId },
            };
          } else {
            paymentIntentData = {
              application_fee_amount: Math.round(unitAmount * (platformFeePct / 100)),
              transfer_data: { destination: stripeAccountId },
            };
          }
        }
      } catch (connectErr) {
        console.warn('[stripe/checkout] connect account unavailable:', connectErr);
      }
    }

    const checkoutMetadata = {
      course_id: course.id,
      course_slug: course.slug,
      instructor_id: course.instructor_id ?? '',
      platform_fee_pct: String(platformFeePct),
      billing_type: isSubscription ? 'subscription' : 'one_time',
      subscription_interval: isSubscription ? (course.subscription_interval ?? 'month') : '',
      purchase_language: purchaseLanguage,
      connect_account_id: stripeAccountId ?? '',
      transfer_status: isAdminCourse ? 'platform_income' : paymentIntentData || subscriptionData ? 'automatic' : 'platform_hold',
      ...(user
        ? { user_id: user.id }
        : { guest_email: guestEmail, guest_name: guestName ?? '' }),
    };

    // 4. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      ...(isGuest
        ? { customer_email: guestEmail }  // prefill email for guest
        : {}),
      line_items: [
        {
          price_data: {
            currency: course.currency.toLowerCase(),
            unit_amount: unitAmount,
            ...(isSubscription ? { recurring: { interval: course.subscription_interval === 'year' ? 'year' : 'month' } } : {}),
            product_data: {
              name: course.title_en,
              ...(course.thumbnail_url ? { images: [course.thumbnail_url] } : {}),
            },
          },
          quantity: 1,
        },
      ],
      metadata: checkoutMetadata,
      ...(paymentIntentData ? { payment_intent_data: paymentIntentData } : {}),
      ...(isSubscription ? { subscription_data: { ...(subscriptionData ?? {}), metadata: checkoutMetadata } } : {}),
      ...(!isSubscription ? { invoice_creation: { enabled: true, invoice_data: { metadata: checkoutMetadata } } } : {}),
      success_url: `${origin}/checkout/${course.slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/courses/${course.slug}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/checkout]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
