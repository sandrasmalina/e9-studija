'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, User } from 'lucide-react';

interface Invitation { email: string; roles: string[] | null; status: string; expires_at: string | null; }

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('invite');
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { router.replace('/courses'); return; }
    const supabase = createClient();
    supabase.from('invitations').select('email,roles,status,expires_at').eq('token', token).single()
      .then(({ data }) => {
        setInvite(data as Invitation | null);
        setLoading(false);
      });
  }, [router, token]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invite || !token) return;
    if (!fullName.trim()) { setError('Full name is required'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setSaving(true); setError('');
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: { data: { full_name: fullName.trim(), invite_token: token } },
    });
    setSaving(false);
    if (signUpError) { setError(signUpError.message); return; }
    setDone(true);
  };

  if (loading) return <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />;

  if (!invite) {
    return (
      <div className="w-full max-w-md bg-bg-card border border-white/8 rounded-2xl p-8 text-center">
        <h1 className="text-white text-2xl font-bold mb-2">Invitation not found</h1>
        <p className="text-neutral-500 text-sm mb-6">This invitation link is invalid or expired.</p>
        <Link href="/auth/login" className="text-accent text-sm hover:underline">Back to login</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-md bg-bg-card border border-white/8 rounded-2xl p-8 text-center">
        <h1 className="text-white text-2xl font-bold mb-2">Account created</h1>
        <p className="text-neutral-500 text-sm mb-6">You can now sign in with your email and password.</p>
        <Link href="/auth/login" className="inline-flex justify-center w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-colors">Go to login</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl"><span className="text-accent">E9</span> Studija</Link>
        <h1 className="text-2xl font-bold text-white mt-6 mb-2">Create your account</h1>
        <p className="text-neutral-500 text-sm">Invitation for {invite.email}</p>
      </div>
      <div className="bg-bg-card border border-white/8 rounded-2xl p-8">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-neutral-400 text-sm mb-2">Full name</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input value={fullName} onChange={e => { setFullName(e.target.value); setError(''); }} className="w-full bg-bg border border-white/8 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors" placeholder="Your name" />
            </div>
          </div>
          <div>
            <label className="block text-neutral-400 text-sm mb-2">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input value={invite.email} readOnly className="w-full bg-bg border border-white/8 rounded-xl pl-10 pr-4 py-3 text-neutral-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-neutral-400 text-sm mb-2">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} className="w-full bg-bg border border-white/8 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors" placeholder="Min. 8 characters" />
            </div>
          </div>
          <div>
            <label className="block text-neutral-400 text-sm mb-2">Confirm password</label>
            <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(''); }} className="w-full bg-bg border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors" placeholder="Repeat password" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors">
            {saving ? 'Creating…' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />}>
      <RegisterForm />
    </Suspense>
  );
}
