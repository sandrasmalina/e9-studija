'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminNav from '@/components/AdminNav';

const pageTitles: Record<string, string> = {
  '/admin/dashboard':   'Dashboard',
  '/admin/projects':    'Projects',
  '/admin/team':        'Team Members',
  '/admin/contacts':    'Contacts',
  '/admin/social':      'Social Links',
  '/admin/testimonials':'Testimonials',
  '/admin/courses':     'Courses',
  '/admin/categories':  'Categories',
  '/admin/users':       'Students & Users',
  '/admin/instructors': 'Instructor Applications',
  '/admin/invitations': 'Invitations',
  '/admin/settings':    'Platform Settings',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin';
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (isLoginPage) { setChecking(false); return; }
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/admin'); return; }
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
    <div className="min-h-screen flex" style={{ background: '#09090b' }}>
      <AdminNav />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-zinc-900 bg-zinc-950/60 backdrop-blur px-8 flex items-center justify-between shrink-0">
          <h1 className="text-white text-sm font-semibold">{pageTitle}</h1>
          {email && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/25 flex items-center justify-center text-accent text-xs font-semibold">
                {email.charAt(0).toUpperCase()}
              </div>
              <span className="text-zinc-500 text-xs hidden sm:block">{email}</span>
            </div>
          )}
        </header>
        {/* Page content */}
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
