'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, BookOpen, TrendingUp, Settings,
  ChevronRight, ExternalLink, ArrowLeft, Play, FileText, Paperclip,
  ShieldCheck, LogOut, Home,
} from 'lucide-react';

const NAV = [
  { href: '/instructor',          icon: LayoutDashboard, label: 'Overview' },
  { href: '/instructor/courses',  icon: BookOpen,        label: 'My Courses' },
  { href: '/instructor/earnings', icon: TrendingUp,      label: 'Earnings' },
  { href: '/dashboard/settings',  icon: Settings,        label: 'Profile', external: true },
];

const COURSE_PATH_RE = /^\/instructor\/courses\/([0-9a-f-]{36})(\/.*)?$/;

interface Section {
  id: string;
  title_en: string;
  sort_order: number;
  lectures: { id: string; title_en: string; content_type: string; sort_order: number }[];
}

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const router    = useRouter();
  const pathname  = usePathname();
  const [user,      setUser]      = useState<{ name: string; email: string; isAdmin: boolean } | null>(null);
  const [checking,  setChecking]  = useState(true);
  const [courseTitle, setCourseTitle] = useState('');
  const [sections,  setSections]  = useState<Section[]>([]);

  const courseMatch = COURSE_PATH_RE.exec(pathname);
  const courseId    = courseMatch?.[1] ?? null;

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.replace('/auth/login?redirect=/instructor'); return; }

      const { data: profile } = await supabase
        .from('profiles').select('full_name, role').eq('id', authUser.id).single();

      if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
        router.replace('/dashboard'); return;
      }

      setUser({
        name: profile.full_name || authUser.email?.split('@')[0] || 'Instructor',
        email: authUser.email ?? '',
        isAdmin: profile.role === 'admin',
      });
      setChecking(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!courseId || checking) return;
    const loadOutline = async () => {
      setCourseTitle(''); setSections([]);
      const { data } = await supabase
        .from('courses')
        .select('title_en, sections(id, title_en, sort_order, lectures(id, title_en, content_type, sort_order))')
        .eq('id', courseId).single();
      if (!data) return;
      setCourseTitle(data.title_en ?? '');
      setSections(
        ((data.sections ?? []) as Section[])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(s => ({ ...s, lectures: (s.lectures ?? []).sort((a, b) => a.sort_order - b.sort_order) }))
      );
    };
    loadOutline();
    window.addEventListener('curriculum-changed', loadOutline);
    return () => window.removeEventListener('curriculum-changed', loadOutline);
  }, [courseId, checking]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#09090b' }}>
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? 'I';

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/admin'); };

  // ── Shared sidebar footer ────────────────────────────────────────────────
  const SidebarFooter = () => (
    <div className="px-3 py-3 border-t border-zinc-900 space-y-0.5 shrink-0">
      {user?.isAdmin && (
        <Link href="/admin/dashboard"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all group">
          <ShieldCheck size={16} className="text-purple-400 group-hover:text-purple-300 transition-colors" />
          Admin Dashboard
        </Link>
      )}
      <Link href="/"
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all group">
        <Home size={16} className="group-hover:text-zinc-300 transition-colors" />
        Exit to Site
      </Link>
      <button onClick={handleLogout}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all group">
        <LogOut size={16} className="group-hover:text-red-400 transition-colors" />
        Logout
      </button>
    </div>
  );

  // ── Course-editor sidebar ────────────────────────────────────────────────
  if (courseId) {
    const COURSE_NAV = [
      { href: `/instructor/courses/${courseId}/edit`,       label: 'Course Info' },
      { href: `/instructor/courses/${courseId}/curriculum`, label: 'Curriculum'  },
      { href: `/instructor/courses/${courseId}/settings`,   label: 'Settings'    },
    ];

    return (
      <div className="min-h-screen flex" style={{ background: '#09090b' }}>
        <aside className="w-72 shrink-0 flex flex-col bg-zinc-950 border-r border-zinc-900 sticky top-0 h-screen">

          {/* Back + brand */}
          <div className="px-5 py-5 border-b border-zinc-900 shrink-0">
            <Link href="/instructor/courses"
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group mb-4">
              <ArrowLeft size={16} className="shrink-0" />
              <span className="text-sm font-medium">My Courses</span>
            </Link>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-1.5">Editing</p>
            <h2 className="text-white font-semibold text-base leading-snug">
              {courseTitle || <span className="text-zinc-600 animate-pulse">Loading…</span>}
            </h2>
          </div>

          {/* Course sub-nav */}
          <div className="px-3 py-3 border-b border-zinc-900 shrink-0">
            <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">Course</p>
            {COURSE_NAV.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative ${
                    active
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}>
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />}
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight size={12} className="text-accent/50" />}
                </Link>
              );
            })}
          </div>

          {/* Course outline */}
          <div className="flex-1 overflow-y-auto py-3">
            <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-widest px-6 mb-3">Content</p>
            {sections.length === 0 ? (
              <div className="px-6 space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-5 rounded bg-zinc-900 animate-pulse" style={{ width: `${60 + (i % 4) * 10}%` }} />
                ))}
              </div>
            ) : (
              <div>
                {sections.map((section, sIdx) => (
                  <div key={section.id} className="mb-3">
                    <div className="flex items-center gap-2.5 px-5 py-1.5">
                      <span className="text-zinc-600 text-xs font-mono w-4 shrink-0">{sIdx + 1}.</span>
                      <span className="text-zinc-300 text-sm font-medium truncate">{section.title_en}</span>
                    </div>
                    {section.lectures.map(lecture => (
                      <div key={lecture.id} className="flex items-center gap-2.5 pl-12 pr-4 py-1.5 hover:bg-zinc-900/60 transition-colors">
                        <span className="text-zinc-600 shrink-0">
                          {lecture.content_type === 'video' ? <Play size={11} /> : lecture.content_type === 'material' ? <Paperclip size={11} /> : <FileText size={11} />}
                        </span>
                        <span className="text-zinc-500 text-sm truncate">{lecture.title_en}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <SidebarFooter />
        </aside>

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="h-14 border-b border-zinc-900 bg-zinc-950/60 backdrop-blur px-8 flex items-center shrink-0">
            <h1 className="text-white text-sm font-semibold capitalize">
              {COURSE_NAV.find(n => pathname === n.href)?.label ?? 'Course Editor'}
            </h1>
          </header>
          <main className="flex-1 p-8 overflow-y-auto">{children}</main>
        </div>
      </div>
    );
  }

  // ── Standard instructor sidebar ──────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ background: '#09090b' }}>
      <aside className="w-64 shrink-0 flex flex-col bg-zinc-950 border-r border-zinc-900 sticky top-0 h-screen">

        {/* Brand */}
        <div className="px-6 py-6 border-b border-zinc-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm">
              E9
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">E9 Studija</p>
              <p className="text-zinc-500 text-xs">Instructor</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">Teaching</p>
          {NAV.map(({ href, icon: Icon, label, external }) => {
            const active = pathname === href || (href !== '/instructor' && pathname.startsWith(href) && !external);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative ${
                  active ? 'bg-accent/10 text-accent font-medium' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}>
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />}
                <Icon size={16} className={active ? 'text-accent' : 'text-zinc-500 group-hover:text-zinc-300 transition-colors'} />
                <span className="flex-1">{label}</span>
                {external && <ExternalLink size={11} className="text-zinc-700" />}
                {active && !external && <ChevronRight size={12} className="text-accent/50" />}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div className="px-4 py-4 border-t border-zinc-900 shrink-0">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-zinc-900">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/25 flex items-center justify-center text-purple-400 text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-zinc-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <SidebarFooter />
      </aside>

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-14 border-b border-zinc-900 bg-zinc-950/60 backdrop-blur px-8 flex items-center shrink-0">
          <h1 className="text-white text-sm font-semibold">
            {NAV.find(n => pathname === n.href || (n.href !== '/instructor' && pathname.startsWith(n.href)))?.label ?? 'Instructor'}
          </h1>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
