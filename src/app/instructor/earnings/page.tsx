'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, DollarSign, Users, BookOpen, CreditCard, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Enrollment {
  id: string;
  enrolled_at: string;
  amount_paid: number;
  currency: string;
  course_id: string;
  course: { title_en: string };
}

interface StripeConnectStatus {
  connected: boolean;
  hasAccount: boolean;
  mode?: 'test' | 'live';
  message?: string;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  requirementsDue?: string[];
}

export default function EarningsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueShare, setRevenueShare] = useState(70);
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [platformIncome, setPlatformIncome] = useState(0);
  const [adminEnrollmentCount, setAdminEnrollmentCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile for revenue share %
      const { data: profile } = await supabase.from('profiles')
        .select('role,revenue_share_pct,stripe_account_id').eq('id', user.id).single();
      const adminAccount = profile?.role === 'admin';
      setIsAdmin(adminAccount);
      if (adminAccount) {
        setRevenueShare(100);
        setStripeStatus({
          connected: true,
          hasAccount: false,
          message: 'Admin revenue is paid to the platform Stripe account.',
        });
      } else if (profile?.revenue_share_pct) {
        setRevenueShare(profile.revenue_share_pct);
      }
      if (profile?.stripe_account_id) setStripeAccountId(profile.stripe_account_id);

      const { data: { session } } = await supabase.auth.getSession();
      if (!adminAccount && session?.access_token) {
        fetch('/api/stripe/connect/status', { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then(res => res.ok ? res.json() : null)
          .then(data => { if (data) setStripeStatus(data); })
          .catch(() => setStripeStatus(null));
      }

      // Admin: platform income is the platform's share across ALL course sales
      // (100% of admin courses + the platform cut of every instructor course).
      if (adminAccount) {
        if (session?.access_token) {
          try {
            const res = await fetch('/api/admin/earnings', { headers: { Authorization: `Bearer ${session.access_token}` } });
            if (res.ok) {
              const d = await res.json();
              setTotalRevenue(d.totalRevenue ?? 0);
              setPlatformIncome(d.platformIncome ?? 0);
              setAdminEnrollmentCount(d.totalEnrollments ?? 0);
            }
          } catch { /* ignore */ }
        }
        setLoading(false);
        return;
      }

      // Get instructor's courses
      const { data: courses } = await supabase.from('courses')
        .select('id').eq('instructor_id', user.id);
      const courseIds = (courses ?? []).map((c: { id: string }) => c.id);

      if (courseIds.length === 0) { setLoading(false); return; }

      // Get enrollments with course title
      const { data: enrs } = await supabase.from('enrollments')
        .select('id, enrolled_at, amount_paid, currency, course_id, courses(title_en)')
        .in('course_id', courseIds)
        .eq('status', 'active')
        .order('enrolled_at', { ascending: false });

      const rows = (enrs ?? []).map((e) => ({
        ...e,
        course: Array.isArray(e.courses) ? e.courses[0] : e.courses,
      }));
      setEnrollments(rows);
      setTotalRevenue(rows.reduce((sum: number, e: Enrollment) => sum + (e.amount_paid ?? 0), 0));
      setLoading(false);
    };
    load();
  }, []);

  const connectStripe = async () => {
    setConnectingStripe(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/stripe/connect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    });
    const data = await res.json();
    setConnectingStripe(false);
    if (data.url) window.location.href = data.url;
  };

  const myEarnings = isAdmin ? platformIncome : (totalRevenue * revenueShare) / 100;
  const enrollmentCount = isAdmin ? adminEnrollmentCount : enrollments.length;
  const isStripeConnected = Boolean(stripeStatus?.connected);

  const statCards = [
    { icon: DollarSign, label: 'Total Revenue', value: `€${totalRevenue.toFixed(2)}`, sub: 'Gross sales' },
    { icon: TrendingUp, label: isAdmin ? 'Platform Income' : 'Your Earnings', value: `€${myEarnings.toFixed(2)}`, sub: isAdmin ? 'Platform share of all sales' : `${revenueShare}% share` },
    { icon: Users, label: 'Total Enrollments', value: enrollmentCount.toString(), sub: 'Paid enrollments' },
    { icon: BookOpen, label: 'Avg per Sale', value: enrollmentCount > 0 ? `€${(totalRevenue / enrollmentCount).toFixed(2)}` : '—', sub: 'Average order value' },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Earnings</h1>
          <p className="text-zinc-500 text-sm mt-1">{isAdmin ? 'Admin course revenue stays in the platform Stripe account.' : 'Connect Stripe to receive automatic payouts from course sales.'}</p>
        </div>
        {!isAdmin && (
          <button onClick={connectStripe} disabled={connectingStripe}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${isStripeConnected ? 'border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/15' : 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/15'}`}>
            {stripeAccountId ? <ExternalLink size={15} /> : <CreditCard size={15} />}
            {connectingStripe ? 'Opening Stripe…' : isStripeConnected ? 'Manage Stripe Connect' : stripeAccountId ? 'Finish Stripe Setup' : 'Connect Stripe'}
          </button>
        )}
      </div>

      <div className={`mb-8 rounded-2xl border p-5 ${isStripeConnected ? 'border-green-500/25 bg-green-500/10' : 'border-red-500/25 bg-red-500/10'}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            {isStripeConnected ? <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-green-400" /> : <AlertCircle size={22} className="mt-0.5 shrink-0 text-red-400" />}
            <div>
              <p className={`text-sm font-semibold ${isStripeConnected ? 'text-green-300' : 'text-red-300'}`}>
                {isAdmin ? 'Platform Stripe account receives admin revenue' : isStripeConnected ? 'Stripe Connect is connected' : stripeStatus?.hasAccount ? 'Stripe Connect setup is incomplete' : 'Stripe Connect is not connected'}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {isAdmin
                  ? 'No Stripe Connect setup is needed for admins. Course sales are paid directly to the platform account.'
                  : isStripeConnected
                  ? 'Automatic instructor payouts are enabled for eligible course sales.'
                  : 'Finish onboarding before payouts can go directly to this instructor.'}
                {stripeStatus?.mode === 'test' ? ' You are currently using Stripe test mode.' : ''}
              </p>
            </div>
          </div>
          {!isAdmin && <button onClick={connectStripe} disabled={connectingStripe}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50">
            <ExternalLink size={15} /> {connectingStripe ? 'Opening…' : stripeStatus?.hasAccount ? 'Open Stripe Onboarding' : 'Start Stripe Connect'}
          </button>}
        </div>
        {stripeStatus?.hasAccount && !isStripeConnected && (
          <div className="mt-4 grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
            <span className={stripeStatus.detailsSubmitted ? 'text-green-300' : 'text-red-300'}>Details: {stripeStatus.detailsSubmitted ? 'submitted' : 'missing'}</span>
            <span className={stripeStatus.chargesEnabled ? 'text-green-300' : 'text-red-300'}>Charges: {stripeStatus.chargesEnabled ? 'enabled' : 'not enabled'}</span>
            <span className={stripeStatus.payoutsEnabled ? 'text-green-300' : 'text-red-300'}>Payouts: {stripeStatus.payoutsEnabled ? 'enabled' : 'not enabled'}</span>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        {statCards.map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-500 text-xs">{label}</span>
              <div className="p-2 rounded-xl bg-purple-500/10">
                <Icon size={14} className="text-purple-400" />
              </div>
            </div>
            <p className="text-white text-xl font-bold">{loading ? '…' : value}</p>
            <p className="text-zinc-600 text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Earnings table */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h2 className="text-white font-semibold">Enrollment History</h2>
        </div>

        {loading ? (
          <div className="space-y-px">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-white/[0.02] animate-pulse" />)}
          </div>
        ) : enrollments.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-zinc-600">No paid enrollments yet.</p>
            <p className="text-zinc-700 text-sm mt-1">Revenue will appear here once students enroll in your courses.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Date', 'Course', 'Amount', isAdmin ? 'Platform Income' : 'Your Cut'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-zinc-600 text-xs font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e, i) => (
                  <tr key={e.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                    <td className="px-5 py-3 text-zinc-400 text-sm whitespace-nowrap">
                      {new Date(e.enrolled_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-white text-sm">{e.course?.title_en ?? '—'}</td>
                    <td className="px-5 py-3 text-white text-sm font-medium">
                      €{(e.amount_paid ?? 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-green-400 text-sm font-medium">
                      €{((e.amount_paid ?? 0) * revenueShare / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-white/[0.02]">
                  <td colSpan={2} className="px-5 py-3 text-zinc-500 text-sm font-medium">Total</td>
                  <td className="px-5 py-3 text-white text-sm font-bold">€{totalRevenue.toFixed(2)}</td>
                  <td className="px-5 py-3 text-green-400 text-sm font-bold">€{myEarnings.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
