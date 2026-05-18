'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Upload, Eye, EyeOff } from 'lucide-react';

interface Profile {
  full_name: string;
  bio: string;
  avatar_url: string | null;
}

export default function DashboardSettingsPage() {
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<Profile>({ full_name: '', bio: '', avatar_url: null });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  // Avatar upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? '');
      const { data } = await supabase.from('profiles').select('full_name, bio, avatar_url').eq('id', user.id).single();
      if (data) setProfile({ full_name: data.full_name ?? '', bio: data.bio ?? '', avatar_url: data.avatar_url ?? null });
      setLoading(false);
    })();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true); setErrMsg(''); setSavedMsg('');
    const { error } = await supabase.from('profiles').update({ full_name: profile.full_name, bio: profile.bio }).eq('id', userId);
    setSaving(false);
    if (error) { setErrMsg(error.message); return; }
    setSavedMsg('Profile saved!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { setErrMsg(upErr.message); setUploading(false); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = data.publicUrl;
    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
    setProfile(p => ({ ...p, avatar_url: avatarUrl }));
    setUploading(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { setPwErr('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setPwErr('Passwords do not match'); return; }
    setPwSaving(true); setPwErr(''); setPwMsg('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) { setPwErr(error.message); return; }
    setPwMsg('Password updated!');
    setNewPassword(''); setConfirmPassword('');
    setTimeout(() => setPwMsg(''), 3000);
  };

  const initials = profile.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'S';

  if (loading) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>;
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Account Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">Update your profile and preferences</p>
      </div>

      {/* Profile section */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
        <h2 className="text-white font-semibold">Profile</h2>

        {/* Avatar */}
        <div className="flex items-center gap-5">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/25 flex items-center justify-center text-purple-400 text-xl font-bold">
              {initials}
            </div>
          )}
          <div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] text-white text-sm hover:bg-white/[0.04] transition-colors disabled:opacity-50">
              <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload Photo'}
            </button>
            <p className="text-zinc-600 text-xs mt-1.5">JPG, PNG or WebP · Max 2MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
        </div>

        {/* Full name */}
        <div>
          <label className="block text-white text-sm font-medium mb-1.5">Full Name</label>
          <input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
            className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600"
            placeholder="Your name" />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-white text-sm font-medium mb-1.5">Email</label>
          <input value={email} readOnly
            className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.06] rounded-xl text-zinc-500 text-sm cursor-not-allowed" />
          <p className="text-zinc-600 text-xs mt-1">Email cannot be changed here</p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-white text-sm font-medium mb-1.5">Bio <span className="text-zinc-600 font-normal">(optional)</span></label>
          <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} rows={3}
            placeholder="Tell us a bit about yourself…"
            className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600 resize-none" />
        </div>

        {errMsg && <p className="text-red-400 text-sm">{errMsg}</p>}

        <div className="flex items-center gap-4">
          <button onClick={handleSaveProfile} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Profile'}
          </button>
          {savedMsg && <span className="text-green-400 text-sm">✓ {savedMsg}</span>}
        </div>
      </div>

      {/* Password section */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5">
        <h2 className="text-white font-semibold">Change Password</h2>

        <div>
          <label className="block text-white text-sm font-medium mb-1.5">New Password</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full px-4 py-2.5 pr-10 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-white text-sm font-medium mb-1.5">Confirm New Password</label>
          <input type={showPw ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
            className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
        </div>

        {pwErr && <p className="text-red-400 text-sm">{pwErr}</p>}

        <div className="flex items-center gap-4">
          <button onClick={handleChangePassword} disabled={pwSaving || !newPassword}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors">
            <Save size={14} /> {pwSaving ? 'Updating…' : 'Update Password'}
          </button>
          {pwMsg && <span className="text-green-400 text-sm">✓ {pwMsg}</span>}
        </div>
      </div>
    </div>
  );
}
