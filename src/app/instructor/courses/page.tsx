'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, BookOpen, Search, Edit2, Eye } from 'lucide-react';

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
                      <Link href={`/courses/${c.slug}`} target="_blank"
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all" title="View public page">
                        <Eye size={14} />
                      </Link>
                      <Link href={`/instructor/courses/${c.id}/curriculum`}
                        className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] text-xs transition-all">
                        Curriculum
                      </Link>
                      <Link href={`/instructor/courses/${c.id}/edit`}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-purple-400 hover:bg-purple-900/20 transition-all" title="Edit">
                        <Edit2 size={14} />
                      </Link>
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
