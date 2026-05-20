'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

function LoginForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError(t('auth.error.fields'));
      return;
    }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(t('auth.error.invalid'));
      setLoading(false);
      return;
    }
    // Redirect based on role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    const role = profile?.role ?? 'student';
    if (role === 'admin') { router.replace('/admin'); return; }
    if (role === 'instructor') { router.replace('/instructor/dashboard'); return; }
    router.replace(redirect);
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl">
          <span className="text-accent">E9</span> Studija
        </Link>
        <h1 className="text-2xl font-bold text-white mt-6 mb-2">{t('auth.login.title')}</h1>
        <p className="text-neutral-500 text-sm">{t('auth.login.subtitle')}</p>
      </div>

      <div className="bg-bg-card border border-white/8 rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-neutral-400 text-sm mb-2">{t('auth.email')}</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="your@email.com" autoComplete="email"
                className="w-full bg-bg border border-white/8 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-neutral-400 text-sm">{t('auth.password')}</label>
              <Link href="/auth/forgot-password" className="text-accent text-xs hover:underline">
                {t('auth.forgot')}
              </Link>
            </div>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••" autoComplete="current-password"
                className="w-full bg-bg border border-white/8 rounded-xl pl-10 pr-11 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors">
            {loading ? t('auth.loading') : t('auth.login.cta')}
          </button>
        </form>

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
