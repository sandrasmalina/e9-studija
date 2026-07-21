'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Lock, Loader2, ShieldCheck, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import TurnstileWidget from '@/components/TurnstileWidget';
import { normalizeServiceModels, pickDefaultModel, pickDefaultPlan, planInitialCharge, type PaymentPlan, type ServiceModel } from '@/lib/pricing';

interface CourseSummary {
  id: string;
  slug: string;
  title_en: string;
  title_lv: string | null;
  price: number;
  discount_price: number | null;
  currency: string;
  thumbnail_url: string | null;
  thumbnail_url_lv: string | null;
  language: string | null;
  is_free: boolean;
  billing_type: string | null;
  subscription_interval: string | null;
  service_models?: ServiceModel[] | null;
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
}

export default function CheckoutClient({ course }: { course: CourseSummary }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const title = (language === 'lv' && course.title_lv) ? course.title_lv : course.title_en;
  const useLatvianThumbnail = course.language === 'lv' || (course.language === 'both' && language === 'lv');
  const thumbnailUrl = useLatvianThumbnail && course.thumbnail_url_lv ? course.thumbnail_url_lv : course.thumbnail_url;

  // Resolve the selected service model + payment plan from the URL (?sm=&pp=).
  const models = normalizeServiceModels((course.service_models ?? []) as ServiceModel[]);
  const smId = searchParams.get('sm');
  const ppId = searchParams.get('pp');
  const selectedModel = models.find(m => m.id === smId) ?? pickDefaultModel(models);
  const selectedPlan: PaymentPlan | null = selectedModel?.payment_plans.find(p => p.id === ppId) ?? pickDefaultPlan(selectedModel);
  const currency = (selectedPlan?.currency ?? course.currency).toUpperCase();

  const planSummary = (plan: PaymentPlan | null): string => {
    if (!plan) {
      const legacy = course.discount_price ?? course.price;
      const suffix = course.billing_type === 'subscription' ? `/${course.subscription_interval === 'year' ? 'year' : 'month'}` : '';
      return `${fmt(legacy, currency)}${suffix}`;
    }
    if (plan.type === 'installments') {
      const per = Number(plan.installment_amount ?? 0);
      return `${plan.installment_count ?? 0}× ${fmt(per, currency)}`;
    }
    if (plan.type === 'subscription') {
      const rec = plan.total_price != null ? `${fmt(Number(plan.total_price), currency)}/${plan.interval === 'yearly' ? 'year' : plan.interval === 'weekly' ? 'week' : 'month'}` : '';
      const up = plan.upfront_amount ? `${fmt(Number(plan.upfront_amount), currency)} now + ` : '';
      return `${up}${rec}`;
    }
    return fmt(Number(plan.total_price ?? 0), currency);
  };
  const headline = planSummary(selectedPlan);
  const initialCharge = selectedPlan ? planInitialCharge(selectedPlan) : (course.discount_price ?? course.price);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthed(Boolean(user));
    });
  }, [course.slug, router]);

  const startStripeCheckout = async (input?: { guestEmail?: string; guestName?: string; turnstileToken?: string }) => {
    setLoading(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ courseSlug: course.slug, language, serviceModelId: selectedModel?.id, paymentPlanId: selectedPlan?.id, ...input }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        router.push(`/learn/${course.slug}`);
        return;
      }
      setError(data.error ?? 'Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    window.location.href = data.url;
  };

  const handleAuthenticatedCheckout = async () => {
    await startStripeCheckout();
  };

  const handleGuestCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firstName.trim()) { setError('First name is required.'); return; }
    if (!lastName.trim()) { setError('Surname is required.'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Valid email is required.'); return; }
    if (!turnstileToken) { setError('Please complete the security check.'); return; }
    await startStripeCheckout({
      guestEmail: email.trim().toLowerCase(),
      guestName: `${firstName.trim()} ${lastName.trim()}`.trim(),
      turnstileToken,
    });
  };

  if (authed === null) return null;

  return (
    <div className="min-h-screen bg-[#0b0915] pt-24 pb-16 px-6">
      <div className="max-w-lg mx-auto">
        <Link href={`/courses/${course.slug}`}
          className="inline-flex items-center gap-2 text-neutral-500 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={14} />
          Back to course
        </Link>

        <div className="rounded-2xl border border-white/10 bg-[#16122a] overflow-hidden">
          {/* Course summary */}
          <div className="flex items-center gap-4 p-5 border-b border-white/8">
            {thumbnailUrl ? (
              <Image src={thumbnailUrl} alt={title} width={72} height={48}
                className="rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-[72px] h-12 rounded-lg bg-accent/10 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-white font-medium text-sm truncate">{title}</p>
              {selectedModel && models.length > 1 && (
                <p className="text-neutral-400 text-xs mt-0.5">{(language === 'lv' && selectedModel.name_lv) ? selectedModel.name_lv : selectedModel.name_en}</p>
              )}
              <p className="text-2xl font-bold text-white mt-1">{headline}</p>
              {selectedPlan?.type === 'one_time' && selectedPlan.original_price != null && Number(selectedPlan.original_price) > Number(selectedPlan.total_price ?? 0) && (
                <p className="text-neutral-500 text-xs line-through">{fmt(Number(selectedPlan.original_price), currency)}</p>
              )}
            </div>
          </div>

          {/* Checkout action */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-5 text-neutral-400 text-sm">
              <Lock size={13} className="text-accent shrink-0" />
              Secure checkout powered by Stripe
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                {error}
              </p>
            )}

            {authed ? (
              <button
                onClick={handleAuthenticatedCheckout}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold text-base hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /> Redirecting to payment&hellip;</>
                  : <>Pay {fmt(initialCharge, currency)} &rarr;</>
                }
              </button>
            ) : (
              <form onSubmit={handleGuestCheckout} className="space-y-4">
                <p className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-neutral-300">
                  Continue as guest. Your account will be created only after successful payment.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-neutral-400 text-xs mb-1.5">First name</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
                      <input value={firstName} onChange={e => { setFirstName(e.target.value); setError(''); }} className="w-full bg-bg border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none" placeholder="Name" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-neutral-400 text-xs mb-1.5">Surname</label>
                    <input value={lastName} onChange={e => { setLastName(e.target.value); setError(''); }} className="w-full bg-bg border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none" placeholder="Surname" />
                  </div>
                </div>
                <div>
                  <label className="block text-neutral-400 text-xs mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} className="w-full bg-bg border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none" placeholder="you@example.com" />
                </div>
                <TurnstileWidget
                  key={turnstileKey}
                  onVerify={(token) => { setTurnstileToken(token); setError(''); }}
                  onExpire={() => { setTurnstileToken(''); setTurnstileKey(k => k + 1); }}
                  onError={() => { setTurnstileToken(''); setTurnstileKey(k => k + 1); setError('Security check failed. Please try again.'); }}
                />
                <button type="submit" disabled={loading || !turnstileToken} className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold text-base hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Preparing checkout&hellip;</> : <>Continue to payment &rarr;</>}
                </button>
                <p className="text-center text-neutral-600 text-xs">
                  Already have an account? <Link href="/auth/login" className="text-accent hover:underline">Sign in</Link> for faster checkout.
                </p>
              </form>
            )}

            <div className="flex items-center justify-center gap-4 mt-5 text-neutral-600 text-xs">
              <span className="flex items-center gap-1"><ShieldCheck size={11} /> SSL encrypted</span>
              <span>&middot;</span>
              <span>Visa, Mastercard, Apple Pay</span>
              <span>&middot;</span>
              <span>30-day refund policy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
