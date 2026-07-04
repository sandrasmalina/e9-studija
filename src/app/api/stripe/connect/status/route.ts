import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const targetUserId = req.nextUrl.searchParams.get('userId');
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [{ data: viewerProfile }, { data: viewerRoles }] = await Promise.all([
      supabaseAdmin.from('profiles').select('role').eq('id', user.id).single(),
      supabaseAdmin.from('user_roles').select('roles(name)').eq('user_id', user.id),
    ]);
    const viewerIsAdmin = viewerProfile?.role === 'admin' || (viewerRoles ?? []).some((row: { roles?: { name?: string } | { name?: string }[] }) => {
      const r = Array.isArray(row.roles) ? row.roles[0] : row.roles;
      return r?.name === 'admin';
    });

    if (targetUserId && targetUserId !== user.id && !viewerIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id,role,stripe_account_id')
      .eq('id', targetUserId ?? user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const accountId = profile.stripe_account_id as string | null;
    const mode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live';

    if (profile.role === 'admin') {
      return NextResponse.json({
        connected: true,
        hasAccount: false,
        mode,
        message: 'Admin revenue is paid to the platform Stripe account. Stripe Connect is not required.',
        isPlatformAccount: true,
      });
    }

    if (!accountId) {
      return NextResponse.json({
        connected: false,
        hasAccount: false,
        mode,
        message: 'Stripe Connect is not started.',
      });
    }

    const account = await getStripe().accounts.retrieve(accountId);
    const connected = !account.deleted && account.details_submitted && account.charges_enabled && account.payouts_enabled;

    return NextResponse.json({
      connected,
      hasAccount: true,
      accountId,
      mode,
      detailsSubmitted: Boolean(account.details_submitted),
      chargesEnabled: Boolean(account.charges_enabled),
      payoutsEnabled: Boolean(account.payouts_enabled),
      requirementsDue: account.requirements?.currently_due ?? [],
      message: connected ? 'Stripe Connect is ready for payouts.' : 'Stripe Connect setup is incomplete.',
    });
  } catch (error) {
    console.error('[stripe/connect/status]', error);
    return NextResponse.json({ error: 'Could not check Stripe Connect status' }, { status: 500 });
  }
}