'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FolderKanban, BookOpen, Users, Mail, Share2, LogOut, Home, ChevronRight, Quote, Tag, UserCheck, Send, Settings, GraduationCap, Layers, Newspaper, ChevronDown, PenLine, UserCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const navGroups = [
  {
    label: 'Dashboard',
    items: [
      { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'author'] },
    ],
  },
  {
    label: 'Webpage',
    items: [
      { href: '/admin/projects',  icon: FolderKanban,    label: 'Projects', roles: ['admin'] },
      { href: '/admin/project-categories', icon: Layers, label: 'Project Categories', roles: ['admin'] },
      { href: '/admin/team',      icon: Users,           label: 'Team Members', roles: ['admin'] },
      { href: '/admin/testimonials', icon: Quote,        label: 'Testimonials', roles: ['admin'] },
    ],
  },
  {
    label: 'Publications',
    items: [
      { href: '/admin/publications', icon: Newspaper, label: 'Publications', roles: ['admin', 'author'] },
      { href: '/admin/publication-categories', icon: Tag, label: 'Categories', roles: ['admin'] },
      { href: '/admin/users?role=author', icon: PenLine, label: 'Authors', roles: ['admin'] },
    ],
  },
  {
    label: 'Courses',
    items: [
      { href: '/admin/courses',     icon: BookOpen,    label: 'Courses', roles: ['admin'] },
      { href: '/instructor/courses', icon: BookOpen,   label: 'My Courses', roles: ['admin', 'instructor'] },
      { href: '/admin/categories',  icon: Tag,         label: 'Categories', roles: ['admin'] },
      { href: '/admin/users?role=student', icon: GraduationCap, label: 'Students', roles: ['admin'] },
      { href: '/admin/instructors', icon: UserCheck,   label: 'Instructor Apps', roles: ['admin'] },
      { href: '/admin/settings', icon: Settings, label: 'Course Settings', roles: ['admin'] },
    ],
  },
  {
    label: 'Platform Management',
    items: [
      { href: '/admin/users', icon: Users, label: 'All Platform Users', roles: ['admin'] },
      { href: '/admin/invitations', icon: Send, label: 'Invitations', roles: ['admin'] },
      { href: '/admin/contacts', icon: Mail,     label: 'Contacts', roles: ['admin'] },
      { href: '/admin/social',   icon: Share2,   label: 'Social Links', roles: ['admin'] },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [roles, setRoles] = React.useState<string[]>([]);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const [{ data: profile }, { data: assignedRoles }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', data.user.id).single(),
        supabase.from('user_roles').select('roles(name)').eq('user_id', data.user.id),
      ]);
      const roleNames = new Set<string>();
      if (profile?.role) roleNames.add(profile.role);
      (assignedRoles ?? []).forEach((row: any) => row.roles?.name && roleNames.add(row.roles.name));
      setRoles([...roleNames]);
    });
  }, []);

  const canSee = (itemRoles?: string[]) => !itemRoles || itemRoles.some(role => roles.includes(role));
  const itemIsActive = (href: string) => pathname === href.split('?')[0] || (href !== '/admin/dashboard' && pathname.startsWith(href.split('?')[0]));

  React.useEffect(() => {
    const next: Record<string, boolean> = {};
    navGroups.forEach(group => {
      next[group.label] = group.items.some(item => itemIsActive(item.href));
    });
    setOpenGroups(next);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  const handleViewSite = () => {
    router.push('/');
  };

  return (
    <aside className="w-64 min-h-screen bg-zinc-950 border-r border-zinc-900 flex flex-col shrink-0">

      {/* Brand */}
      <div className="px-6 py-6 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold text-sm">
            E9
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">E9 Studija</p>
            <p className="text-zinc-500 text-xs">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(item => canSee(item.roles));
          if (visibleItems.length === 0) return null;
          const isOpen = openGroups[group.label] ?? true;
          return (
          <div key={group.label}>
            <button
              type="button"
              onClick={() => setOpenGroups(current => ({ ...current, [group.label]: !isOpen }))}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-600 hover:bg-zinc-900/70 hover:text-zinc-400 transition-colors"
            >
              <span>{group.label}</span>
              <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="mt-1 space-y-1">
              {visibleItems.map(({ href, icon: Icon, label, comingSoon }: { href: string; icon: React.ElementType; label: string; comingSoon?: boolean; roles?: string[] }) => {
                const active = itemIsActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative ${
                      active
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />
                    )}
                    <Icon size={16} className={active ? 'text-accent' : 'text-zinc-500 group-hover:text-zinc-300 transition-colors'} />
                    <span className="flex-1">{label}</span>
                    {comingSoon
                      ? <span className="text-[9px] bg-zinc-900 text-zinc-600 px-1.5 py-0.5 rounded-md border border-zinc-800">Soon</span>
                      : active && <ChevronRight size={12} className="text-accent/50" />
                    }
                  </Link>
                );
              })}
            </div>}
          </div>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className="px-3 py-4 border-t border-zinc-900 space-y-1">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all group"
        >
          <UserCircle size={16} className="group-hover:text-zinc-300 transition-colors" />
          My Profile
        </Link>
        <button
          onClick={handleViewSite}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all group"
        >
          <Home size={16} className="group-hover:text-zinc-300 transition-colors" />
          Exit to Site
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all group"
        >
          <LogOut size={16} className="group-hover:text-red-400 transition-colors" />
          Logout
        </button>
      </div>
    </aside>
  );
}
