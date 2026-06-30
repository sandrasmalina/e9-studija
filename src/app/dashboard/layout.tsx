'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import DashboardControls from '@/components/DashboardControls';
import { useLanguage } from '@/contexts/LanguageContext';
import { BookOpen, Heart, Award, LogOut, GraduationCap, LayoutDashboard, ChevronRight, UserCircle } from 'lucide-react';

const NAV = [
  { href: '/dashboard',             icon: LayoutDashboard, labelKey: 'dashboard.nav.overview' },
  { href: '/dashboard/my-courses',  icon: BookOpen,        labelKey: 'dashboard.nav.myCourses' },
  { href: '/dashboard/wishlist',    icon: Heart,           labelKey: 'dashboard.nav.wishlist' },
  { href: '/dashboard/certificates',icon: Award,           labelKey: 'dashboard.nav.certificates' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [user, setUser] = useState<{ name: string; email: string; avatar: string | null } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/auth/login'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', data.user.id)
        .single();
      setUser({
        name: profile?.full_name || data.user.email?.split('@')[0] || 'Student',
        email: data.user.email ?? '',
        avatar: profile?.avatar_url ?? null,
      });
      setChecking(false);
    });
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0915]">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? 'S';

  return (
    <div className="min-h-screen flex bg-[#0b0915]">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-[#0f0c1e] border-r border-white/[0.06] sticky top-0 h-screen">
        {/* Logo */}
        <div className="px-5 h-16 flex items-center border-b border-white/[0.06] shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <GraduationCap size={14} className="text-purple-400" />
            </div>
            <span className="text-white text-sm font-semibold tracking-tight group-hover:text-purple-300 transition-colors">
              E9 <span className="text-purple-400">Studija</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, labelKey }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-purple-500/15 text-white border border-purple-500/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                }`}>
                <Icon size={16} className={active ? 'text-purple-400' : 'text-zinc-600 group-hover:text-zinc-400'} />
                {t(labelKey)}
                {active && <ChevronRight size={12} className="ml-auto text-purple-400/60" />}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 pb-4 shrink-0 border-t border-white/[0.06] pt-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] mb-2">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/25 flex items-center justify-center text-purple-400 text-xs font-semibold shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-zinc-600 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-900/10 text-sm transition-all">
            <LogOut size={14} /> {t('dashboard.nav.signOut')}
          </button>
          <Link href="/profile"
            className="mt-1 flex items-center gap-2 w-full px-3 py-2 rounded-xl text-zinc-600 hover:text-purple-300 hover:bg-purple-900/10 text-sm transition-all">
            <UserCircle size={14} /> {t('dashboard.nav.profile')}
          </Link>
        </div>
        <DashboardControls />
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
