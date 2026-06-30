'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, RefreshCw, ShieldCheck, User, GraduationCap, PenLine } from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  roles: string[];
  created_at: string;
  email?: string;
}

interface RoleRecord { id: string; name: string; display_name: string; sort_order: number; }

const ROLE_COLORS: Record<string, string> = {
  admin:      'bg-purple-900/50 text-purple-400',
  instructor: 'bg-blue-900/50 text-blue-400',
  author:     'bg-amber-900/50 text-amber-400',
  student:    'bg-zinc-800 text-zinc-400',
};
const ROLE_ICONS: Record<string, React.ElementType> = {
  admin: ShieldCheck, instructor: GraduationCap, author: PenLine, student: User,
};

const FALLBACK_ROLES: RoleRecord[] = [
  { id: 'admin', name: 'admin', display_name: 'Admin', sort_order: 0 },
  { id: 'instructor', name: 'instructor', display_name: 'Teacher', sort_order: 1 },
  { id: 'author', name: 'author', display_name: 'Author', sort_order: 2 },
  { id: 'student', name: 'student', display_name: 'Student', sort_order: 3 },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>(FALLBACK_ROLES);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profileData }, { data: roleData }, { data: userRoleData }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,avatar_url,role,created_at').order('created_at', { ascending: false }),
      supabase.from('roles').select('id,name,display_name,sort_order').order('sort_order', { ascending: true }),
      supabase.from('user_roles').select('user_id,roles(name)'),
    ]);
    const nextRoles = (roleData && roleData.length > 0 ? roleData : FALLBACK_ROLES) as RoleRecord[];
    const roleMap = new Map<string, string[]>();
    (userRoleData ?? []).forEach((row: any) => {
      const roleName = row.roles?.name;
      if (!roleName) return;
      roleMap.set(row.user_id, [...(roleMap.get(row.user_id) ?? []), roleName]);
    });
    setRoles(nextRoles);
    setUsers((profileData ?? []).map((profile: any) => {
      const assigned = new Set<string>(roleMap.get(profile.id) ?? []);
      if (profile.role) assigned.add(profile.role);
      return { ...profile, roles: [...assigned] };
    }) as UserProfile[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const role = new URLSearchParams(window.location.search).get('role');
    if (role) setRoleFilter(role);
  }, []);

  const handleRoleToggle = async (user: UserProfile, roleName: string) => {
    setUpdating(user.id);
    const role = roles.find(r => r.name === roleName);
    if (!role) { setUpdating(null); return; }
    const hasRole = user.roles.includes(roleName);
    if (hasRole) {
      await supabase.from('user_roles').delete().eq('user_id', user.id).eq('role_id', role.id);
    } else {
      await supabase.from('user_roles').insert({ user_id: user.id, role_id: role.id });
    }
    const nextUserRoles = hasRole ? user.roles.filter(r => r !== roleName) : [...user.roles, roleName];
    const legacyRole = nextUserRoles.includes('admin') ? 'admin' : nextUserRoles.includes('instructor') ? 'instructor' : 'student';
    await supabase.from('profiles').update({ role: legacyRole }).eq('id', user.id);
    setUsers(current => current.map(item => item.id === user.id ? { ...item, role: legacyRole, roles: nextUserRoles } : item));
    setUpdating(null);
  };

  const filtered = users.filter(u => {
    const matchRole = roleFilter === 'all' || u.roles.includes(roleFilter);
    const q = search.toLowerCase();
    const matchSearch = !q || (u.full_name ?? '').toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const roleFilters = ['all', ...roles.map(role => role.name)];
  const counts = roleFilters.reduce<Record<string, number>>((acc, r) => {
    acc[r] = r === 'all' ? users.length : users.filter(u => u.roles.includes(r)).length;
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
          {roleFilters.map(r => (
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
                const primaryRole = u.roles.includes('admin') ? 'admin' : u.roles[0] ?? u.role;
                const RoleIcon = ROLE_ICONS[primaryRole] ?? User;
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
                      <div className="flex flex-wrap gap-1.5">
                        {u.roles.map(roleName => {
                          const Icon = ROLE_ICONS[roleName] ?? RoleIcon;
                          return (
                            <span key={roleName} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${ROLE_COLORS[roleName] ?? 'bg-zinc-800 text-zinc-400'}`}>
                              <Icon size={11} /> {roleName}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">
                      {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {roles.map(role => {
                          const checked = u.roles.includes(role.name);
                          return (
                            <button
                              key={role.name}
                              type="button"
                              onClick={() => handleRoleToggle(u, role.name)}
                              disabled={updating === u.id || (checked && u.roles.length === 1)}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] capitalize transition-colors disabled:opacity-40 ${checked ? 'border-accent/50 bg-accent/10 text-white' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                            >
                              {role.display_name}
                            </button>
                          );
                        })}
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
