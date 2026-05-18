'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Mail, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface Submission {
  id: string;
  name: string;
  email: string;
  message: string;
  time_slot: string;
  created_at: string;
}

export default function AdminContacts() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('contact_submissions').select('*').order('created_at', { ascending: false });
    setSubmissions(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this submission?')) return;
    await supabase.from('contact_submissions').delete().eq('id', id);
    load();
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Contact Submissions</h1>
        <p className="text-zinc-500 text-sm mt-1">{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 rounded-2xl border border-zinc-800">
          <Mail size={32} className="mx-auto mb-3 opacity-30" />
          <p>No contact form submissions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-zinc-900/30 transition-colors"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                    {s.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{s.name}</p>
                    <p className="text-zinc-500 text-xs">{s.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex items-center gap-1.5 text-zinc-600 text-xs">
                    <Clock size={11} />
                    {new Date(s.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                    className="p-1.5 rounded-lg bg-zinc-800 text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                  {expanded === s.id ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                </div>
              </div>
              {expanded === s.id && (
                <div className="border-t border-zinc-900 px-5 py-4 space-y-3">
                  {s.time_slot && (
                    <p className="text-xs text-zinc-500">
                      <span className="text-zinc-400 font-medium">Requested time slot:</span> {s.time_slot}
                    </p>
                  )}
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{s.message}</p>
                  <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1.5 text-accent text-xs hover:underline">
                    <Mail size={11} /> Reply to {s.email}
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
