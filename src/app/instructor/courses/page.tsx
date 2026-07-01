'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, BookOpen, Search, Edit2, Eye, Copy, Trash2 } from 'lucide-react';

interface Course {
  id: string;
  title_en: string;
  slug: string;
  status: string;
  is_free: boolean;
  price: number;
  enrollment_count: number;
  rating_avg: number;
  total_lectures: number;
  created_at: string;
  category: { name_en: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  published:   'bg-green-900/30 text-green-400 border-green-500/20',
  review:      'bg-yellow-900/30 text-yellow-400 border-yellow-500/20',
  draft:       'bg-zinc-800/60 text-zinc-500 border-zinc-700',
  unpublished: 'bg-red-900/20 text-red-400 border-red-500/20',
};

function toSlug(title: string): string {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'course';
}

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Admins see all courses; instructors see only their own
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
      const isAdmin = profile?.role === 'admin';

      const base = supabase
        .from('courses')
        .select('id, title_en, slug, status, is_free, price, enrollment_count, rating_avg, total_lectures, created_at, category:categories!category_id(name_en)')
        .order('created_at', { ascending: false });

      const { data } = await (isAdmin ? base : base.eq('instructor_id', user.id));
      setCourses((data ?? []) as unknown as Course[]);
      setLoading(false);
    })();
  }, []);

  const filtered = courses.filter(c =>
    c.title_en.toLowerCase().includes(search.toLowerCase())
  );

  const refreshCourses = (courseRows: Course[]) => setCourses(courseRows);

  const handleDuplicate = async (course: Course) => {
    const { data: original, error } = await supabase.from('courses').select('*').eq('id', course.id).single();
    if (error || !original) { alert(error?.message || 'Could not load course'); return; }

    const copyTitle = `${original.title_en} (Copy)`;
    const { id: _id, created_at: _created, updated_at: _updated, published_at: _published, stripe_price_id: _stripePrice, stripe_product_id: _stripeProduct, ...courseCopy } = original as any;
    const { data: newCourse, error: insertError } = await supabase.from('courses').insert({
      ...courseCopy,
      title_en: copyTitle,
      title_lv: original.title_lv ? `${original.title_lv} (Copy)` : null,
      slug: `${toSlug(copyTitle)}-${Date.now().toString(36)}`,
      status: 'draft',
      published_at: null,
      enrollment_count: 0,
      rating_avg: 0,
      rating_count: 0,
      stripe_price_id: null,
      stripe_product_id: null,
    }).select('id, title_en, slug, status, is_free, price, enrollment_count, rating_avg, total_lectures, created_at, category:categories!category_id(name_en)').single();
    if (insertError || !newCourse) { alert(insertError?.message || 'Could not duplicate course'); return; }

    const { data: sections } = await supabase.from('sections').select('*, lectures(*)').eq('course_id', course.id).order('sort_order');
    for (const section of (sections ?? []) as any[]) {
      const { id: _sectionId, created_at: _sectionCreated, lectures, ...sectionCopy } = section;
      const { data: newSection } = await supabase.from('sections').insert({ ...sectionCopy, course_id: newCourse.id }).select('id').single();
      if (newSection && lectures?.length) {
        await supabase.from('lectures').insert(lectures.map((lecture: any) => {
          const { id: _lectureId, created_at: _lectureCreated, section_id: _oldSectionId, course_id: _oldCourseId, ...lectureCopy } = lecture;
          return { ...lectureCopy, section_id: newSection.id, course_id: newCourse.id };
        }));
      }
    }

    const { data: groups } = await supabase.from('course_availability_groups').select('*').eq('course_id', course.id).order('sort_order');
    if (groups?.length) {
      await supabase.from('course_availability_groups').insert((groups as any[]).map(group => {
        const { id: _groupId, created_at: _groupCreated, updated_at: _groupUpdated, course_id: _oldCourseId, ...groupCopy } = group;
        return { ...groupCopy, course_id: newCourse.id };
      }));
    }

    const { data: instructors } = await supabase.from('course_instructors').select('*').eq('course_id', course.id).order('sort_order');
    if (instructors?.length) {
      await supabase.from('course_instructors').insert((instructors as any[]).map(instructor => ({
        course_id: newCourse.id,
        instructor_id: instructor.instructor_id,
        role: instructor.role,
        sort_order: instructor.sort_order,
      })));
    }

    refreshCourses([{ ...(newCourse as unknown as Course), category: (newCourse as any).category ?? null }, ...courses]);
  };

  const handleDelete = async (course: Course) => {
    if (!window.confirm(`Delete "${course.title_en}"? This cannot be undone.`)) return;
    const typed = window.prompt('Type DELETE to confirm course deletion.');
    if (typed !== 'DELETE') return;

    if (course.enrollment_count > 0) {
      const options = courses.filter(c => c.id !== course.id).map(c => `${c.id} — ${c.title_en}`).join('\n');
      const targetCourseId = window.prompt(`This course has ${course.enrollment_count} students. Enter the target course ID to move enrollments before deletion:\n\n${options}`);
      if (!targetCourseId) return;
      const target = courses.find(c => c.id === targetCourseId.trim());
      if (!target) { alert('Target course not found. Delete cancelled.'); return; }
      const { data: sourceEnrollments, error: sourceError } = await supabase.from('enrollments').select('id, user_id').eq('course_id', course.id);
      if (sourceError) { alert(sourceError.message); return; }
      const { data: targetEnrollments, error: targetError } = await supabase.from('enrollments').select('user_id').eq('course_id', target.id);
      if (targetError) { alert(targetError.message); return; }
      const targetUserIds = new Set((targetEnrollments ?? []).map(enrollment => enrollment.user_id));
      for (const enrollment of sourceEnrollments ?? []) {
        const result = targetUserIds.has(enrollment.user_id)
          ? await supabase.from('enrollments').delete().eq('id', enrollment.id)
          : await supabase.from('enrollments').update({ course_id: target.id }).eq('id', enrollment.id);
        if (result.error) { alert(result.error.message); return; }
      }
    }

    const { error } = await supabase.from('courses').delete().eq('id', course.id);
    if (error) { alert(error.message); return; }
    setCourses(rows => rows.filter(row => row.id !== course.id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">My Courses</h1>
          <p className="text-zinc-500 text-sm mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/instructor/courses/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors">
          <Plus size={15} /> New Course
        </Link>
      </div>

      <div className="relative mb-5">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses…"
          className="w-full max-w-sm pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/40" />
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <BookOpen size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">{courses.length === 0 ? 'No courses yet.' : 'No courses match your search.'}</p>
          {courses.length === 0 && (
            <Link href="/instructor/courses/new"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors">
              <Plus size={14} /> Create course
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Course</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden sm:table-cell">Status</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden md:table-cell">Price</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden lg:table-cell">Students</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden lg:table-cell">Lectures</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium truncate max-w-xs">{c.title_en}</p>
                    {c.category && <p className="text-zinc-600 text-xs mt-0.5">{c.category.name_en}</p>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize border ${STATUS_COLORS[c.status] ?? STATUS_COLORS.draft}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-sm hidden md:table-cell">
                    {c.is_free ? <span className="text-green-400">Free</span> : `€${c.price}`}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-sm hidden lg:table-cell">{c.enrollment_count}</td>
                  <td className="px-4 py-3 text-zinc-500 text-sm hidden lg:table-cell">{c.total_lectures}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/courses/${c.slug}?preview=1`} target="_blank"
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all" title="View public page">
                        <Eye size={14} />
                      </Link>
                      <button type="button" onClick={() => handleDuplicate(c)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all" title="Duplicate course">
                        <Copy size={14} />
                      </button>
                      <Link href={`/instructor/courses/${c.id}/curriculum`}
                        className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] text-xs transition-all">
                        Curriculum
                      </Link>
                      <Link href={`/instructor/courses/${c.id}/edit`}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-purple-400 hover:bg-purple-900/20 transition-all" title="Edit">
                        <Edit2 size={14} />
                      </Link>
                      <button type="button" onClick={() => handleDelete(c)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-900/20 transition-all" title="Delete course">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
