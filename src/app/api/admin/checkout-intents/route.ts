import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabaseAdmin.from('profiles').select('role').eq('id', user.id).single(),
    supabaseAdmin.from('user_roles').select('roles(name)').eq('user_id', user.id),
  ]);
  const isAdmin = profile?.role === 'admin' || (roles ?? []).some((row: { roles?: { name?: string } | { name?: string }[] }) => {
    const r = Array.isArray(row.roles) ? row.roles[0] : row.roles;
    return r?.name === 'admin';
  });
  return isAdmin ? user : null;
}

interface IntentRow {
  id: number;
  course_slug: string;
  guest_email: string;
  guest_name: string | null;
  status: 'open' | 'paid' | 'expired' | 'failed';
  amount_total: number | null;
  currency: string | null;
  created_at: string;
  paid_at: string | null;
  reminder_1_sent_at: string | null;
  reminder_2_sent_at: string | null;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('checkout_intents')
    .select('id, course_slug, guest_email, guest_name, status, amount_total, currency, created_at, paid_at, reminder_1_sent_at, reminder_2_sent_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[admin/checkout-intents]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as IntentRow[];
  const funnel = {
    started: rows.length,
    paid: rows.filter(row => row.status === 'paid').length,
    open: rows.filter(row => row.status === 'open').length,
    expired: rows.filter(row => row.status === 'expired').length,
    failed: rows.filter(row => row.status === 'failed').length,
    reminder1Sent: rows.filter(row => row.reminder_1_sent_at).length,
    reminder2Sent: rows.filter(row => row.reminder_2_sent_at).length,
  };
  const paidRevenue = rows
    .filter(row => row.status === 'paid')
    .reduce((sum, row) => sum + (row.amount_total ?? 0), 0);
  const conversionRate = funnel.started > 0 ? Number(((funnel.paid / funnel.started) * 100).toFixed(1)) : 0;

  return NextResponse.json({
    funnel,
    paidRevenue: Number(paidRevenue.toFixed(2)),
    conversionRate,
    recent: rows.slice(0, 100),
  });
}
