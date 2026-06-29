import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const { courseSlug, guestEmail, guestName } = await req.json();
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
      .select('id, title_en, slug, price, discount_price, currency, thumbnail_url, is_free')
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
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'Already enrolled' }, { status: 409 });
      }
    }

    const unitAmount = Math.round((course.discount_price ?? course.price) * 100);
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    // 4. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      ...(isGuest
        ? { customer_email: guestEmail }  // prefill email for guest
        : {}),
      line_items: [
        {
          price_data: {
            currency: course.currency.toLowerCase(),
            unit_amount: unitAmount,
            product_data: {
              name: course.title_en,
              ...(course.thumbnail_url ? { images: [course.thumbnail_url] } : {}),
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        course_id: course.id,
        course_slug: course.slug,
        ...(user
          ? { user_id: user.id }
          : { guest_email: guestEmail, guest_name: guestName ?? '' }),
      },
      success_url: `${origin}/checkout/${course.slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/courses/${course.slug}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[stripe/checkout]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
