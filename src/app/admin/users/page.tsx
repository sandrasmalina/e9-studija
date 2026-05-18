'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, RefreshCw, ChevronDown, ShieldCheck, User, GraduationCap } from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  email?: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin:      'bg-purple-900/50 text-purple-400',
  instructor: 'bg-blue-900/50 text-blue-400',
  student:    'bg-zinc-800 text-zinc-400',
};
const ROLE_ICONS: Record<string, React.ElementType> = {
  admin: ShieldCheck, instructor: GraduationCap, student: User,
};

const ROLES = ['all', 'student', 'instructor', 'admin'];

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('id,full_name,avatar_url,role,created_at').order('created_at', { ascending: false });
    setUsers((data ?? []) as UserProfile[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleRoleChange = async (id: string, role: string) => {
    setUpdating(id);
    await supabase.from('profiles').update({ role }).eq('id', id);
    setUsers(u => u.map(x => x.id === id ? { ...x, role } : x));
    setUpdating(null);
  };

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || (u.full_name ?? '').toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const counts = ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = r === 'all' ? users.length : users.filter(u => u.role === r).length;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Students & Users</h1>
          <p className="text-zinc-500 text-sm mt-1">{users.length} registered users</p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white transition-colors"><RefreshCw size={15} /></button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent/50" />
        </div>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {ROLES.map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${roleFilter === r ? 'bg-accent text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {r} {counts[r] > 0 && <span className="ml-0.5 opacity-70">({counts[r]})</span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-zinc-900/60 animate-pulse" />)}</div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-zinc-800 bg-zinc-900/60">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">User</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Role</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden md:table-cell">Joined</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Change Role</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.map(u => {
                const RoleIcon = ROLE_ICONS[u.role] ?? User;
                return (
                  <tr key={u.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                          {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={14} className="text-zinc-500" />}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{u.full_name || 'Unnamed User'}</p>
                          <p className="text-zinc-600 text-xs font-mono">{u.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${ROLE_COLORS[u.role] ?? 'bg-zinc-800 text-zinc-400'}`}>
                        <RoleIcon size={11} /> {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">
                      {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <div className="relative inline-block">
                          <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} disabled={updating === u.id}
                            className="appearance-none pr-7 pl-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-300 cursor-pointer focus:outline-none focus:border-accent/50 disabled:opacity-50">
                            {['student','instructor','admin'].map(r => <option key={r} value={r} className="bg-zinc-900 capitalize">{r}</option>)}
                          </select>
                          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500" />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-zinc-600 py-10 text-sm">No users found</p>}
        </div>
      )}
    </div>
  );
}
