'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminNav from '@/components/AdminNav';
import { Moon, Sun, Menu } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/admin/dashboard':   'Dashboard',
  '/admin/publications': 'Publications',
  '/admin/publication-categories': 'Publication Categories',
  '/admin/projects':    'Projects',
  '/admin/team':        'Team Members',
  '/admin/contacts':    'Contacts',
  '/admin/support':     'Support Tickets',
  '/admin/social':      'Social Links',
  '/admin/testimonials':'Testimonials',
  '/admin/courses':     'Courses',
  '/admin/categories':  'Categories',
  '/admin/users':       'Students & Users',
  '/admin/instructors': 'Instructor Applications',
  '/admin/checkout-intents': 'Checkout Funnel',
  '/admin/invitations': 'Invitations',
  '/admin/settings':    'Platform Settings',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin';
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [panelTheme, setPanelTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    const saved = window.localStorage.getItem('e9-admin-theme');
    if (saved === 'light' || saved === 'dark') setPanelTheme(saved);
  }, []);

  const togglePanelTheme = () => {
    setPanelTheme(current => {
      const next = current === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('e9-admin-theme', next);
      return next;
    });
  };

  useEffect(() => {
    if (isLoginPage) { setChecking(false); return; }
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/admin'); return; }
      const [{ data: profile }, { data: assignedRoles }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', data.user.id).single(),
        supabase.from('user_roles').select('roles(name)').eq('user_id', data.user.id),
      ]);
      const roles = new Set<string>();
      if (profile?.role) roles.add(profile.role);
      (assignedRoles ?? []).forEach((row: any) => row.roles?.name && roles.add(row.roles.name));
      const canAccessPublications = pathname.startsWith('/admin/publications') && (roles.has('admin') || roles.has('author'));
      const canAccessDashboard = pathname.startsWith('/admin/dashboard') && (roles.has('admin') || roles.has('author'));
      const canAccessAdminOnly = roles.has('admin');
      if (!canAccessAdminOnly && !canAccessPublications && !canAccessDashboard) { router.replace('/dashboard'); return; }
      setEmail(data.user.email ?? '');
      setChecking(false);
    }).catch(() => { setChecking(false); });
  }, [isLoginPage, router]);

  if (!isLoginPage && checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090b' }}>
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoginPage) return <>{children}</>;

  const pageTitle = Object.entries(pageTitles).find(([key]) => pathname.startsWith(key))?.[1] ?? 'Admin';

  return (
    <div className={`admin-panel admin-theme-${panelTheme} min-h-screen lg:flex`} style={{ background: panelTheme === 'light' ? '#f6f4ef' : '#09090b' }}>
      <AdminNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-zinc-900 bg-zinc-950/60 backdrop-blur px-4 sm:px-8 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-white text-sm font-semibold truncate">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePanelTheme}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
              title={panelTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {panelTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {email && (
              <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/25 flex items-center justify-center text-accent text-xs font-semibold">
                {email.charAt(0).toUpperCase()}
              </div>
              <span className="text-zinc-500 text-xs hidden sm:block">{email}</span>
              </div>
            )}
          </div>
        </header>
        {/* Page content */}
        <main className="flex-1 p-5 sm:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
