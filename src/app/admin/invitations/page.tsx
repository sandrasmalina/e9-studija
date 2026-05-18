'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, RefreshCw, Copy, Check, Clock, X } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  status: string;
  token: string;
  expires_at: string;
  created_at: string;
  used_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-900/40 text-yellow-400',
  used:    'bg-green-900/40 text-green-400',
  expired: 'bg-zinc-800 text-zinc-500',
};

export default function AdminInvitations() {
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
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
    const { error } = await supabase.from('invitations').insert({ email: email.trim().toLowerCase(), token, expires_at: expires, status: 'pending' });
    if (error) { setErr(error.message); setSending(false); return; }
    setEmail('');
    setSending(false);
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
          <p className="text-zinc-500 text-sm mt-1">Invite users to register</p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white transition-colors"><RefreshCw size={15} /></button>
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
        {err && <p className="text-red-400 text-xs mt-2">{err}</p>}
        <p className="text-zinc-600 text-xs mt-2">Generates a unique registration link. Valid for 7 days.</p>
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
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Email</th>
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
                    <td className="px-4 py-3 text-white text-sm">{inv.email}</td>
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
