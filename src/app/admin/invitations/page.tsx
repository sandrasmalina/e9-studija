'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, RefreshCw, Copy, Check, Clock, X } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  roles: string[] | null;
  is_campaign: boolean;
  campaign_label: string | null;
  max_uses: number | null;
  use_count: number;
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

const AVAILABLE_ROLES = ['student', 'instructor', 'author', 'admin'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900/40 text-yellow-400',
  used:    'bg-green-900/40 text-green-400',
  expired: 'bg-zinc-800 text-zinc-500',
};

export default function AdminInvitations() {
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['student']);
  const [sending, setSending] = useState(false);
  const [campaignSending, setCampaignSending] = useState(false);
  const [campaignRole, setCampaignRole] = useState<'instructor' | 'author'>('instructor');
  const [campaignLabel, setCampaignLabel] = useState('Teacher campaign link');
  const [campaignMaxUses, setCampaignMaxUses] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('invitations').select('*').order('created_at', { ascending: false });
    setInvites((data ?? []) as Invitation[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSend = async () => {
    if (!email.trim() || !email.includes('@')) { setErr('Enter a valid email address'); return; }
    setSending(true); setErr('');
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const roles = selectedRoles.length > 0 ? selectedRoles : ['student'];
    const { error } = await supabase.from('invitations').insert({
      email: email.trim().toLowerCase(),
      token,
      expires_at: expires,
      status: 'pending',
      roles,
      role: roles.includes('admin') ? 'admin' : roles.includes('instructor') ? 'instructor' : 'student',
    });
    if (error) { setErr(error.message); setSending(false); return; }
    setEmail('');
    setSelectedRoles(['student']);
    setSending(false);
    load();
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(current => {
      if (current.includes(role)) return current.length === 1 ? current : current.filter(item => item !== role);
      return [...current, role];
    });
  };

  const handleCreateCampaign = async () => {
    setCampaignSending(true); setErr('');
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const roles = [campaignRole];
    const maxUses = campaignMaxUses.trim() ? Number(campaignMaxUses) : null;
    if (maxUses !== null && (!Number.isFinite(maxUses) || maxUses < 1)) {
      setErr('Max uses must be empty or a positive number.');
      setCampaignSending(false);
      return;
    }
    const { error } = await supabase.from('invitations').insert({
      email: `${campaignRole}-campaign@e9studija.local`,
      token,
      expires_at: expires,
      status: 'pending',
      role: campaignRole === 'instructor' ? 'instructor' : 'student',
      roles,
      is_campaign: true,
      campaign_label: campaignLabel.trim() || `${campaignRole === 'instructor' ? 'Teacher' : 'Author'} campaign link`,
      max_uses: maxUses,
      use_count: 0,
    });
    setCampaignSending(false);
    if (error) { setErr(error.message); return; }
    load();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/auth/register?invite=${token}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(token); setTimeout(() => setCopied(null), 2000); });
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this invitation?')) return;
    await supabase.from('invitations').delete().eq('id', id);
    setInvites(i => i.filter(x => x.id !== id));
  };

  const getStatus = (inv: Invitation) => {
    if (inv.status === 'used') return 'used';
    if (new Date(inv.expires_at) < new Date()) return 'expired';
    return 'pending';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Invitations</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage individual invitations and campaign registration links</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white transition-colors"><RefreshCw size={15} /></button>
        </div>
      </div>

      {/* Send new invite */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 mb-8">
        <h2 className="text-white font-medium mb-4">Send New Invitation</h2>
        <div className="flex gap-3">
          <input value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} type="email" placeholder="student@example.com"
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="flex-1 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent/50" />
          <button onClick={handleSend} disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors whitespace-nowrap">
            <Send size={15} /> {sending ? 'Creating…' : 'Create Invite'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {AVAILABLE_ROLES.map(role => {
            const checked = selectedRoles.includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                className={`px-3 py-1.5 rounded-lg border text-xs capitalize transition-colors ${checked ? 'border-accent/50 bg-accent/10 text-white' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
              >
                {role === 'instructor' ? 'Teacher' : role}
              </button>
            );
          })}
        </div>
        {err && <p className="text-red-400 text-xs mt-2">{err}</p>}
        <p className="text-zinc-600 text-xs mt-2">Generates a unique registration link. Valid for 7 days and retryable by the same email until it expires or is revoked.</p>
      </div>

      <div className="rounded-2xl border border-blue-900/40 bg-blue-950/20 p-5 mb-8">
        <h2 className="text-white font-medium mb-4">Reusable Campaign Invitation</h2>
        <div className="grid gap-3 md:grid-cols-[160px_1fr_140px_auto]">
          <select value={campaignRole} onChange={event => {
            const nextRole = event.target.value as 'instructor' | 'author';
            setCampaignRole(nextRole);
            setCampaignLabel(`${nextRole === 'instructor' ? 'Teacher' : 'Author'} campaign link`);
            setErr('');
          }} className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50">
            <option value="instructor">Teachers</option>
            <option value="author">Authors</option>
          </select>
          <input value={campaignLabel} onChange={event => { setCampaignLabel(event.target.value); setErr(''); }} placeholder="Campaign label"
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50" />
          <input value={campaignMaxUses} onChange={event => { setCampaignMaxUses(event.target.value); setErr(''); }} type="number" min="1" placeholder="No limit"
            className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50" />
          <button onClick={handleCreateCampaign} disabled={campaignSending}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap">
            <Send size={15} /> {campaignSending ? 'Creating…' : 'Create Campaign'}
          </button>
        </div>
        <p className="text-blue-200/60 text-xs mt-2">Creates one reusable registration link for all selected teachers or authors. Valid for 90 days.</p>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-zinc-900/60 animate-pulse" />)}</div>
      ) : invites.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <Clock size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No invitations sent yet</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-zinc-800 bg-zinc-900/60">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Invite</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden md:table-cell">Roles</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden md:table-cell">Expires</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden lg:table-cell">Sent</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-800/60">
              {invites.map(inv => {
                const status = getStatus(inv);
                return (
                  <tr key={inv.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{inv.is_campaign ? (inv.campaign_label || 'Campaign link') : inv.email}</p>
                      <p className="text-zinc-600 text-xs">
                        {inv.is_campaign
                          ? `${inv.use_count} use${inv.use_count === 1 ? '' : 's'}${inv.max_uses ? ` / ${inv.max_uses}` : ''}`
                          : inv.use_count > 0 ? 'Registration started' : 'Not used yet'}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1.5">
                        {(inv.roles && inv.roles.length > 0 ? inv.roles : ['student']).map(role => (
                          <span key={role} className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[11px] capitalize">{role === 'instructor' ? 'Teacher' : role}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${STATUS_COLORS[status]}`}>{status}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">
                      {new Date(inv.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell">
                      {new Date(inv.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {status === 'pending' && (
                          <button onClick={() => copyLink(inv.token)} title="Copy invite link"
                            className="p-1.5 rounded-lg text-zinc-600 hover:text-accent hover:bg-accent/10 transition-all">
                            {copied === inv.token ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                          </button>
                        )}
                        {status !== 'used' && (
                          <button onClick={() => handleRevoke(inv.id)} title="Revoke" className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-900/20 transition-all"><X size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
