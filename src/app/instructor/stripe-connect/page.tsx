'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle, CheckCircle2, CreditCard, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';

interface StripeConnectStatus {
  connected: boolean;
  hasAccount: boolean;
  mode?: 'test' | 'live';
  message?: string;
  detailsSubmitted?: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  requirementsDue?: string[];
  isPlatformAccount?: boolean;
}

export default function StripeConnectPage() {
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const loadStatus = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError('Please sign in again to manage Stripe Connect.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await fetch('/api/stripe/connect/status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not check Stripe Connect status.');
      setStatus(data);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Could not check Stripe Connect status.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const connectStripe = async () => {
    setConnecting(true);
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/stripe/connect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    });
    const data = await res.json().catch(() => ({}));
    setConnecting(false);
    if (res.ok && data.url) { window.location.href = data.url; return; }
    setError(data.error ?? 'Could not open Stripe Connect. Please try again.');
  };

  const connected = Boolean(status?.connected);
  const hasAccount = Boolean(status?.hasAccount);
  const isPlatformAccount = Boolean(status?.isPlatformAccount);

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Stripe Connect</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage instructor payout setup only when it needs attention.</p>
        </div>
        <button
          type="button"
          onClick={() => loadStatus(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.04] disabled:opacity-50"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Refresh Status
        </button>
      </div>

      <div className={`rounded-2xl border p-6 ${connected || isPlatformAccount ? 'border-green-500/25 bg-green-500/10' : hasAccount ? 'border-amber-500/25 bg-amber-500/10' : 'border-red-500/25 bg-red-500/10'}`}>
        {loading ? (
          <div className="flex items-center gap-3 text-zinc-400">
            <RefreshCw size={18} className="animate-spin" />
            Checking Stripe Connect status...
          </div>
        ) : (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              {connected || isPlatformAccount ? (
                <CheckCircle2 size={24} className="mt-0.5 shrink-0 text-green-400" />
              ) : hasAccount ? (
                <AlertCircle size={24} className="mt-0.5 shrink-0 text-amber-400" />
              ) : (
                <CreditCard size={24} className="mt-0.5 shrink-0 text-red-400" />
              )}
              <div>
                <p className={`text-base font-semibold ${connected || isPlatformAccount ? 'text-green-300' : hasAccount ? 'text-amber-300' : 'text-red-300'}`}>
                  {isPlatformAccount ? 'Platform Stripe account' : connected ? 'Stripe Connect is ready' : hasAccount ? 'Stripe Connect setup is incomplete' : 'Stripe Connect is not started'}
                </p>
                <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                  {status?.message ?? 'Open Stripe Connect to finish payout setup.'}
                  {status?.mode === 'test' ? ' This environment is using Stripe test mode.' : ''}
                </p>
              </div>
            </div>

            {!isPlatformAccount && (
              <button
                type="button"
                onClick={connectStripe}
                disabled={connecting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
              >
                <ExternalLink size={15} />
                {connecting ? 'Opening...' : connected ? 'Manage Stripe Account' : hasAccount ? 'Finish Stripe Setup' : 'Start Stripe Connect'}
              </button>
            )}
          </div>
        )}

        {status?.hasAccount && !status.connected && (
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <StatusPill label="Details" ready={Boolean(status.detailsSubmitted)} readyText="Submitted" missingText="Missing" />
            <StatusPill label="Charges" ready={Boolean(status.chargesEnabled)} readyText="Enabled" missingText="Not enabled" />
            <StatusPill label="Payouts" ready={Boolean(status.payoutsEnabled)} readyText="Enabled" missingText="Not enabled" />
          </div>
        )}

        {status?.requirementsDue && status.requirementsDue.length > 0 && (
          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">Stripe still needs information from this instructor.</p>
            <p className="mt-1 text-amber-100/75">Open onboarding to complete the remaining requirements.</p>
          </div>
        )}

        {error && (
          <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-sm text-zinc-400">
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-zinc-500" />
          <p>
            The earnings page no longer checks Stripe Connect automatically. Use this page only when an instructor needs to start, finish, refresh, or manage payout setup.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ label, ready, readyText, missingText }: { label: string; ready: boolean; readyText: string; missingText: string }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${ready ? 'border-green-500/20 bg-green-500/10 text-green-300' : 'border-red-500/20 bg-red-500/10 text-red-300'}`}>
      <span className="block text-xs uppercase tracking-widest opacity-70">{label}</span>
      <span className="mt-0.5 block font-medium">{ready ? readyText : missingText}</span>
    </div>
  );
}