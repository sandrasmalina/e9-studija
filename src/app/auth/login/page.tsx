'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Eye, EyeOff, Mail, Lock, KeyRound } from 'lucide-react';
import TurnstileWidget from '@/components/TurnstileWidget';

async function resolveDestination(userId: string, redirect: string) {
  const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard';
  if (safeRedirect !== '/dashboard') return safeRedirect;

  const [{ data: profile }, { data: assignedRoles }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).single(),
    supabase.from('user_roles').select('roles(name)').eq('user_id', userId),
  ]);
  const roleNames = new Set<string>();
  if (profile?.role) roleNames.add(profile.role);
  (assignedRoles ?? []).forEach((row: { roles?: { name?: string } | { name?: string }[] }) => {
    const r = Array.isArray(row.roles) ? row.roles[0] : row.roles;
    if (r?.name) roleNames.add(r.name);
  });
  if (roleNames.has('admin')) return '/admin/dashboard';
  if (roleNames.has('instructor')) return '/instructor';
  if (roleNames.has('author')) return '/admin/publications';
  return '/dashboard';
}

function LoginForm() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const confirmed = searchParams.get('confirmed');
  const reset = searchParams.get('reset');

  const [method, setMethod] = useState<'password' | 'code'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);

  // Code (OTP) login
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');

  const resetTurnstile = () => { setTurnstileToken(''); setTurnstileKey(k => k + 1); };

  useEffect(() => {
    if (confirmed) setNotice('Email confirmed. You can now log in.');
    if (reset) setNotice('Password updated. You can now log in with your new password.');
  }, [confirmed, reset]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError(t('auth.error.fields')); return; }
    if (!turnstileToken) { setError(t('turnstile.error.required')); return; }
    setLoading(true);
    setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
      options: { captchaToken: turnstileToken },
    });
    if (authError) {
      const message = authError.message.toLowerCase();
      if (message.includes('email not confirmed')) {
        setError('Please confirm your email address before logging in, or use "Email code" above.');
      } else if (message.includes('captcha')) {
        setError(authError.message);
      } else {
        setError(t('auth.error.invalid'));
      }
      resetTurnstile();
      setLoading(false);
      return;
    }
    const dest = await resolveDestination(data.user.id, redirect);
    // Hard navigation guarantees a clean load with the fresh session.
    window.location.assign(dest);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError(t('auth.error.fields')); return; }
    if (!turnstileToken) { setError(t('turnstile.error.required')); return; }
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login-code/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), turnstileToken, language }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Could not send code.'); resetTurnstile(); setLoading(false); return; }
    setCodeSent(true);
    setLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) { setError('Enter the 6-digit code from your email.'); return; }
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login-code/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) { setError(data.error ?? 'Invalid code.'); setLoading(false); return; }
    const { data: session, error: setError2 } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (setError2 || !session.user) { setError(setError2?.message ?? 'Could not sign in.'); setLoading(false); return; }
    const dest = await resolveDestination(session.user.id, redirect);
    window.location.assign(dest);
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl">
          <span className="text-accent">E9</span> Studija
        </Link>
        <h1 className="text-2xl font-bold text-white mt-6 mb-2">{t('auth.login.title')}</h1>
        <p className="text-neutral-500 text-sm">{t('auth.login.subtitle')}</p>
      </div>

      <div className="bg-bg-card border border-white/8 rounded-2xl p-8">
        {/* Method toggle */}
        {!codeSent && (
          <div className="flex rounded-xl overflow-hidden border border-white/8 text-sm mb-6">
            <button type="button" onClick={() => { setMethod('password'); setError(''); resetTurnstile(); }}
              className={`flex-1 py-2.5 font-medium transition-colors ${method === 'password' ? 'bg-accent text-white' : 'text-neutral-500 hover:text-white'}`}>
              Password
            </button>
            <button type="button" onClick={() => { setMethod('code'); setError(''); resetTurnstile(); }}
              className={`flex-1 py-2.5 font-medium transition-colors ${method === 'code' ? 'bg-accent text-white' : 'text-neutral-500 hover:text-white'}`}>
              Email code
            </button>
          </div>
        )}

        {/* Password login */}
        {method === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div>
              <label className="block text-neutral-400 text-sm mb-2">{t('auth.email')}</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); setNotice(''); }}
                  placeholder="your@email.com" autoComplete="email"
                  className="w-full bg-bg border border-white/8 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-neutral-400 text-sm">{t('auth.password')}</label>
                <Link href="/auth/forgot-password" className="text-accent text-xs hover:underline">{t('auth.forgot')}</Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); setNotice(''); }}
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full bg-bg border border-white/8 rounded-xl pl-10 pr-11 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {notice && <p className="rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-400">{notice}</p>}
            {error && <p className="text-red-400 text-sm">{error}</p>}

            <TurnstileWidget
              key={turnstileKey}
              onVerify={token => { setTurnstileToken(token); setError(''); }}
              onExpire={resetTurnstile}
              onError={() => { resetTurnstile(); setError(t('turnstile.error.failed')); }}
            />

            <button type="submit" disabled={loading || !turnstileToken}
              className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors">
              {loading ? t('auth.loading') : t('auth.login.cta')}
            </button>
          </form>
        )}

        {/* Code login — request */}
        {method === 'code' && !codeSent && (
          <form onSubmit={handleSendCode} className="space-y-5">
            <div>
              <label className="block text-neutral-400 text-sm mb-2">{t('auth.email')}</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
                <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="your@email.com" autoComplete="email"
                  className="w-full bg-bg border border-white/8 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors"
                />
              </div>
            </div>
            <p className="text-neutral-500 text-xs">We&apos;ll email you a 6-digit code to sign in — no password needed.</p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <TurnstileWidget
              key={turnstileKey}
              onVerify={token => { setTurnstileToken(token); setError(''); }}
              onExpire={resetTurnstile}
              onError={() => { resetTurnstile(); setError(t('turnstile.error.failed')); }}
            />
            <button type="submit" disabled={loading || !turnstileToken}
              className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors">
              {loading ? t('auth.loading') : 'Send code'}
            </button>
          </form>
        )}

        {/* Code login — verify */}
        {method === 'code' && codeSent && (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div className="text-center pb-2">
              <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <KeyRound size={24} className="text-accent" />
              </div>
              <p className="text-white font-semibold mb-1">Enter your code</p>
              <p className="text-neutral-400 text-sm">We sent a 6-digit code to <span className="text-white">{email}</span></p>
            </div>
            <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
              value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="000000"
              className="w-full text-center text-2xl font-mono tracking-[0.5em] bg-bg border border-white/8 rounded-xl px-4 py-4 text-white placeholder:text-neutral-700 focus:border-accent/50 focus:outline-none transition-colors"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading || code.length < 6}
              className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors">
              {loading ? t('auth.loading') : 'Verify & sign in'}
            </button>
            <button type="button" onClick={() => { setCodeSent(false); setCode(''); setError(''); resetTurnstile(); }}
              className="w-full text-center text-neutral-500 text-sm hover:text-accent transition-colors">
              ← Use a different email / resend
            </button>
          </form>
        )}

        <p className="text-center text-neutral-600 text-xs mt-6">
          Accounts are created when you join a course.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />}>
      <LoginForm />
    </Suspense>
  );
}
