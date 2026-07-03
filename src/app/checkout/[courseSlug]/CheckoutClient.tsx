'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Lock, Loader2, ShieldCheck, User, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import TurnstileWidget from '@/components/TurnstileWidget';

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
}

export default function CheckoutClient({ course }: { course: CourseSummary }) {
  const router = useRouter();
  const { language } = useLanguage();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'create' | 'signin'>('create');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [accountNotice, setAccountNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  const title = (language === 'lv' && course.title_lv) ? course.title_lv : course.title_en;
  const useLatvianThumbnail = course.language === 'lv' || (course.language === 'both' && language === 'lv');
  const thumbnailUrl = useLatvianThumbnail && course.thumbnail_url_lv ? course.thumbnail_url_lv : course.thumbnail_url;
  const displayPrice = course.discount_price ?? course.price;
  const intervalLabel = course.billing_type === 'subscription' ? `/${course.subscription_interval === 'year' ? 'year' : 'month'}` : '';

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthed(Boolean(user));
    });
  }, [course.slug, router]);

  const startStripeCheckout = async (input?: { guestEmail?: string; guestName?: string; accountSetupPending?: boolean }) => {
    setLoading(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ courseSlug: course.slug, language, ...input }),
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

  const handleCreateAndCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firstName.trim()) { setError('First name is required.'); return; }
    if (!lastName.trim()) { setError('Surname is required.'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Valid email is required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!turnstileToken) { setError('Please complete the security check.'); return; }

    setLoading(true);
    setError('');
    setAccountNotice('');
    const cleanEmail = email.trim().toLowerCase();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();

    // Create a confirmed account server-side (no email confirmation step needed)
    const signupRes = await fetch('/api/auth/checkout-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password, firstName: cleanFirstName, lastName: cleanLastName, turnstileToken }),
    });
    const signupData = await signupRes.json();

    if (signupData.exists) {
      setMode('signin');
      setAccountNotice('An account with this email already exists. Sign in to continue checkout.');
      setPassword('');
      setConfirmPassword('');
      setTurnstileToken('');
      setLoading(false);
      return;
    }

    if (!signupRes.ok) {
      setError(signupData.error ?? 'Account creation failed. Please try again.');
      setTurnstileToken('');
      setLoading(false);
      return;
    }

    // Sign in to get a session, then proceed as authenticated user
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    await startStripeCheckout();
  };

  const handleSignInAndCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return; }
    setLoading(true);
    setError('');
    setAccountNotice('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    setAuthed(true);
    await startStripeCheckout();
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
              <p className="text-2xl font-bold text-white mt-1">
                {displayPrice === 0 ? 'Free' : `${displayPrice} ${course.currency.toUpperCase()}${intervalLabel}`}
              </p>
              {course.discount_price !== null && course.discount_price < course.price && (
                <p className="text-neutral-500 text-xs line-through">{course.price} {course.currency.toUpperCase()}</p>
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
                  : <>Pay {displayPrice} {course.currency.toUpperCase()} &rarr;</>
                }
              </button>
            ) : mode === 'create' ? (
              <form onSubmit={handleCreateAndCheckout} className="space-y-4">
                <p className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-neutral-300">
                  Create your account to continue. You will have immediate access after payment.
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
                <div>
                  <label className="block text-neutral-400 text-xs mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} className="w-full bg-bg border border-white/8 rounded-xl px-4 pr-10 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none" placeholder="Min. 8 characters" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors" tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-neutral-400 text-xs mb-1.5">Confirm password</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(''); }} className="w-full bg-bg border border-white/8 rounded-xl px-4 pr-10 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none" placeholder="Repeat password" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors" tabIndex={-1} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <TurnstileWidget
                  onVerify={(token) => { setTurnstileToken(token); setError(''); }}
                  onExpire={() => setTurnstileToken('')}
                  onError={() => { setTurnstileToken(''); setError('Security check failed. Please try again.'); }}
                />
                <button type="submit" disabled={loading || !turnstileToken} className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold text-base hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Preparing checkout&hellip;</> : <>Create account and pay &rarr;</>}
                </button>
                <p className="text-center text-neutral-600 text-xs">Already have an account? <button type="button" onClick={() => { setMode('signin'); setError(''); setAccountNotice(''); setPassword(''); }} className="text-accent hover:underline">Sign in to continue</button></p>
              </form>
            ) : (
              <form onSubmit={handleSignInAndCheckout} className="space-y-4">
                {accountNotice && <p className="rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-neutral-300">{accountNotice}</p>}
                <div>
                  <label className="block text-neutral-400 text-xs mb-1.5">Email</label>
                  <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} className="w-full bg-bg border border-white/8 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none" placeholder="you@example.com" autoComplete="email" />
                </div>
                <div>
                  <label className="block text-neutral-400 text-xs mb-1.5">Password</label>
                  <div className="relative">
                    <input type={showSignInPassword ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }} className="w-full bg-bg border border-white/8 rounded-xl px-4 pr-10 py-2.5 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none" placeholder="Your password" autoComplete="current-password" />
                    <button type="button" onClick={() => setShowSignInPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors" tabIndex={-1} aria-label={showSignInPassword ? 'Hide password' : 'Show password'}>
                      {showSignInPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold text-base hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in&hellip;</> : <>Sign in and pay &rarr;</>}
                </button>
                <div className="flex justify-between text-xs">
                  <button type="button" onClick={() => { setMode('create'); setError(''); setAccountNotice(''); setPassword(''); }} className="text-neutral-500 hover:text-accent">Create new account</button>
                  <Link href="/auth/forgot-password" className="text-neutral-500 hover:text-accent">Forgot password?</Link>
                </div>
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
