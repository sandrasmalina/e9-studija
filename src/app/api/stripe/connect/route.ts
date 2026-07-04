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

    const [{ data: profile, error: profileError }, { data: assignedRoles }] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id,full_name,role,stripe_account_id')
        .eq('id', user.id)
        .single(),
      supabaseAdmin.from('user_roles').select('roles(name)').eq('user_id', user.id),
    ]);

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Collect roles from both the profiles.role column and the user_roles table.
    const roleNames = new Set<string>();
    if (profile.role) roleNames.add(profile.role);
    (assignedRoles ?? []).forEach((row: { roles?: { name?: string } | { name?: string }[] }) => {
      const r = Array.isArray(row.roles) ? row.roles[0] : row.roles;
      if (r?.name) roleNames.add(r.name);
    });

    if (roleNames.has('admin')) {
      return NextResponse.json({ error: 'Admins receive payments through the platform Stripe account and do not need Stripe Connect.' }, { status: 403 });
    }

    if (!roleNames.has('instructor')) {
      return NextResponse.json({ error: 'Teacher account required' }, { status: 403 });
    }

    const stripe = getStripe();
    let accountId = profile.stripe_account_id as string | null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: process.env.STRIPE_CONNECT_COUNTRY ?? 'LV',
        email: user.email,
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { user_id: user.id },
      });
      accountId = account.id;
      await supabaseAdmin.from('profiles').update({ stripe_account_id: accountId }).eq('id', user.id);
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/instructor/earnings?stripe=refresh`,
      return_url: `${origin}/instructor/earnings?stripe=connected`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('[stripe/connect]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: `Stripe Connect error: ${message}` }, { status: 500 });
  }
}
