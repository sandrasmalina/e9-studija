'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, DollarSign, Users, BookOpen, CreditCard, ExternalLink } from 'lucide-react';

interface Enrollment {
  id: string;
  enrolled_at: string;
  amount_paid: number;
  currency: string;
  course_id: string;
  course: { title_en: string };
}

export default function EarningsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueShare, setRevenueShare] = useState(70);
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile for revenue share %
      const { data: profile } = await supabase.from('profiles')
        .select('revenue_share_pct,stripe_account_id').eq('id', user.id).single();
      if (profile?.revenue_share_pct) setRevenueShare(profile.revenue_share_pct);
      if (profile?.stripe_account_id) setStripeAccountId(profile.stripe_account_id);

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

  const myEarnings = (totalRevenue * revenueShare) / 100;

  const statCards = [
    { icon: DollarSign, label: 'Total Revenue', value: `€${totalRevenue.toFixed(2)}`, sub: 'Gross sales' },
    { icon: TrendingUp, label: 'Your Earnings', value: `€${myEarnings.toFixed(2)}`, sub: `${revenueShare}% share` },
    { icon: Users, label: 'Total Enrollments', value: enrollments.length.toString(), sub: 'Paid enrollments' },
    { icon: BookOpen, label: 'Avg per Sale', value: enrollments.length > 0 ? `€${(totalRevenue / enrollments.length).toFixed(2)}` : '—', sub: 'Average order value' },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Earnings</h1>
          <p className="text-zinc-500 text-sm mt-1">Connect Stripe to receive automatic payouts from course sales.</p>
        </div>
        <button onClick={connectStripe} disabled={connectingStripe}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:border-accent/50 disabled:opacity-50">
          {stripeAccountId ? <ExternalLink size={15} /> : <CreditCard size={15} />}
          {connectingStripe ? 'Opening Stripe…' : stripeAccountId ? 'Manage Stripe Connect' : 'Connect Stripe'}
        </button>
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
                  {['Date', 'Course', 'Amount', 'Your Cut'].map(h => (
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
