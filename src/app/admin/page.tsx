'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import TurnstileWidget from '@/components/TurnstileWidget';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) { setError('Please complete the security check.'); return; }
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: turnstileToken },
    });
    if (error) {
      setError(error.message);
      setTurnstileToken('');
      setLoading(false);
    } else {
      const [{ data: profile }, { data: assignedRoles }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', data.user.id).single(),
        supabase.from('user_roles').select('roles(name)').eq('user_id', data.user.id),
      ]);
      const roleNames = new Set<string>();
      if (profile?.role) roleNames.add(profile.role);
      (assignedRoles ?? []).forEach((row: any) => row.roles?.name && roleNames.add(row.roles.name));
      if (roleNames.has('admin')) { router.push('/admin/dashboard'); return; }
      if (roleNames.has('instructor')) { router.push('/instructor'); return; }
      if (roleNames.has('author')) { router.push('/admin/publications'); return; }
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#07060e' }}>
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 mb-4">
            <Lock size={20} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white">Platform Access</h1>
          <p className="text-zinc-500 text-sm mt-1">Sign in to your E9 Studija account</p>
        </div>

        <form onSubmit={handleLogin} className="glass-card rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                required
                autoComplete="email"
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-accent/50 transition-colors"
                placeholder="admin@e9studija.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                required
                autoComplete="current-password"
                className="w-full pl-9 pr-10 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-accent/50 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>
          )}

          <TurnstileWidget
            onVerify={(token) => { setTurnstileToken(token); setError(''); }}
            onExpire={() => setTurnstileToken('')}
            onError={() => { setTurnstileToken(''); setError('Security check failed. Please try again.'); }}
          />

          <button
            type="submit"
            disabled={loading || !turnstileToken}
            className="w-full py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl transition-colors mt-2"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
