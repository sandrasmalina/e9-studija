'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Plus, Pencil, Trash2, ExternalLink, Search,
  BookOpen, Star, Users, ImageIcon, RefreshCw, ChevronDown, ArrowUp, ArrowDown
} from 'lucide-react';

interface Course {
  id: string;
  title_en: string;
  slug: string;
  status: string;
  price: number;
  is_free: boolean;
  thumbnail_url: string | null;
  enrollment_count: number;
  rating_avg: number;
  rating_count: number;
  sort_order: number;
  created_at: string;
  instructor: { full_name: string | null } | null;
  category: { name_en: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft:       'bg-zinc-800 text-zinc-400',
  review:      'bg-yellow-900/50 text-yellow-400',
  published:   'bg-green-900/50 text-green-400',
  unpublished: 'bg-red-900/40 text-red-400',
};

const ALL_STATUSES = ['all', 'draft', 'review', 'published', 'unpublished'];

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('courses')
      .select(`
        id, title_en, slug, status, price, is_free,
        thumbnail_url, enrollment_count, rating_avg, rating_count, sort_order, created_at,
        instructor:profiles!courses_instructor_id_fkey(full_name),
        category:categories!courses_category_id_fkey(name_en)
      `)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    setCourses((data ?? []) as unknown as Course[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course? This cannot be undone.')) return;
    setDeleting(id);
    await supabase.from('courses').delete().eq('id', id);
    setCourses(c => c.filter(x => x.id !== id));
    setDeleting(null);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setStatusUpdating(id);
    const extra = newStatus === 'published' ? { published_at: new Date().toISOString() } : {};
    await supabase.from('courses').update({ status: newStatus, ...extra }).eq('id', id);
    setCourses(c => c.map(x => x.id === id ? { ...x, status: newStatus } : x));
    setStatusUpdating(null);
  };

  const handleMoveCourse = async (courseId: string, direction: 'up' | 'down') => {
    const index = courses.findIndex(course => course.id === courseId);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= courses.length) return;

    const current = courses[index];
    const target = courses[targetIndex];
    const currentOrder = current.sort_order ?? index * 10;
    const targetOrder = target.sort_order ?? targetIndex * 10;

    const [currentResult, targetResult] = await Promise.all([
      supabase.from('courses').update({ sort_order: targetOrder }).eq('id', current.id),
      supabase.from('courses').update({ sort_order: currentOrder }).eq('id', target.id),
    ]);

    if (currentResult.error || targetResult.error) {
      alert(currentResult.error?.message || targetResult.error?.message || 'Could not update course order');
      return;
    }

    setCourses(rows => {
      const next = [...rows];
      next[index] = { ...target, sort_order: currentOrder };
      next[targetIndex] = { ...current, sort_order: targetOrder };
      return next;
    });
  };

  const filtered = courses.filter(c => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || c.title_en.toLowerCase().includes(q) ||
      (c.instructor?.full_name ?? '').toLowerCase().includes(q) ||
      (c.category?.name_en ?? '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = s === 'all' ? courses.length : courses.filter(c => c.status === s).length;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Courses</h1>
          <p className="text-zinc-500 text-sm mt-1">{courses.length} total</p>
        </div>
        <Link href="/admin/courses/new" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
          <Plus size={16} /> New Course
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses, instructors…"
            className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent/50" />
        </div>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 overflow-x-auto">
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${statusFilter === s ? 'bg-accent text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {s} {counts[s] > 0 && <span className="ml-0.5 opacity-70">({counts[s]})</span>}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-colors"><RefreshCw size={15} /></button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-zinc-900/60 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <BookOpen size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 mb-4">No courses found</p>
          <Link href="/admin/courses/new" className="inline-flex items-center gap-1.5 text-accent text-sm hover:underline"><Plus size={14} /> Add your first course</Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Order</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Course</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium hidden lg:table-cell">Price</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium hidden lg:table-cell">Enrolled</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium hidden xl:table-cell">Rating</th>
                <th className="px-4 py-3 text-xs text-zinc-500 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filtered.map(course => {
                const courseIndex = courses.findIndex(item => item.id === course.id);
                return (
                <tr key={course.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleMoveCourse(course.id, 'up')} disabled={courseIndex <= 0} className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-zinc-800 transition-all disabled:cursor-not-allowed disabled:opacity-30" title="Move up"><ArrowUp size={13} /></button>
                      <button type="button" onClick={() => handleMoveCourse(course.id, 'down')} disabled={courseIndex < 0 || courseIndex >= courses.length - 1} className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-zinc-800 transition-all disabled:cursor-not-allowed disabled:opacity-30" title="Move down"><ArrowDown size={13} /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-8 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                        {course.thumbnail_url ? <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={14} className="text-zinc-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate max-w-[200px]">{course.title_en}</p>
                        <p className="text-zinc-600 text-xs truncate">{course.instructor?.full_name ?? 'No instructor'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell"><span className="text-zinc-500 text-xs">{course.category?.name_en ?? '—'}</span></td>
                  <td className="px-4 py-3">
                    <div className="relative inline-block">
                      <select value={course.status} onChange={e => handleStatusChange(course.id, e.target.value)} disabled={statusUpdating === course.id}
                        className={`appearance-none pr-6 pl-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer border-0 focus:outline-none ${STATUS_COLORS[course.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                        {['draft','review','published','unpublished'].map(s => <option key={s} value={s} className="bg-zinc-900 text-white capitalize">{s}</option>)}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-70" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    {course.is_free ? <span className="text-green-400 text-sm font-medium">Free</span> : <span className="text-zinc-300 text-sm font-medium">€{course.price}</span>}
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    <div className="flex items-center justify-end gap-1 text-zinc-400 text-xs"><Users size={11} /> {course.enrollment_count}</div>
                  </td>
                  <td className="px-4 py-3 text-right hidden xl:table-cell">
                    {course.rating_count > 0 ? (
                      <div className="flex items-center justify-end gap-1 text-zinc-400 text-xs">
                        <Star size={11} className="text-yellow-400" /> {Number(course.rating_avg).toFixed(1)} <span className="text-zinc-600">({course.rating_count})</span>
                      </div>
                    ) : <span className="text-zinc-700 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <a href={`/courses/${course.slug}`} target="_blank" rel="noopener noreferrer" title="View public page" className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-all"><ExternalLink size={14} /></a>
                      <Link href={`/admin/courses/${course.id}/edit`} title="Edit" className="p-1.5 rounded-lg text-zinc-600 hover:text-accent hover:bg-accent/10 transition-all"><Pencil size={14} /></Link>
                      <button onClick={() => handleDelete(course.id)} disabled={deleting === course.id} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-900/20 transition-all disabled:opacity-40"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
