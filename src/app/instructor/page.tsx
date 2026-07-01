'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { BookOpen, Users, DollarSign, Star, ArrowRight, Plus, Clock3, UserRoundCheck } from 'lucide-react';

interface Stats {
  courses: number;
  published: number;
  draft: number;
  review: number;
  unpublished: number;
  students: number;
  revenue: number;
  avgRating: number;
  assigned: number;
}

interface RecentCourse {
  id: string;
  title_en: string;
  slug: string;
  status: string;
  enrollment_count: number;
  rating_avg: number;
  instructor_id?: string | null;
  instructorSummary?: string;
  assignmentLabel?: string;
}

export default function InstructorPage() {
  const [stats, setStats] = useState<Stats>({ courses: 0, published: 0, draft: 0, review: 0, unpublished: 0, students: 0, revenue: 0, avgRating: 0, assigned: 0 });
  const [recent, setRecent] = useState<RecentCourse[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single();
      setName(profile?.full_name?.split(' ')[0] || 'Instructor');

      const courseSelect = 'id, title_en, slug, status, enrollment_count, rating_avg, created_at, instructor_id';
      const isAdmin = profile?.role === 'admin';
      let all: RecentCourse[] = [];
      if (isAdmin) {
        const { data: courses } = await supabase.from('courses').select(courseSelect).order('created_at', { ascending: false });
        all = (courses ?? []) as RecentCourse[];
      } else {
        const [{ data: ownedCourses }, { data: assignments }] = await Promise.all([
          supabase.from('courses').select(courseSelect).eq('instructor_id', user.id).order('created_at', { ascending: false }),
          supabase.from('course_instructors').select('course_id').eq('instructor_id', user.id),
        ]);
        const assignedIds = Array.from(new Set((assignments ?? []).map(row => row.course_id)));
        const { data: assignedCourses } = assignedIds.length > 0
          ? await supabase.from('courses').select(courseSelect).in('id', assignedIds).order('created_at', { ascending: false })
          : { data: [] };
        const byId = new Map<string, RecentCourse>();
        ([...(ownedCourses ?? []), ...(assignedCourses ?? [])] as RecentCourse[]).forEach(course => byId.set(course.id, course));
        all = Array.from(byId.values());
      }
      const courseIds = all.map(c => c.id);
      const assignmentMap = new Map<string, { instructor_id: string; role: string | null; profiles?: { full_name: string | null } | null }[]>();
      if (courseIds.length > 0) {
        const { data: instructorRows } = await supabase
          .from('course_instructors')
          .select('course_id, instructor_id, role, profiles:profiles!course_instructors_instructor_id_fkey(full_name)')
          .in('course_id', courseIds)
          .order('sort_order');
        ((instructorRows ?? []) as any[]).forEach(row => {
          const current = assignmentMap.get(row.course_id) ?? [];
          current.push(row);
          assignmentMap.set(row.course_id, current);
        });
      }

      all = all.map(course => {
        const instructors = assignmentMap.get(course.id) ?? [];
        const names = instructors.map(instructor => instructor.profiles?.full_name).filter(Boolean) as string[];
        const ownAssignment = instructors.find(instructor => instructor.instructor_id === user.id);
        return {
          ...course,
          instructorSummary: names.length > 0 ? names.join(', ') : 'No teachers assigned',
          assignmentLabel: isAdmin
            ? 'Admin view'
            : course.instructor_id === user.id
              ? 'Lead instructor'
              : ownAssignment?.role === 'lead'
                ? 'Lead instructor'
                : 'Assigned teacher',
        };
      });

      const published = all.filter(c => c.status === 'published');
      const draft = all.filter(c => c.status === 'draft');
      const review = all.filter(c => c.status === 'review');
      const unpublished = all.filter(c => c.status === 'unpublished');
      const totalStudents = all.reduce((s, c) => s + (c.enrollment_count || 0), 0);
      const ratings = all.filter(c => c.rating_avg > 0);
      const avgRating = ratings.length > 0
        ? ratings.reduce((s, c) => s + c.rating_avg, 0) / ratings.length
        : 0;

      let revenue = 0;
      if (courseIds.length > 0) {
        const { data: enrollData } = await supabase
          .from('enrollments')
          .select('amount_paid')
          .in('course_id', courseIds)
          .eq('status', 'active');
        revenue = (enrollData ?? []).reduce((s: number, e: { amount_paid: number | null }) => s + (e.amount_paid || 0), 0);
      }

      setStats({ courses: all.length, published: published.length, draft: draft.length, review: review.length, unpublished: unpublished.length, students: totalStudents, revenue, avgRating, assigned: all.filter(c => c.instructor_id !== user.id).length });
      setRecent(all.slice(0, 6));
      setLoading(false);
    })();
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    published:   'bg-green-900/30 text-green-400',
    review:      'bg-yellow-900/30 text-yellow-400',
    draft:       'bg-zinc-800 text-zinc-500',
    unpublished: 'bg-red-900/20 text-red-400',
  };

  const STAT_CARDS = [
    { label: t('instructor.stat.totalCourses'), value: stats.courses, sub: t('instructor.stat.published').replace('{value}', String(stats.published)), icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { label: 'Draft / Review', value: `${stats.draft}/${stats.review}`, sub: `${stats.unpublished} unpublished`, icon: Clock3, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { label: 'Teacher role', value: stats.assigned, sub: 'assigned courses', icon: UserRoundCheck, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    { label: t('instructor.stat.totalStudents'), value: stats.students, sub: t('instructor.stat.enrolled'), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: t('instructor.stat.revenue'), value: `€${stats.revenue.toFixed(0)}`, sub: t('instructor.stat.share'), icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    { label: t('instructor.stat.rating'), value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—', sub: t('instructor.stat.allCourses'), icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 rounded-xl bg-white/[0.06] animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/[0.04] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('instructor.welcome').replace('{name}', name)}</h1>
          <p className="text-zinc-500 text-sm mt-1">{t('instructor.subtitle')}</p>
        </div>
        <Link href="/instructor/courses/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors">
          <Plus size={15} /> {t('instructor.newCourse')}
        </Link>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        {STAT_CARDS.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl border ${bg} p-5`}>
            <Icon size={18} className={color} />
            <p className="text-2xl font-bold text-white mt-3">{value}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
            <p className="text-zinc-700 text-xs mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Recent courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">{t('instructor.yourCourses')}</h2>
          <Link href="/instructor/courses" className="text-purple-400 text-sm hover:text-purple-300 flex items-center gap-1 transition-colors">
            {t('instructor.viewAll')} <ArrowRight size={13} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
            <BookOpen size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">{t('instructor.noCourses')}</p>
            <Link href="/instructor/courses/new"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors">
              <Plus size={14} /> {t('instructor.createFirst')}
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">{t('instructor.table.course')}</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden sm:table-cell">{t('instructor.table.status')}</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden md:table-cell">{t('instructor.table.students')}</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden lg:table-cell">Teachers</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">{t('instructor.table.edit')}</th>
              </tr></thead>
              <tbody className="divide-y divide-white/[0.04]">
                {recent.map(c => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white text-sm font-medium truncate max-w-xs">{c.title_en}</p>
                      {c.assignmentLabel && <p className="mt-0.5 text-[11px] text-zinc-600">{c.assignmentLabel}</p>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${STATUS_COLORS[c.status] ?? 'bg-zinc-800 text-zinc-500'}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-sm hidden md:table-cell">{c.enrollment_count}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell max-w-xs truncate">{c.instructorSummary}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/instructor/courses/${c.id}/edit`} className="text-purple-400 hover:text-purple-300 text-xs transition-colors">Edit →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
