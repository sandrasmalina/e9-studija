'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, FileText, CreditCard, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';

interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  status: string | null;
  currency: string;
  amount_due: number;
  amount_paid: number;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  issued_at: string | null;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  course: {
    title_en: string;
    title_lv: string | null;
    slug: string | null;
  } | null;
}

interface SubscriptionEnrollment {
  id: string;
  status: string;
  stripe_subscription_id: string | null;
  expires_at: string | null;
  course: {
    title_en: string;
    title_lv: string | null;
    slug: string;
    billing_type: string | null;
    subscription_interval: string | null;
  } | null;
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(amount ?? 0);
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BillingPage() {
  const { language } = useLanguage();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [invoiceRes, subscriptionRes] = await Promise.all([
        supabase
          .from('course_invoices')
          .select('id, invoice_number, status, currency, amount_due, amount_paid, hosted_invoice_url, invoice_pdf_url, issued_at, paid_at, period_start, period_end, course:courses(title_en, title_lv, slug)')
          .eq('user_id', user.id)
          .order('issued_at', { ascending: false, nullsFirst: false }),
        supabase
          .from('enrollments')
          .select('id, status, stripe_subscription_id, expires_at, course:courses(title_en, title_lv, slug, billing_type, subscription_interval)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .not('stripe_subscription_id', 'is', null)
          .order('enrolled_at', { ascending: false }),
      ]);

      setInvoices((invoiceRes.data ?? []) as unknown as InvoiceRow[]);
      setSubscriptions((subscriptionRes.data ?? []) as unknown as SubscriptionEnrollment[]);
      setLoading(false);
    })();
  }, []);

  const handleCancel = async (enrollmentId: string, courseTitle: string) => {
    if (!window.confirm(`Cancel subscription for ${courseTitle}? Your course access will stop now.`)) return;
    setCancellingId(enrollmentId);
    setActionError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setActionError('Please sign in again to cancel this subscription.');
      setCancellingId(null);
      return;
    }

    const response = await fetch('/api/enrollments/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ enrollmentId }),
    });

    const data = await response.json();
    if (!response.ok) {
      setActionError(data.error ?? 'Could not cancel this subscription.');
      setCancellingId(null);
      return;
    }

    setSubscriptions(current => current.filter(item => item.id !== enrollmentId));
    setCancellingId(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-zinc-500 text-sm mt-1">Invoices and active course subscriptions in one place.</p>
      </div>

      {actionError && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{actionError}</p>}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-white font-semibold">Active subscriptions</h2>
          <span className="text-xs text-zinc-600">{subscriptions.length} active</span>
        </div>

        {loading ? (
          <div className="h-28 rounded-2xl bg-white/[0.04] animate-pulse" />
        ) : subscriptions.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-zinc-500">No active course subscriptions.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {subscriptions.map(({ id, course, expires_at }) => {
              if (!course) return null;
              const title = language === 'lv' && course.title_lv ? course.title_lv : course.title_en;
              return (
                <div key={id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300">
                      <CreditCard size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/learn/${course.slug}`} className="text-sm font-medium text-white transition-colors hover:text-purple-300">{title}</Link>
                      <p className="mt-1 text-xs text-zinc-500">{course.subscription_interval === 'year' ? 'Yearly subscription' : 'Monthly subscription'}</p>
                      {expires_at && <p className="mt-1 text-xs text-zinc-600">Access until {formatDate(expires_at)}</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancel(id, title)}
                    disabled={cancellingId === id}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:border-red-500/40 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <XCircle size={15} />
                    {cancellingId === id ? 'Cancelling...' : 'Cancel subscription'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-white font-semibold">Invoices</h2>
          <span className="text-xs text-zinc-600">{invoices.length} invoice{invoices.length === 1 ? '' : 's'}</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => <div key={index} className="h-20 rounded-2xl bg-white/[0.04] animate-pulse" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
            <FileText size={34} className="mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-500">Invoices will appear here after paid course orders or subscription renewals.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_auto] gap-4 border-b border-white/[0.06] px-5 py-3 text-xs font-medium uppercase tracking-wide text-zinc-600">
              <span>Invoice</span>
              <span>Date</span>
              <span>Amount</span>
              <span className="text-right">Download</span>
            </div>
            {invoices.map(invoice => {
              const courseTitle = invoice.course ? (language === 'lv' && invoice.course.title_lv ? invoice.course.title_lv : invoice.course.title_en) : 'E9 Studija';
              const downloadUrl = invoice.invoice_pdf_url ?? invoice.hosted_invoice_url;
              return (
                <div key={invoice.id} className="grid grid-cols-[1.5fr_1fr_1fr_auto] gap-4 border-b border-white/[0.04] px-5 py-4 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{invoice.invoice_number ?? 'Invoice'}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">{courseTitle}</p>
                    {invoice.period_start && invoice.period_end && (
                      <p className="mt-1 text-xs text-zinc-600">{formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}</p>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400">{formatDate(invoice.issued_at ?? invoice.paid_at)}</p>
                  <div>
                    <p className="text-sm font-medium text-white">{formatMoney(invoice.amount_paid || invoice.amount_due, invoice.currency)}</p>
                    <p className="mt-1 text-xs capitalize text-zinc-600">{invoice.status ?? 'paid'}</p>
                  </div>
                  <div className="text-right">
                    {downloadUrl ? (
                      <a href={downloadUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-sm font-medium text-purple-300 transition-colors hover:border-purple-500/40 hover:bg-purple-500/15">
                        <Download size={15} /> PDF
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-700">Not ready</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
