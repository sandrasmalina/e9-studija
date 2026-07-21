'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, TrendingUp, CheckCircle2, Clock, XCircle, AlertTriangle, Mail, MailCheck } from 'lucide-react';

interface Funnel {
  started: number;
  paid: number;
  open: number;
  expired: number;
  failed: number;
  reminder1Sent: number;
  reminder2Sent: number;
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

interface ReportData {
  funnel: Funnel;
  paidRevenue: number;
  conversionRate: number;
  recent: IntentRow[];
}

const STATUS_STYLES: Record<IntentRow['status'], string> = {
  paid: 'bg-emerald-900/40 text-emerald-400',
  open: 'bg-amber-900/40 text-amber-400',
  expired: 'bg-zinc-800 text-zinc-400',
  failed: 'bg-red-900/40 text-red-400',
};

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: React.ElementType; tone: string }) {
  return (
    <div className={`rounded-2xl border bg-zinc-900 p-5 ${tone}`}>
      <div className="mb-3 inline-flex rounded-lg bg-black/20 p-2">
        <Icon size={15} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs leading-tight text-zinc-500">{label}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminCheckoutIntents() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError('You must be signed in as an admin.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/admin/checkout-intents', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Could not load checkout intents.');
        setLoading(false);
        return;
      }
      setData(json as ReportData);
    } catch {
      setError('Could not load checkout intents.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Checkout Funnel</h1>
          <p className="mt-1 text-sm text-zinc-500">Guest checkout attempts, conversions, and abandoned-cart reminders.</p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white transition-colors" aria-label="Refresh">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">{error}</p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-zinc-900/60 animate-pulse" />)}</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Checkouts started" value={data.funnel.started} icon={TrendingUp} tone="border-violet-500/20 text-violet-400" />
            <StatCard label="Paid" value={data.funnel.paid} icon={CheckCircle2} tone="border-emerald-500/20 text-emerald-400" />
            <StatCard label="Conversion rate" value={`${data.conversionRate}%`} icon={TrendingUp} tone="border-cyan-500/20 text-cyan-400" />
            <StatCard label="Paid revenue" value={data.paidRevenue} icon={CheckCircle2} tone="border-emerald-500/20 text-emerald-400" />
            <StatCard label="Still open" value={data.funnel.open} icon={Clock} tone="border-amber-500/20 text-amber-400" />
            <StatCard label="Expired" value={data.funnel.expired} icon={XCircle} tone="border-zinc-600/40 text-zinc-400" />
            <StatCard label="Failed" value={data.funnel.failed} icon={AlertTriangle} tone="border-red-500/20 text-red-400" />
            <StatCard label="Reminders sent" value={`${data.funnel.reminder1Sent} / ${data.funnel.reminder2Sent}`} icon={MailCheck} tone="border-blue-500/20 text-blue-400" />
          </div>

          <div className="rounded-2xl border border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60">
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden md:table-cell">Course</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden sm:table-cell">Amount</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden lg:table-cell">Reminders</th>
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden md:table-cell">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {data.recent.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-600">No guest checkout attempts yet.</td></tr>
                ) : data.recent.map(row => (
                  <tr key={row.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{row.guest_email}</p>
                      {row.guest_name && <p className="text-zinc-600 text-xs">{row.guest_name}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-zinc-400 text-sm">{row.course_slug}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[row.status]}`}>{row.status}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-zinc-400 text-sm">
                      {row.amount_total != null ? `${row.amount_total} ${row.currency ?? ''}`.trim() : '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-xs ${row.reminder_1_sent_at ? 'text-blue-400' : 'text-zinc-700'}`} title="Reminder 1">
                          {row.reminder_1_sent_at ? <MailCheck size={13} /> : <Mail size={13} />} 1
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs ${row.reminder_2_sent_at ? 'text-blue-400' : 'text-zinc-700'}`} title="Reminder 2">
                          {row.reminder_2_sent_at ? <MailCheck size={13} /> : <Mail size={13} />} 2
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-zinc-500 text-xs">{formatDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
