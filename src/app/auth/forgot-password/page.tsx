'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mail, KeyRound } from 'lucide-react';
import TurnstileWidget from '@/components/TurnstileWidget';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [method, setMethod] = useState<'link' | 'code'>('link');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileKey, setTurnstileKey] = useState(0);

  const resetTurnstile = () => { setTurnstileToken(''); setTurnstileKey(k => k + 1); };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError(t('auth.error.fields')); return; }
    if (!turnstileToken) { setError(t('turnstile.error.required')); return; }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
      captchaToken: turnstileToken,
    });
    if (authError) { setError(authError.message); resetTurnstile(); setLoading(false); return; }
    setSent(true);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError(t('auth.error.fields')); return; }
    if (!turnstileToken) { setError(t('turnstile.error.required')); return; }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, captchaToken: turnstileToken },
    });
    if (authError) { setError(authError.message); resetTurnstile(); setLoading(false); return; }
    setSent(true);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 6) { setError('Enter the 6-digit code from your email.'); return; }
    setVerifying(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    if (authError) { setError(authError.message); setVerifying(false); return; }
    router.replace('/auth/reset-password');
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl">
          <span className="text-accent">E9</span> Studija
        </Link>
        <h1 className="text-2xl font-bold text-white mt-6 mb-2">{t('auth.forgot.title')}</h1>
        <p className="text-neutral-500 text-sm">{t('auth.forgot.subtitle')}</p>
      </div>

      <div className="bg-bg-card border border-white/8 rounded-2xl p-8">
        {sent && method === 'link' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-accent" />
            </div>
            <h3 className="text-white font-semibold mb-2">{t('auth.forgot.sent.title')}</h3>
            <p className="text-neutral-400 text-sm">{t('auth.forgot.sent.message')}</p>
          </div>
        )}

        {sent && method === 'code' && (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <div className="text-center pb-2">
              <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <KeyRound size={24} className="text-accent" />
              </div>
              <p className="text-white font-semibold mb-1">Enter your code</p>
              <p className="text-neutral-400 text-sm">
                We sent a 6-digit code to <span className="text-white">{email}</span>
              </p>
            </div>
            <input
              type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
              value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="000000"
              className="w-full text-center text-2xl font-mono tracking-[0.5em] bg-bg border border-white/8 rounded-xl px-4 py-4 text-white placeholder:text-neutral-700 focus:border-accent/50 focus:outline-none transition-colors"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={verifying || code.length < 6}
              className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors">
              {verifying ? 'Verifying…' : 'Verify & set new password'}
            </button>
            <button type="button" onClick={() => { setSent(false); setCode(''); setError(''); resetTurnstile(); }}
              className="w-full text-center text-neutral-500 text-sm hover:text-accent transition-colors">
              ← Resend code
            </button>
          </form>
        )}

        {!sent && (
          <div className="space-y-5">
            <div className="flex rounded-xl overflow-hidden border border-white/8 text-sm">
              <button type="button" onClick={() => setMethod('link')}
                className={`flex-1 py-2.5 font-medium transition-colors ${method === 'link' ? 'bg-accent text-white' : 'text-neutral-500 hover:text-white'}`}>
                Email link
              </button>
              <button type="button" onClick={() => setMethod('code')}
                className={`flex-1 py-2.5 font-medium transition-colors ${method === 'code' ? 'bg-accent text-white' : 'text-neutral-500 hover:text-white'}`}>
                6-digit code
              </button>
            </div>

            <form onSubmit={method === 'link' ? handleSendLink : handleSendCode} className="space-y-5">
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
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <TurnstileWidget
                key={turnstileKey}
                onVerify={token => { setTurnstileToken(token); setError(''); }}
                onExpire={resetTurnstile}
                onError={() => { resetTurnstile(); setError(t('turnstile.error.failed')); }}
              />
              <button type="submit" disabled={loading || !turnstileToken}
                className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors">
                {loading ? t('auth.loading') : method === 'link' ? t('auth.forgot.cta') : 'Send 6-digit code'}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-neutral-500 text-sm mt-6">
          <Link href="/auth/login" className="text-accent hover:underline">{t('auth.back.login')}</Link>
        </p>
      </div>
    </div>
  );
}
