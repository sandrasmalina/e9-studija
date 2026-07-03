'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronDown, ChevronUp, Clock, Mail, MessageCircle, Trash2 } from 'lucide-react';

interface SupportTicket {
  id: string;
  ticket_number: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

const STATUS_COLORS: Record<SupportTicket['status'], string> = {
  open: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  in_progress: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
  resolved: 'bg-green-500/15 text-green-300 border-green-500/20',
  closed: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

const PRIORITY_COLORS: Record<SupportTicket['priority'], string> = {
  low: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  normal: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  high: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
  urgent: 'bg-red-500/15 text-red-300 border-red-500/20',
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | SupportTicket['status']>('all');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('id, ticket_number, name, email, phone, subject, message, status, priority, created_at')
      .order('created_at', { ascending: false });
    setTickets((data ?? []) as SupportTicket[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateTicket = async (id: string, patch: Partial<Pick<SupportTicket, 'status' | 'priority'>>) => {
    const { error } = await supabase.from('support_tickets').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { alert(error.message); return; }
    setTickets(rows => rows.map(ticket => ticket.id === id ? { ...ticket, ...patch } : ticket));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this support ticket?')) return;
    const { error } = await supabase.from('support_tickets').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    setTickets(rows => rows.filter(ticket => ticket.id !== id));
  };

  const filtered = filter === 'all' ? tickets : tickets.filter(ticket => ticket.status === filter);
  const counts = {
    all: tickets.length,
    open: tickets.filter(ticket => ticket.status === 'open').length,
    in_progress: tickets.filter(ticket => ticket.status === 'in_progress').length,
    resolved: tickets.filter(ticket => ticket.status === 'resolved').length,
    closed: tickets.filter(ticket => ticket.status === 'closed').length,
  };

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
        <p className="text-zinc-500 text-sm mt-1">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(status => (
          <button key={status} type="button" onClick={() => setFilter(status)} className={`rounded-xl border px-3 py-2 text-xs font-medium capitalize transition-colors ${filter === status ? 'border-accent/40 bg-accent/15 text-white' : 'border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-900'}`}>
            {status.replace('_', ' ')} <span className="opacity-60">({counts[status]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 rounded-2xl border border-zinc-800">
          <MessageCircle size={32} className="mx-auto mb-3 opacity-30" />
          <p>No support tickets found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => (
            <div key={ticket.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 overflow-hidden">
              <div className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer hover:bg-zinc-900/30 transition-colors" onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}>
                <div className="min-w-0 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                    {ticket.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-white font-medium text-sm">{ticket.ticket_number}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_COLORS[ticket.status]}`}>{ticket.status.replace('_', ' ')}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-zinc-300">{ticket.subject}</p>
                    <p className="text-zinc-500 text-xs">{ticket.name} · {ticket.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden md:flex items-center gap-1.5 text-zinc-600 text-xs">
                    <Clock size={11} />
                    {new Date(ticket.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <button onClick={(event) => { event.stopPropagation(); handleDelete(ticket.id); }} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                  {expanded === ticket.id ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                </div>
              </div>

              {expanded === ticket.id && (
                <div className="border-t border-zinc-900 px-5 py-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs text-zinc-500">
                      Status
                      <select value={ticket.status} onChange={event => updateTicket(ticket.id, { status: event.target.value as SupportTicket['status'] })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-accent/50">
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </label>
                    <label className="text-xs text-zinc-500">
                      Priority
                      <select value={ticket.priority} onChange={event => updateTicket(ticket.id, { priority: event.target.value as SupportTicket['priority'] })} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-accent/50">
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </label>
                  </div>

                  {ticket.phone && <p className="text-xs text-zinc-500"><span className="text-zinc-400 font-medium">Phone:</span> {ticket.phone}</p>}
                  <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
                  <a href={`mailto:${ticket.email}?subject=Re: ${encodeURIComponent(ticket.ticket_number)} ${encodeURIComponent(ticket.subject)}`} className="inline-flex items-center gap-1.5 text-accent text-xs hover:underline">
                    <Mail size={11} /> Reply to {ticket.email}
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
