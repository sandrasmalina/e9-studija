'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, BookOpen, TrendingUp, Settings,
  ChevronRight, GraduationCap, ExternalLink, ArrowLeft, Play, FileText,
} from 'lucide-react';

const NAV = [
  { href: '/instructor',         icon: LayoutDashboard, label: 'Overview' },
  { href: '/instructor/courses', icon: BookOpen,        label: 'My Courses' },
  { href: '/instructor/earnings',icon: TrendingUp,      label: 'Earnings' },
  { href: '/dashboard/settings', icon: Settings,        label: 'Profile', external: true },
];

const COURSE_PATH_RE = /^\/instructor\/courses\/([0-9a-f-]{36})(\/.*)?$/;

interface Section {
  id: string;
  title_en: string;
  sort_order: number;
  lectures: { id: string; title_en: string; content_type: string; sort_order: number }[];
}

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user,    setUser]    = useState<{ name: string; email: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [courseTitle, setCourseTitle] = useState('');
  const [sections, setSections] = useState<Section[]>([]);

  const courseMatch = COURSE_PATH_RE.exec(pathname);
  const courseId    = courseMatch?.[1] ?? null;

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

  // Load course outline when on a course-editor path
  useEffect(() => {
    if (!courseId || checking) return;
    setCourseTitle('');
    setSections([]);
    (async () => {
      const { data } = await supabase
        .from('courses')
        .select('title_en, sections(id, title_en, sort_order, lectures(id, title_en, content_type, sort_order))')
        .eq('id', courseId)
        .single();
      if (!data) return;
      setCourseTitle(data.title_en ?? '');
      setSections(
        ((data.sections ?? []) as Section[])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(s => ({ ...s, lectures: (s.lectures ?? []).sort((a, b) => a.sort_order - b.sort_order) }))
      );
    })();
  }, [courseId, checking]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0b0915] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? 'I';

  const UserFooter = () => (
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
  );

  // ── Course-editor sidebar ────────────────────────────────────────────────
  if (courseId) {
    const COURSE_NAV = [
      { href: `/instructor/courses/${courseId}/edit`,       label: 'Course Info' },
      { href: `/instructor/courses/${courseId}/curriculum`, label: 'Curriculum'  },
      { href: `/instructor/courses/${courseId}/settings`,   label: 'Settings'    },
    ];

    return (
      <div className="min-h-screen flex bg-[#0b0915]">
        <aside className="w-64 shrink-0 flex flex-col bg-[#0f0c1e] border-r border-white/[0.06] sticky top-0 h-screen">

          {/* Header: back + course name */}
          <div className="px-3 h-14 flex items-center gap-2 border-b border-white/[0.06] shrink-0">
            <Link href="/instructor/courses"
              className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all shrink-0">
              <ArrowLeft size={14} />
            </Link>
            <span className="text-white text-xs font-medium truncate">
              {courseTitle || <span className="text-zinc-600">Loading…</span>}
            </span>
          </div>

          {/* Course sub-nav */}
          <div className="px-3 py-3 border-b border-white/[0.06] space-y-0.5 shrink-0">
            {COURSE_NAV.map(({ href, label }) => {
              const active = pathname === href || (pathname.startsWith(href + '/') && !pathname.startsWith(href + '/..'));
              return (
                <Link key={href} href={href}
                  className={`flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-purple-500/15 text-white border border-purple-500/20'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                  }`}>
                  {label}
                  {active && <ChevronRight size={11} className="ml-auto text-purple-400/60" />}
                </Link>
              );
            })}
          </div>

          {/* Course outline: sections + lectures */}
          <div className="flex-1 overflow-y-auto py-2">
            {sections.length === 0 ? (
              <div className="px-5 pt-3 space-y-1.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-6 rounded-md bg-white/[0.03] animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
                ))}
              </div>
            ) : (
              <div>
                {sections.map((section, sIdx) => (
                  <div key={section.id} className="mb-1">
                    <div className="flex items-center gap-2 px-4 py-1.5">
                      <span className="text-zinc-700 text-[10px] font-mono shrink-0 w-3">{sIdx + 1}</span>
                      <span className="text-zinc-400 text-[11px] font-semibold truncate">{section.title_en}</span>
                    </div>
                    {section.lectures.map(lecture => (
                      <div key={lecture.id}
                        className="flex items-center gap-2 pl-9 pr-3 py-1 mx-2 rounded-md">
                        <span className="text-zinc-700 shrink-0">
                          {lecture.content_type === 'video' ? <Play size={9} /> : <FileText size={9} />}
                        </span>
                        <span className="text-zinc-600 text-[11px] truncate">{lecture.title_en}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <UserFooter />
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    );
  }

  // ── Standard instructor sidebar ──────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-[#0b0915]">
      <aside className="w-56 shrink-0 flex flex-col bg-[#0f0c1e] border-r border-white/[0.06] sticky top-0 h-screen">
        <div className="px-5 h-16 flex items-center border-b border-white/[0.06] shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
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

        <UserFooter />
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}

