'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutDashboard, FolderKanban, BookOpen, Users, Mail, Share2, LogOut, Home, ChevronRight, Quote, Tag, UserCheck, Send, Settings, GraduationCap, Layers, Newspaper, ChevronDown, PenLine, UserCircle, FileText, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DashboardLanguageSwitcher, DashboardSpaces } from '@/components/DashboardControls';
import { useLanguage } from '@/contexts/LanguageContext';

const navGroups = [
  {
    labelKey: 'admin.nav.webpage',
    items: [
      { href: '/admin/projects',  icon: FolderKanban,    labelKey: 'admin.nav.projects', roles: ['admin'] },
      { href: '/admin/project-categories', icon: Layers, labelKey: 'admin.nav.projectCategories', roles: ['admin'] },
      { href: '/admin/team',      icon: Users,           labelKey: 'admin.nav.team', roles: ['admin'] },
      { href: '/admin/testimonials', icon: Quote,        labelKey: 'admin.nav.testimonials', roles: ['admin'] },
    ],
  },
  {
    labelKey: 'admin.nav.publications',
    items: [
      { href: '/admin/publications', icon: Newspaper, labelKey: 'admin.nav.publications', roles: ['admin', 'author'] },
      { href: '/admin/publication-categories', icon: Tag, labelKey: 'admin.nav.categories', roles: ['admin'] },
      { href: '/admin/users?role=author', icon: PenLine, labelKey: 'admin.nav.authors', roles: ['admin'] },
    ],
  },
  {
    labelKey: 'admin.nav.courses',
    items: [
      { href: '/admin/courses',     icon: BookOpen,    labelKey: 'admin.nav.courses', roles: ['admin'] },
      { href: '/instructor/courses', icon: BookOpen,   labelKey: 'admin.nav.myCourses', roles: ['admin', 'instructor'] },
      { href: '/admin/categories',  icon: Tag,         labelKey: 'admin.nav.categories', roles: ['admin'] },
      { href: '/admin/users?role=student', icon: GraduationCap, labelKey: 'admin.nav.students', roles: ['admin'] },
      { href: '/admin/instructors', icon: UserCheck,   labelKey: 'admin.nav.instructorApps', roles: ['admin'] },
      { href: '/admin/settings', icon: Settings, labelKey: 'admin.nav.courseSettings', roles: ['admin'] },
    ],
  },
  {
    labelKey: 'admin.nav.platform',
    items: [
      { href: '/admin/users', icon: Users, labelKey: 'admin.nav.users', roles: ['admin'] },
      { href: '/admin/invitations', icon: Send, labelKey: 'admin.nav.invitations', roles: ['admin'] },
      { href: '/admin/contacts', icon: Mail,     labelKey: 'admin.nav.contacts', roles: ['admin'] },
      { href: '/admin/support', icon: MessageCircle, labelKey: 'admin.nav.support', roles: ['admin'] },
      { href: '/admin/social',   icon: Share2,   labelKey: 'admin.nav.social', roles: ['admin'] },
      { href: '/admin/legal',    icon: FileText, labelKey: 'admin.nav.legal', roles: ['admin'] },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
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
  const isCourseEditor = pathname === '/admin/courses/new' || /^\/admin\/courses\/[^/]+\/edit$/.test(pathname);
  const isAuthorWorkspace = pathname.startsWith('/admin/publications') || pathname.startsWith('/admin/publication-categories') || (pathname === '/admin/users' && searchParams.get('role') === 'author');
  const workspaceGroups = isAuthorWorkspace ? navGroups.filter(group => group.labelKey === 'admin.nav.publications') : navGroups.filter(group => group.labelKey !== 'admin.nav.publications');
  const currentWorkspace = isAuthorWorkspace
    ? { href: '/admin/publications', icon: Newspaper, labelKey: 'dashboard.space.author' }
    : { href: '/admin/dashboard', icon: LayoutDashboard, labelKey: 'dashboard.space.admin' };
  const CurrentWorkspaceIcon = currentWorkspace.icon;

  React.useEffect(() => {
    const next: Record<string, boolean> = {};
    workspaceGroups.forEach(group => {
      next[group.labelKey] = group.items.some(item => itemIsActive(item.href));
    });
    setOpenGroups(next);
  }, [pathname, isAuthorWorkspace]);

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
            <p className="text-zinc-500 text-xs">{t('admin.nav.panel')}</p>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
        {canSee(['admin', 'author']) && (
          <Link
            href={currentWorkspace.href}
            className={`mb-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative ${
              pathname === currentWorkspace.href
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            {pathname === currentWorkspace.href && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />}
            <CurrentWorkspaceIcon size={16} className={pathname === currentWorkspace.href ? 'text-accent' : 'text-zinc-500 group-hover:text-zinc-300 transition-colors'} />
            <span className="flex-1">{t(currentWorkspace.labelKey)}</span>
            {pathname === currentWorkspace.href && <ChevronRight size={12} className="text-accent/50" />}
          </Link>
        )}
        {workspaceGroups.map((group) => {
          const visibleItems = group.items.filter(item => canSee(item.roles));
          if (visibleItems.length === 0) return null;
          const isOpen = openGroups[group.labelKey] ?? true;
          return (
          <div key={group.labelKey}>
            <button
              type="button"
              onClick={() => setOpenGroups(current => ({ ...current, [group.labelKey]: !isOpen }))}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-zinc-600 hover:bg-zinc-900/70 hover:text-zinc-400 transition-colors"
            >
              <span>{t(group.labelKey)}</span>
              <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="mt-1 space-y-1">
              {visibleItems.map(({ href, icon: Icon, labelKey, comingSoon }: { href: string; icon: React.ElementType; labelKey: string; comingSoon?: boolean; roles?: string[] }) => {
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
                    <span className="flex-1">{t(labelKey)}</span>
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
        {!isCourseEditor && <DashboardSpaces />}
      </nav>

      {/* Footer actions */}
      <div className="px-3 py-4 border-t border-zinc-900 space-y-1 shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all group"
        >
          <LogOut size={16} className="group-hover:text-red-400 transition-colors" />
          {t('admin.nav.logout')}
        </button>
        <Link
          href="/profile"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all group"
        >
          <UserCircle size={16} className="group-hover:text-zinc-300 transition-colors" />
          {t('admin.nav.profile')}
        </Link>
        <button
          onClick={handleViewSite}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all group"
        >
          <Home size={16} className="group-hover:text-zinc-300 transition-colors" />
          {t('admin.nav.exit')}
        </button>
        <DashboardLanguageSwitcher />
      </div>
    </aside>
  );
}
