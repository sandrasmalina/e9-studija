import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { encodeLegalDocumentVersions, getLatestLegalDocumentRefs } from '@/lib/legal-documents';

async function storeGuestCheckoutIntent(input: {
  session: Stripe.Checkout.Session;
  courseId: string;
  courseSlug: string;
  guestEmail: string;
  guestName: string;
  purchaseLanguage: 'en' | 'lv';
}) {
  const payload = {
    stripe_checkout_session_id: input.session.id,
    stripe_payment_intent_id: typeof input.session.payment_intent === 'string' ? input.session.payment_intent : input.session.payment_intent?.id ?? null,
    stripe_customer_id: typeof input.session.customer === 'string' ? input.session.customer : input.session.customer?.id ?? null,
    course_id: input.courseId,
    course_slug: input.courseSlug,
    guest_email: input.guestEmail,
    guest_name: input.guestName,
    purchase_language: input.purchaseLanguage,
    status: 'open',
    checkout_url: input.session.url,
    amount_total: ((input.session.amount_total ?? 0) / 100) || null,
    currency: input.session.currency?.toUpperCase() ?? null,
    metadata: input.session.metadata ?? {},
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('checkout_intents')
    .upsert(payload, { onConflict: 'stripe_checkout_session_id' });

  if (error) {
    console.error('[stripe/checkout] failed to upsert checkout intent:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const { courseSlug, guestEmail, guestName, language, turnstileToken, serviceModelId, paymentPlanId } = await req.json();
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

    // Verify Turnstile for guest checkouts to prevent spam sessions
    if (isGuest) {
      const remoteIp = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
      const valid = await verifyTurnstileToken(turnstileToken, remoteIp);
      if (!valid) {
        return NextResponse.json({ error: 'Security check failed. Please try again.' }, { status: 400 });
      }
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

    // Resolve the selected payment plan (multi-pricing). Falls back to legacy course price.
    let plan: {
      id: string; service_model_id: string; type: string; currency: string | null;
      total_price: number | null; original_price: number | null; upfront_amount: number | null;
      installment_count: number | null; installment_amount: number | null; interval: string | null;
    } | null = null;
    let resolvedServiceModelId: string | null = serviceModelId ?? null;
    if (paymentPlanId) {
      const { data: planRow } = await supabase
        .from('payment_plans')
        .select('id, service_model_id, type, currency, total_price, original_price, upfront_amount, installment_count, installment_amount, interval, is_active, service_models!inner(course_id)')
        .eq('id', paymentPlanId)
        .maybeSingle();
      const smJoin = planRow ? (Array.isArray(planRow.service_models) ? planRow.service_models[0] : planRow.service_models) as { course_id?: string } | null : null;
      if (planRow && planRow.is_active && smJoin?.course_id === course.id) {
        plan = {
          id: planRow.id as string,
          service_model_id: planRow.service_model_id as string,
          type: planRow.type as string,
          currency: planRow.currency as string | null,
          total_price: planRow.total_price as number | null,
          original_price: planRow.original_price as number | null,
          upfront_amount: planRow.upfront_amount as number | null,
          installment_count: planRow.installment_count as number | null,
          installment_amount: planRow.installment_amount as number | null,
          interval: planRow.interval as string | null,
        };
        resolvedServiceModelId = planRow.service_model_id as string;
      }
    }

    const planType = plan?.type ?? (course.billing_type === 'subscription' ? 'subscription' : 'one_time');
    const isSubscription = planType === 'subscription';
    const isInstallments = planType === 'installments';
    const useSubscriptionMode = isSubscription || isInstallments;
    const stripeInterval: 'week' | 'month' | 'year' =
      plan?.interval === 'yearly' ? 'year' : plan?.interval === 'weekly' ? 'week' : (course.subscription_interval === 'year' ? 'year' : 'month');

    // Amount charged on the recurring/one-time Stripe line (server-derived — never trust the client).
    let unitAmount: number;
    if (plan) {
      if (isInstallments) unitAmount = Math.round(Number(plan.installment_amount ?? plan.total_price ?? 0) * 100);
      else unitAmount = Math.round(Number(plan.total_price ?? 0) * 100);
    } else {
      const now = Date.now();
      const discountStarts = course.discount_starts_at ? new Date(course.discount_starts_at).getTime() : null;
      const discountEnds = course.discount_ends_at ? new Date(course.discount_ends_at).getTime() : null;
      const discountActive = course.discount_price !== null && course.discount_price < course.price && (!discountStarts || discountStarts <= now) && (!discountEnds || discountEnds >= now);
      unitAmount = Math.round((discountActive ? course.discount_price : course.price) * 100);
    }
    if (!unitAmount || unitAmount <= 0) {
      return NextResponse.json({ error: 'Selected plan has no price' }, { status: 400 });
    }

    const currency = (plan?.currency ?? course.currency ?? 'EUR').toLowerCase();
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const instructorProfile = Array.isArray(course.profiles) ? course.profiles[0] : course.profiles;
    const isAdminCourse = instructorProfile?.role === 'admin';
    const stripeAccountId = isAdminCourse ? null : instructorProfile?.stripe_account_id;
    const platformFeePct = isAdminCourse ? 100 : Math.max(0, Math.min(100, 100 - (instructorProfile?.revenue_share_pct ?? 70)));
    const purchaseLanguage = language === 'lv' ? 'lv' : 'en';
    const { documents: legalDocuments, error: legalError } = await getLatestLegalDocumentRefs(supabase);
    if (legalError || legalDocuments.length === 0) {
      return NextResponse.json({ error: 'Legal documents are not available' }, { status: 500 });
    }
    const legalDocumentVersions = encodeLegalDocumentVersions(legalDocuments);
    let paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData | undefined;
    let subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData | undefined;

    if (stripeAccountId) {
      try {
        const account = await stripe.accounts.retrieve(stripeAccountId);
        if (!account.deleted && account.charges_enabled && account.payouts_enabled) {
          if (useSubscriptionMode) {
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
      billing_type: useSubscriptionMode ? 'subscription' : 'one_time',
      plan_type: planType,
      service_model_id: resolvedServiceModelId ?? '',
      payment_plan_id: plan?.id ?? '',
      installment_count: isInstallments ? String(plan?.installment_count ?? '') : '',
      subscription_interval: useSubscriptionMode ? stripeInterval : '',
      purchase_language: purchaseLanguage,
      legal_acceptance_source: user ? 'checkout' : 'guest_checkout',
      legal_accepted_at: new Date().toISOString(),
      legal_document_versions: legalDocumentVersions,
      connect_account_id: stripeAccountId ?? '',
      transfer_status: isAdminCourse ? 'platform_income' : paymentIntentData || subscriptionData ? 'automatic' : 'platform_hold',
      ...(user
        ? { user_id: user.id }
        : {
            guest_email: guestEmail,
            guest_name: guestName ?? '',
            guest_first_name: (guestName ?? '').split(' ')[0] ?? '',
            guest_last_name: (guestName ?? '').split(' ').slice(1).join(' '),
          }),
    };

    // 4. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: useSubscriptionMode ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      ...(isGuest
        ? { customer_email: guestEmail }  // prefill email for guest
        : {}),
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: unitAmount,
            ...(useSubscriptionMode ? { recurring: { interval: stripeInterval } } : {}),
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
      ...(useSubscriptionMode ? { subscription_data: { ...(subscriptionData ?? {}), metadata: checkoutMetadata } } : {}),
      ...(!useSubscriptionMode ? { invoice_creation: { enabled: true, invoice_data: { metadata: checkoutMetadata } } } : {}),
      success_url: `${origin}/checkout/${course.slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/courses/${course.slug}`,
    });

    if (isGuest && guestEmail) {
      await storeGuestCheckoutIntent({
        session,
        courseId: course.id,
        courseSlug: course.slug,
        guestEmail: guestEmail.trim().toLowerCase(),
        guestName: (guestName ?? '').trim(),
        purchaseLanguage,
      });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/checkout]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
