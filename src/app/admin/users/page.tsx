'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Search, RefreshCw, ShieldCheck, User, Users as UsersIcon, GraduationCap, PenLine, Plus, X, CreditCard, Percent, Trash2, AlertTriangle } from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  roles: string[];
  stripe_account_id: string | null;
  platform_fee_pct: number | null;
  revenue_share_pct: number | null;
  created_at: string;
  email?: string;
}

interface RoleRecord { id: string; name: string; display_name: string; sort_order: number; }

interface StripeConnectStatus {
  connected: boolean;
  hasAccount: boolean;
  mode?: 'test' | 'live';
}

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [payoutDrafts, setPayoutDrafts] = useState<Record<string, string>>({});
  const [stripeStatuses, setStripeStatuses] = useState<Record<string, StripeConnectStatus>>({});
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) setCurrentUserId(session.user.id);
    const [{ data: profileData }, { data: roleData }, { data: userRoleData }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,avatar_url,role,stripe_account_id,revenue_share_pct,created_at').order('created_at', { ascending: false }),
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
    const mappedUsers = (profileData ?? []).map((profile: any) => {
      const assigned = new Set<string>(roleMap.get(profile.id) ?? []);
      if (profile.role) assigned.add(profile.role);
      const platformFee = 100 - (profile.revenue_share_pct ?? 70);
      return { ...profile, platform_fee_pct: platformFee, roles: [...assigned] };
    }) as UserProfile[];
    setUsers(mappedUsers);
    const drafts: Record<string, string> = {};
    (profileData ?? []).forEach((profile: any) => { drafts[profile.id] = String(profile.revenue_share_pct ?? 70); });
    setPayoutDrafts(drafts);
    if (session?.access_token) {
      const instructors = mappedUsers.filter(user => user.roles.includes('instructor') && !user.roles.includes('admin'));
      const statuses = await Promise.all(instructors.map(async user => {
        if (!user.stripe_account_id) return [user.id, { connected: false, hasAccount: false }] as const;
        try {
          const response = await fetch(`/api/stripe/connect/status?userId=${user.id}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
          if (!response.ok) return [user.id, { connected: false, hasAccount: true }] as const;
          return [user.id, await response.json()] as const;
        } catch {
          return [user.id, { connected: false, hasAccount: true }] as const;
        }
      }));
      setStripeStatuses(Object.fromEntries(statuses));
    }
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

  const handlePayoutSave = async (user: UserProfile) => {
    const rawShare = Number(payoutDrafts[user.id]);
    if (!Number.isFinite(rawShare) || rawShare < 0 || rawShare > 100) return;
    setUpdating(user.id);
    const revenueShare = Math.round(rawShare);
    const platformFee = 100 - revenueShare;
    const { error } = await supabase.from('profiles').update({ platform_fee_pct: platformFee, revenue_share_pct: revenueShare }).eq('id', user.id);
    if (!error) {
      setUsers(current => current.map(item => item.id === user.id ? { ...item, platform_fee_pct: platformFee, revenue_share_pct: revenueShare } : item));
    }
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

  const roleLabel = (roleName: string) => {
    if (roleName === 'all') return 'All Users';
    return roles.find(role => role.name === roleName)?.display_name ?? roleName;
  };

  const openDeleteModal = (user: UserProfile) => {
    setDeleteTarget(user);
    setDeleteConfirmId('');
    setDeleteError('');
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget || deleteConfirmId.trim() !== deleteTarget.id) return;
    setUpdating(deleteTarget.id);
    setDeleteError('');
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/users/${deleteTarget.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setDeleteError(data.error ?? 'Could not delete user account.');
      setUpdating(null);
      return;
    }
    setUsers(current => current.filter(user => user.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleteConfirmId('');
    setUpdating(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Users</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage admins, authors, teachers, and students.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white transition-colors"><RefreshCw size={15} /></button>
          <Link href="/admin/invitations" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"><Plus size={15} /> Add User</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {roleFilters.map(roleName => {
          const Icon = roleName === 'all' ? UsersIcon : ROLE_ICONS[roleName] ?? User;
          return (
            <button
              key={roleName}
              type="button"
              onClick={() => setRoleFilter(roleName)}
              className={`rounded-2xl border p-4 text-left transition-all ${roleFilter === roleName ? 'border-accent/50 bg-accent/10' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <Icon size={16} className={roleFilter === roleName ? 'text-accent' : 'text-zinc-500'} />
                <span className="text-xl font-bold text-white">{counts[roleName] ?? 0}</span>
              </div>
              <p className="mt-2 text-xs font-medium text-zinc-400">{roleLabel(roleName)}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent/50" />
        </div>
        <div className="flex flex-wrap gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {roleFilters.map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${roleFilter === r ? 'bg-accent text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {roleLabel(r)} {counts[r] > 0 && <span className="ml-0.5 opacity-70">({counts[r]})</span>}
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
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Manage</th>
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
                          <Link href={`/admin/users/${u.id}`} className="mt-1 inline-flex text-[11px] text-purple-400 hover:text-purple-300">Open profile</Link>
                          {u.roles.includes('admin') ? (
                            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-400">
                              <CreditCard size={11} /> Platform payments · 100%
                            </p>
                          ) : u.roles.includes('instructor') && (
                            <p className={`mt-1 inline-flex items-center gap-1 text-[11px] ${stripeStatuses[u.id]?.connected ? 'text-emerald-400' : 'text-red-400'}`}>
                              <CreditCard size={11} /> {stripeStatuses[u.id]?.connected ? 'Stripe connected' : stripeStatuses[u.id]?.hasAccount ? 'Stripe incomplete' : 'Stripe not connected'}{stripeStatuses[u.id]?.mode === 'test' ? ' · test' : ''}
                            </p>
                          )}
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
                      {u.roles.includes('instructor') && !u.roles.includes('admin') && (
                        <div className="mt-2 flex items-center justify-end gap-1.5">
                          <span className="text-[11px] text-zinc-500">Teacher share</span>
                          <div className="relative w-24">
                            <Percent size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
                            <input
                              value={payoutDrafts[u.id] ?? ''}
                              onChange={event => setPayoutDrafts(current => ({ ...current, [u.id]: event.target.value }))}
                              type="number"
                              min="0"
                              max="100"
                              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-1 pl-7 pr-2 text-xs text-white focus:border-accent/50 focus:outline-none"
                              title="Instructor revenue share % (0 = platform keeps all, 40 = platform keeps 60%)"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePayoutSave(u)}
                            disabled={updating === u.id}
                            className="rounded-lg border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-white disabled:opacity-40"
                          >
                            Save fee
                          </button>
                        </div>
                      )}
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => openDeleteModal(u)}
                          disabled={updating === u.id || u.id === currentUserId}
                          title={u.id === currentUserId ? 'Cannot delete your own account' : undefined}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-900/50 px-2.5 py-1 text-[11px] text-red-400 hover:border-red-700 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={11} /> Delete account
                        </button>
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-red-900/50 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-red-900/30 px-6 py-4">
              <h2 className="flex items-center gap-2 font-semibold text-white"><AlertTriangle size={18} className="text-red-400" /> Delete account</h2>
              <button onClick={() => setDeleteTarget(null)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm leading-relaxed text-zinc-400">
                This permanently deletes the Supabase auth account and profile for <span className="text-white">{deleteTarget.full_name || 'Unnamed User'}</span>. Course enrollments, roles, wishlist items, and other user-owned records will also be removed by database relations.
              </p>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                <p className="text-xs uppercase tracking-wider text-zinc-600">Type this exact user ID to confirm</p>
                <p className="mt-1 break-all font-mono text-sm text-white">{deleteTarget.id}</p>
              </div>
              <input
                value={deleteConfirmId}
                onChange={event => { setDeleteConfirmId(event.target.value); setDeleteError(''); }}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 font-mono text-sm text-white placeholder-zinc-600 focus:border-red-500/60 focus:outline-none"
                placeholder="Paste user ID here"
              />
              {deleteError && <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-400">{deleteError}</p>}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={deleteConfirmId.trim() !== deleteTarget.id || updating === deleteTarget.id}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-40"
                >
                  <Trash2 size={14} /> {updating === deleteTarget.id ? 'Deleting...' : 'Delete account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
