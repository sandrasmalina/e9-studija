'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Check, X, ExternalLink, Clock, User } from 'lucide-react';

interface Application {
  id: string;
  motivation: string | null;
  expertise: string | null;
  portfolio_url: string | null;
  status: string;
  reject_reason: string | null;
  created_at: string;
  user: { full_name: string | null; avatar_url: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-yellow-900/40 text-yellow-400',
  approved: 'bg-green-900/40 text-green-400',
  rejected: 'bg-red-900/40 text-red-400',
};

export default function AdminInstructors() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id?: string }>({ open: false });
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('instructor_applications')
      .select('id,motivation,expertise,portfolio_url,status,reject_reason,created_at,user:profiles!instructor_applications_user_id_fkey(full_name,avatar_url)')
      .order('created_at', { ascending: false });
    setApps((data ?? []) as unknown as Application[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleApprove = async (app: Application) => {
    if (!confirm('Approve and grant instructor role?')) return;
    setProcessing(app.id);
    await supabase.from('instructor_applications').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', app.id);
    await supabase.from('profiles').update({ role: 'instructor' }).eq('id', (app as any).user_id);
    setApps(a => a.map(x => x.id === app.id ? { ...x, status: 'approved' } : x));
    setProcessing(null);
  };

  const handleReject = async () => {
    if (!rejectModal.id) return;
    setProcessing(rejectModal.id);
    await supabase.from('instructor_applications').update({ status: 'rejected', reject_reason: rejectReason, reviewed_at: new Date().toISOString() }).eq('id', rejectModal.id);
    setApps(a => a.map(x => x.id === rejectModal.id ? { ...x, status: 'rejected', reject_reason: rejectReason } : x));
    setProcessing(null);
    setRejectModal({ open: false });
    setRejectReason('');
  };

  const filtered = apps.filter(a => filter === 'all' || a.status === filter);
  const counts = { all: apps.length, pending: apps.filter(a => a.status === 'pending').length, approved: apps.filter(a => a.status === 'approved').length, rejected: apps.filter(a => a.status === 'rejected').length };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Instructor Applications</h1>
          <p className="text-zinc-500 text-sm mt-1">{counts.pending} pending review</p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white transition-colors"><RefreshCw size={15} /></button>
      </div>

      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit mb-6">
        {(['all','pending','approved','rejected'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${filter === s ? 'bg-accent text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-zinc-900/60 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <Clock size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No {filter === 'all' ? '' : filter} applications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(app => (
            <div key={app.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                    {app.user?.avatar_url ? <img src={app.user.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={16} className="text-zinc-500" />}
                  </div>
                  <div>
                    <p className="text-white font-medium">{app.user?.full_name ?? 'Unknown'}</p>
                    <p className="text-zinc-500 text-xs">{new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${STATUS_COLORS[app.status]}`}>{app.status}</span>
              </div>

              <div className="mt-4 grid md:grid-cols-2 gap-4">
                {app.motivation && (
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5">Motivation</p>
                    <p className="text-zinc-300 text-sm leading-relaxed">{app.motivation}</p>
                  </div>
                )}
                {app.expertise && (
                  <div>
                    <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5">Expertise</p>
                    <p className="text-zinc-300 text-sm leading-relaxed">{app.expertise}</p>
                  </div>
                )}
              </div>

              {app.portfolio_url && (
                <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-accent text-xs hover:underline">
                  <ExternalLink size={12} /> Portfolio / Website
                </a>
              )}

              {app.reject_reason && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-red-900/20 border border-red-900/30">
                  <p className="text-red-400 text-xs"><span className="font-medium">Rejection reason:</span> {app.reject_reason}</p>
                </div>
              )}

              {app.status === 'pending' && (
                <div className="flex gap-3 mt-5 pt-5 border-t border-zinc-800">
                  <button onClick={() => handleApprove(app)} disabled={processing === app.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-900/40 border border-green-900/60 text-green-400 text-sm font-medium hover:bg-green-900/60 disabled:opacity-50 transition-all">
                    <Check size={14} /> Approve
                  </button>
                  <button onClick={() => { setRejectModal({ open: true, id: app.id }); setRejectReason(''); }} disabled={processing === app.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-900/30 border border-red-900/50 text-red-400 text-sm font-medium hover:bg-red-900/50 disabled:opacity-50 transition-all">
                    <X size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-white font-semibold text-lg mb-4">Reject Application</h2>
            <label className="text-xs text-zinc-500 mb-1.5 block">Reason (optional — visible to applicant)</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm resize-none focus:outline-none focus:border-accent/50 mb-5"
              placeholder="Not enough experience, try again in 6 months…" />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal({ open: false })} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={handleReject} disabled={!!processing} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
