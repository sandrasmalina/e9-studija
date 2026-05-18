'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

export default function RegisterPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError(t('auth.error.fields'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.error.password.short'));
      return;
    }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="bg-bg-card border border-white/8 rounded-2xl p-10">
          <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
            <Mail size={24} className="text-accent" />
          </div>
          <h2 className="text-white font-bold text-xl mb-2">{t('auth.register.success.title')}</h2>
          <p className="text-neutral-400 text-sm">{t('auth.register.success.message')}</p>
          <Link href="/auth/login"
            className="inline-block mt-6 px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors">
            {t('auth.login.cta')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl">
          <span className="text-accent">E9</span> Studija
        </Link>
        <h1 className="text-2xl font-bold text-white mt-6 mb-2">{t('auth.register.title')}</h1>
        <p className="text-neutral-500 text-sm">{t('auth.register.subtitle')}</p>
      </div>

      <div className="bg-bg-card border border-white/8 rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-neutral-400 text-sm mb-2">{t('auth.fullname')}</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                type="text" value={fullName} onChange={e => { setFullName(e.target.value); setError(''); }}
                placeholder={t('auth.fullname.placeholder')} autoComplete="name"
                className="w-full bg-bg border border-white/8 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors"
              />
            </div>
          </div>
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
            <label className="block text-neutral-400 text-sm mb-2">{t('auth.password')}</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input
                type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder={t('auth.password.placeholder')} autoComplete="new-password"
                className="w-full bg-bg border border-white/8 rounded-xl pl-10 pr-11 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-neutral-600 text-xs mt-1.5">{t('auth.password.hint')}</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors">
            {loading ? t('auth.loading') : t('auth.register.cta')}
          </button>
        </form>

        <p className="text-center text-neutral-500 text-sm mt-6">
          {t('auth.have.account')}{' '}
          <Link href="/auth/login" className="text-accent hover:underline">{t('auth.login.link')}</Link>
        </p>
      </div>
    </div>
  );
}
