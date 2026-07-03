'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Eye, EyeOff, Lock } from 'lucide-react';

function ResetPasswordForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) { setError(t('auth.error.fields')); return; }
    if (password.length < 6) { setError(t('auth.error.password.short')); return; }
    if (password !== confirm) { setError(t('auth.error.password.mismatch')); return; }
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    router.replace(redirect?.startsWith('/') ? redirect : '/auth/login?reset=1');
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl">
          <span className="text-accent">E9</span> Studija
        </Link>
        <h1 className="text-2xl font-bold text-white mt-6 mb-2">{t('auth.reset.title')}</h1>
        <p className="text-neutral-500 text-sm">{t('auth.reset.subtitle')}</p>
      </div>

      <div className="bg-bg-card border border-white/8 rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-neutral-400 text-sm mb-2">{t('auth.new.password')}</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••" autoComplete="new-password"
                className="w-full bg-bg border border-white/8 rounded-xl pl-10 pr-11 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-neutral-400 text-sm mb-2">{t('auth.confirm.password')}</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                type={showPassword ? 'text' : 'password'} value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(''); }}
                placeholder="••••••••" autoComplete="new-password"
                className="w-full bg-bg border border-white/8 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors">
            {loading ? t('auth.loading') : t('auth.reset.cta')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
