'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { LearnerContext, LearnerCtxValue, SectionMeta, LectureMeta } from '@/contexts/LearnerContext';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, X, Menu, Moon, Sun } from 'lucide-react';

function fmtSeconds(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

interface CourseInfo {
  id: string;
  title_en: string;
  slug: string;
  is_free: boolean;
  price: number;
  certificate_enabled: boolean;
  instructor_id: string | null;
}

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams() as { courseSlug: string };
  const { courseSlug } = params;
  const isPreview = searchParams.get('preview') === '1';

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [sections, setSections] = useState<SectionMeta[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [contentTheme, setContentTheme] = useState<'dark' | 'light'>('dark');

  // Extract current lectureId from /learn/courseSlug/lectureId
  const pathParts = pathname.split('/');
  const currentLectureId = pathParts.length >= 4 ? pathParts[3] : null;

  useEffect(() => {
    const saved = window.localStorage.getItem('e9-content-theme');
    if (saved === 'light' || saved === 'dark') setContentTheme(saved);
  }, []);

  const toggleContentTheme = () => {
    setContentTheme(current => {
      const next = current === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('e9-content-theme', next);
      return next;
    });
  };

  useEffect(() => {
    (async () => {
      // 1. Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/auth/login?redirect=/learn/${courseSlug}`);
        return;
      }
      setUserId(user.id);

      // 2. Course + curriculum
      const { data: courseData, error: courseErr } = await supabase
        .from('courses')
        .select(`
          id, title_en, slug, is_free, price, certificate_enabled, instructor_id,
          sections(
            id, title_en, sort_order,
            lectures(id, title_en, sort_order, video_duration_seconds, is_preview, content_type)
          )
        `)
        .eq('slug', courseSlug)
        .single();

      if (courseErr || !courseData) {
        router.replace('/courses');
        return;
      }

      let canPreview = false;
      if (isPreview) {
        const [{ data: profile }, { data: courseInstructor }] = await Promise.all([
          supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
          supabase.from('course_instructors').select('instructor_id').eq('course_id', courseData.id).eq('instructor_id', user.id).maybeSingle(),
        ]);
        canPreview = profile?.role === 'admin' || courseData.instructor_id === user.id || Boolean(courseInstructor);
        if (!canPreview) {
          router.replace(`/courses/${courseSlug}`);
          return;
        }
      }

      // 3. Enrollment check
      if (!canPreview) {
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('course_id', courseData.id)
          .maybeSingle();

        if (!enrollment) {
          if (courseData.is_free || courseData.price === 0) {
            // Auto-enroll for free courses
            const { error: enrollErr } = await supabase
              .from('enrollments')
              .insert({ user_id: user.id, course_id: courseData.id, amount_paid: 0, currency: 'EUR', status: 'active' });
            // Ignore unique constraint violation (already enrolled race)
            if (enrollErr && enrollErr.code !== '23505') {
              router.replace(`/courses/${courseSlug}`);
              return;
            }
          } else {
            router.replace(`/courses/${courseSlug}?enroll=required`);
            return;
          }
        }
      }

      // 4. Lecture progress
      let doneIds = new Set<string>();
      if (!canPreview) {
        const { data: progress } = await supabase
          .from('lecture_progress')
          .select('lecture_id')
          .eq('user_id', user.id)
          .eq('course_id', courseData.id)
          .eq('completed', true);
        doneIds = new Set<string>((progress ?? []).map((p: { lecture_id: string }) => p.lecture_id));
      }
      setCompletedIds(doneIds);

      // 5. Sort sections + lectures
      const sortedSections: SectionMeta[] = (courseData.sections ?? [])
        .sort((a: SectionMeta, b: SectionMeta) => a.sort_order - b.sort_order)
        .map((s: SectionMeta) => ({
          ...s,
          lectures: (s.lectures ?? []).sort((a: LectureMeta, b: LectureMeta) => a.sort_order - b.sort_order),
        }));

      setCourse({ id: courseData.id, title_en: courseData.title_en, slug: courseData.slug, is_free: courseData.is_free, price: courseData.price, certificate_enabled: courseData.certificate_enabled ?? false, instructor_id: courseData.instructor_id ?? null });
      setSections(sortedSections);

      // Expand section containing current lecture (or first section)
      const target = currentLectureId
        ? sortedSections.find(s => s.lectures.some(l => l.id === currentLectureId))
        : sortedSections[0];
      if (target) setExpandedSections(new Set([target.id]));

      setLoading(false);
    })();
  }, [courseSlug, isPreview]); // eslint-disable-line react-hooks/exhaustive-deps

  // Expand section of new lecture when navigating
  useEffect(() => {
    if (!currentLectureId || sections.length === 0) return;
    const sec = sections.find(s => s.lectures.some(l => l.id === currentLectureId));
    if (sec) setExpandedSections(prev => { const next = new Set(prev); next.add(sec.id); return next; });
  }, [currentLectureId, sections]);

  const markComplete = useCallback(async (lectureId: string) => {
    if (isPreview) return;
    if (!course || !userId) return;
    await supabase.from('lecture_progress').upsert({
      user_id: userId,
      lecture_id: lectureId,
      course_id: course.id,
      completed: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lecture_id' });

    setCompletedIds(prev => {
      const next = new Set(prev); next.add(lectureId);
      const allLectures = sections.flatMap(s => s.lectures);
      const pct = Math.round((next.size / allLectures.length) * 100);
      // Update enrollment progress (columns added in migration 003)
      const now = new Date().toISOString();
      supabase.from('enrollments').update({
        progress_pct: pct,
        last_accessed_at: now,
        ...(pct >= 100 ? { completed_at: now } : {}),
      }).eq('user_id', userId).eq('course_id', course.id).then(() => {
        if (pct >= 100 && course.certificate_enabled) {
          supabase.from('certificates').upsert(
            { user_id: userId, course_id: course.id, issued_at: now },
            { onConflict: 'user_id,course_id' }
          ).then(() => {});
        }
      });
      return next;
    });
  }, [course, userId, sections, isPreview]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0915] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) return null;

  const allLectures = sections.flatMap(s => s.lectures);
  const totalLectures = allLectures.length;
  const completedCount = completedIds.size;
  const progressPct = totalLectures > 0 ? Math.round((completedCount / totalLectures) * 100) : 0;

  const ctxValue: LearnerCtxValue = {
    courseId: course.id,
    courseSlug: course.slug,
    courseTitle: course.title_en,
    sections,
    allLectures,
    completedIds,
    totalLectures,
    isPreview,
    markComplete,
  };

  const toggleSection = (id: string) =>
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const Sidebar = () => (
    <div className="h-full flex flex-col bg-[#0f0c1e]">
      <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
        <p className="text-zinc-500 text-[11px] font-medium uppercase tracking-wider">Course Content</p>
        <p className="text-zinc-600 text-xs mt-0.5">{isPreview ? 'Student preview mode' : `${completedCount}/${totalLectures} · ${progressPct}% complete`}</p>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {sections.map(section => {
          const isOpen = expandedSections.has(section.id);
          const secDone = section.lectures.filter(l => completedIds.has(l.id)).length;
          return (
            <div key={section.id}>
              <button onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/[0.03] transition-colors text-left">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium leading-snug truncate">{section.title_en}</p>
                  <p className="text-zinc-600 text-[11px] mt-0.5">{secDone}/{section.lectures.length} lectures</p>
                </div>
                {isOpen
                  ? <ChevronDown size={13} className="text-zinc-600 shrink-0" />
                  : <ChevronRight size={13} className="text-zinc-600 shrink-0" />}
              </button>
              {isOpen && (
                <div>
                  {section.lectures.map(lecture => {
                    const isActive = lecture.id === currentLectureId;
                    const isDone = completedIds.has(lecture.id);
                    return (
                      <Link key={lecture.id}
                        href={`/learn/${courseSlug}/${lecture.id}${isPreview ? '?preview=1' : ''}`}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-start gap-2.5 px-4 py-2.5 text-xs transition-all border-l-2 ${
                          isActive
                            ? 'bg-purple-500/10 border-purple-500 text-white'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                        }`}>
                        <div className="mt-px shrink-0">
                          {isDone
                            ? <CheckCircle2 size={13} className="text-green-400" />
                            : <Circle size={13} className={isActive ? 'text-purple-400' : 'text-zinc-700'} />}
                        </div>
                        <div className="min-w-0">
                          <p className="leading-snug">{lecture.title_en}</p>
                          {lecture.video_duration_seconds > 0 && (
                            <p className="text-zinc-700 mt-0.5 text-[11px]">{fmtSeconds(lecture.video_duration_seconds)}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <LearnerContext.Provider value={ctxValue}>
      <div className={`content-page content-theme-${contentTheme} min-h-screen bg-[#0b0915] flex flex-col`} style={{ background: contentTheme === 'light' ? '#f8f5ef' : '#0b0915' }}>
        {/* Top bar */}
        <header className="h-14 bg-[#0f0c1e] border-b border-white/[0.06] flex items-center px-4 gap-3 shrink-0 z-30 sticky top-0">
          <Link href={isPreview ? `/instructor/courses/${course.id}/curriculum` : '/dashboard'}
            className="p-2 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all" title={isPreview ? 'Back to curriculum' : 'Back to dashboard'}>
            <X size={16} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{course.title_en}</p>
          </div>
          <button
            type="button"
            onClick={toggleContentTheme}
            title={contentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            {contentTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {/* Progress */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            {isPreview ? (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-200">Preview</span>
            ) : (
              <>
                <div className="w-28 h-1.5 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-purple-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="text-zinc-500 text-xs whitespace-nowrap">{completedCount}/{totalLectures}</span>
              </>
            )}
          </div>
          {/* Mobile sidebar toggle */}
          <button className="md:hidden p-2 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all" onClick={() => setSidebarOpen(v => !v)}>
            <Menu size={16} />
          </button>
        </header>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 3.5rem)' }}>
          {/* Desktop sidebar */}
          <aside className="w-72 shrink-0 border-r border-white/[0.06] overflow-y-auto hidden md:block">
            <Sidebar />
          </aside>

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSidebarOpen(false)}>
              <div className="absolute inset-0 bg-black/60" />
              <aside className="absolute top-14 right-0 bottom-0 w-72 border-l border-white/[0.06] overflow-y-auto z-50" onClick={e => e.stopPropagation()}>
                <Sidebar />
              </aside>
            </div>
          )}

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </LearnerContext.Provider>
  );
}
