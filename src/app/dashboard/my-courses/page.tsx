'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { BookOpen, PlayCircle, Search, CheckCircle2 } from 'lucide-react';

interface Enrollment {
  id: string;
  progress_pct: number;
  enrolled_at: string;
  expires_at: string | null;
  completed_at: string | null;
  last_accessed_at: string | null;
  course: {
    id: string;
    title_en: string;
    title_lv: string | null;
    thumbnail_url: string | null;
    thumbnail_url_lv: string | null;
    language: string | null;
    slug: string;
    instructor: { full_name: string } | null;
  };
}

const FILTERS = ['all', 'in progress', 'completed'] as const;
type Filter = typeof FILTERS[number];

function formatAccess(expiresAt: string | null) {
  if (!expiresAt) return 'Lifetime access';
  const date = new Date(expiresAt);
  if (date.getTime() <= Date.now()) return 'Access expired';
  return `Access until ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

export default function MyCoursesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const { language } = useLanguage();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('enrollments')
        .select('id, progress_pct, enrolled_at, expires_at, completed_at, last_accessed_at, course:courses(id, title_en, title_lv, thumbnail_url, thumbnail_url_lv, language, slug, instructor:profiles!courses_instructor_id_fkey(full_name))')
        .eq('user_id', user.id)
        .order('last_accessed_at', { ascending: false, nullsFirst: false });
      setEnrollments((data ?? []) as unknown as Enrollment[]);
      setLoading(false);
    })();
  }, []);

  const filtered = enrollments.filter(e => {
    const matchSearch = e.course.title_en.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ? true :
      filter === 'completed' ? !!e.completed_at :
      !e.completed_at;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">My Courses</h1>
        <p className="text-zinc-500 text-sm mt-1">{enrollments.length} enrolled course{enrollments.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses…"
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/40" />
        </div>
        <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.06]">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${filter === f ? 'bg-purple-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-64 rounded-2xl bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <BookOpen size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">{enrollments.length === 0 ? "You haven't enrolled in any courses yet." : 'No courses match your search.'}</p>
          {enrollments.length === 0 && (
            <Link href="/courses" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors">
              Browse Courses
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ id, course, progress_pct, completed_at, expires_at }) => {
            const title = language === 'lv' && course.title_lv ? course.title_lv : course.title_en;
            const useLatvianThumbnail = course.language === 'lv' || (course.language === 'both' && language === 'lv');
            const thumbnailUrl = useLatvianThumbnail && course.thumbnail_url_lv ? course.thumbnail_url_lv : course.thumbnail_url;
            return (
              <Link key={id} href={`/learn/${course.slug}`}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-purple-500/30 hover:bg-white/[0.04] transition-all overflow-hidden">
                {/* Thumbnail */}
                <div className="aspect-video bg-[#16122a] relative overflow-hidden">
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PlayCircle size={32} className="text-zinc-700" />
                    </div>
                  )}
                  {completed_at && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-green-900/80 text-green-400 text-xs font-medium px-2.5 py-1 rounded-lg backdrop-blur">
                      <CheckCircle2 size={12} /> Completed
                    </div>
                  )}
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                    <div className="h-full bg-purple-500 transition-all" style={{ width: `${progress_pct ?? 0}%` }} />
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-white text-sm font-medium line-clamp-2 group-hover:text-purple-300 transition-colors">{title}</h3>
                {course.instructor?.full_name && (
                  <p className="text-zinc-600 text-xs mt-1">{course.instructor.full_name}</p>
                )}
                <p className={`text-xs mt-2 ${expires_at && new Date(expires_at).getTime() <= Date.now() ? 'text-red-400' : 'text-zinc-500'}`}>{formatAccess(expires_at)}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex-1 mr-3">
                    <div className="flex justify-between mb-1">
                      <span className="text-zinc-600 text-xs">Progress</span>
                      <span className="text-purple-400 text-xs font-medium">{progress_pct ?? 0}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${progress_pct ?? 0}%` }} />
                    </div>
                  </div>
                </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
