'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, User } from 'lucide-react';

interface Invitation { email: string; roles: string[] | null; status: string; expires_at: string | null; is_campaign?: boolean; campaign_label?: string | null; }

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('invite');
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { router.replace('/courses'); return; }
    const supabase = createClient();
    supabase.from('invitations').select('*').eq('token', token).single()
      .then(({ data, error: inviteError }) => {
        if (inviteError || !data) {
          setInvite(null);
          setLoading(false);
          return;
        }
        const nextInvite = {
          ...data,
          is_campaign: data.is_campaign ?? false,
          campaign_label: data.campaign_label ?? null,
        } as Invitation;
        setInvite(nextInvite);
        if (!nextInvite.is_campaign) setEmail(nextInvite.email);
        setLoading(false);
      });
  }, [router, token]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invite || !token) return;
    if (!firstName.trim()) { setError('First name is required'); return; }
    if (!lastName.trim()) { setError('Surname is required'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Valid email is required'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setSaving(true); setError('');
    const supabase = createClient();
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: fullName, invite_token: token } },
    });
    setSaving(false);
    if (signUpError) { setError(signUpError.message); return; }
    setDone(true);
  };

  const accountRecoveryLinks = (
    <div className="mt-5 flex flex-col gap-2 text-sm">
      <Link href="/auth/login" className="text-accent hover:underline">Go to login</Link>
      <Link href="/auth/forgot-password" className="text-neutral-400 hover:text-accent">Reset password</Link>
    </div>
  );

  if (loading) return <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />;

  if (!invite) {
    return (
      <div className="w-full max-w-md bg-bg-card border border-white/8 rounded-2xl p-8 text-center">
        <h1 className="text-white text-2xl font-bold mb-2">Invitation not found</h1>
        <p className="text-neutral-500 text-sm">This invitation link is invalid, expired, or revoked. If you already started registration, try logging in or resetting your password.</p>
        {accountRecoveryLinks}
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-md bg-bg-card border border-white/8 rounded-2xl p-8 text-center">
        <h1 className="text-white text-2xl font-bold mb-2">Account created</h1>
        <p className="text-neutral-500 text-sm mb-6">You can now sign in with your email and password. If email confirmation is enabled, confirm your email first. If login fails, use password reset for the same email.</p>
        <Link href="/auth/login" className="inline-flex justify-center w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-colors">Go to login</Link>
        <Link href="/auth/forgot-password" className="mt-4 inline-flex text-sm text-neutral-400 hover:text-accent">Reset password</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 text-white font-bold text-xl"><span className="text-accent">E9</span> Studija</Link>
        <h1 className="text-2xl font-bold text-white mt-6 mb-2">Create your account</h1>
        <p className="text-neutral-500 text-sm">{invite.is_campaign ? (invite.campaign_label || 'Campaign invitation') : `Invitation for ${invite.email}`}</p>
      </div>
      <div className="bg-bg-card border border-white/8 rounded-2xl p-8">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-neutral-400 text-sm mb-2">First name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
                <input value={firstName} onChange={e => { setFirstName(e.target.value); setError(''); }} className="w-full bg-bg border border-white/8 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors" placeholder="Name" />
              </div>
            </div>
            <div>
              <label className="block text-neutral-400 text-sm mb-2">Surname</label>
              <input value={lastName} onChange={e => { setLastName(e.target.value); setError(''); }} className="w-full bg-bg border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors" placeholder="Surname" />
            </div>
          </div>
          <div>
            <label className="block text-neutral-400 text-sm mb-2">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input value={email} onChange={e => { setEmail(e.target.value); setError(''); }} readOnly={!invite.is_campaign} className={`w-full bg-bg border border-white/8 rounded-xl pl-10 pr-4 py-3 text-sm ${invite.is_campaign ? 'text-white placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none' : 'text-neutral-500'}`} placeholder="your@email.com" />
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
