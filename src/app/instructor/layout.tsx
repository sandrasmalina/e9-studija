'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, BookOpen, TrendingUp, Settings, ChevronRight, GraduationCap, ExternalLink } from 'lucide-react';

const NAV = [
  { href: '/instructor',              icon: LayoutDashboard, label: 'Overview' },
  { href: '/instructor/courses',      icon: BookOpen,        label: 'My Courses' },
  { href: '/instructor/earnings',     icon: TrendingUp,      label: 'Earnings' },
  { href: '/dashboard/settings',      icon: Settings,        label: 'Profile', external: true },
];

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.replace('/auth/login?redirect=/instructor'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', authUser.id)
        .single();

      if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
        router.replace('/dashboard');
        return;
      }

      setUser({ name: profile.full_name || authUser.email?.split('@')[0] || 'Instructor', email: authUser.email ?? '' });
      setChecking(false);
    })();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0b0915] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? 'I';

  return (
    <div className="min-h-screen flex bg-[#0b0915]">
      <aside className="w-56 shrink-0 flex flex-col bg-[#0f0c1e] border-r border-white/[0.06] sticky top-0 h-screen">
        <div className="px-5 h-16 flex items-center border-b border-white/[0.06] shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <GraduationCap size={14} className="text-purple-400" />
            </div>
            <div>
              <span className="text-white text-xs font-semibold">E9 Studija</span>
              <p className="text-purple-400 text-[10px] -mt-0.5">Instructor</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label, external }) => {
            const active = pathname === href || (href !== '/instructor' && pathname.startsWith(href) && !external);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active ? 'bg-purple-500/15 text-white border border-purple-500/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                }`}>
                <Icon size={15} className={active ? 'text-purple-400' : 'text-zinc-600 group-hover:text-zinc-400'} />
                {label}
                {external && <ExternalLink size={11} className="ml-auto text-zinc-700" />}
                {active && !external && <ChevronRight size={11} className="ml-auto text-purple-400/60" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 shrink-0 border-t border-white/[0.06] pt-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03]">
            <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/25 flex items-center justify-center text-purple-400 text-xs font-semibold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-zinc-600 text-[11px] truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
