'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Search, UserRound, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CourseRow {
  id: string;
  title_en: string;
}

interface EnrollmentRow {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  progress_pct: number;
  enrolled_at: string;
  completed_at: string | null;
  course?: { title_en: string } | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface StudentRow extends EnrollmentRow {
  student?: ProfileRow;
}

export default function InstructorStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: assignedRoles }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('user_roles').select('roles(name)').eq('user_id', user.id),
      ]);
      const roles = new Set<string>();
      if (profile?.role) roles.add(profile.role);
      (assignedRoles ?? []).forEach((row: any) => row.roles?.name && roles.add(row.roles.name));
      const isAdmin = roles.has('admin');

      const coursesQuery = supabase.from('courses').select('id,title_en').order('title_en');
      const { data: courseRows } = await (isAdmin ? coursesQuery : coursesQuery.eq('instructor_id', user.id));
      const courseIds = ((courseRows ?? []) as CourseRow[]).map(course => course.id);
      if (courseIds.length === 0) { setLoading(false); return; }

      const { data: enrollmentRows } = await supabase
        .from('enrollments')
        .select('id,user_id,course_id,status,progress_pct,enrolled_at,completed_at,courses(title_en)')
        .in('course_id', courseIds)
        .order('enrolled_at', { ascending: false });

      const enrollments = ((enrollmentRows ?? []) as any[]).map(row => ({
        ...row,
        course: Array.isArray(row.courses) ? row.courses[0] : row.courses,
      })) as StudentRow[];
      const userIds = [...new Set(enrollments.map(row => row.user_id))];
      const { data: profileRows } = userIds.length > 0
        ? await supabase.from('profiles').select('id,full_name,avatar_url').in('id', userIds)
        : { data: [] as ProfileRow[] };
      const profiles = new Map((profileRows ?? []).map((row: ProfileRow) => [row.id, row]));
      setStudents(enrollments.map(row => ({ ...row, student: profiles.get(row.user_id) })));
      setLoading(false);
    };
    load();
  }, []);

  const filtered = students.filter(row => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    return [row.student?.full_name, row.course?.title_en, row.status].join(' ').toLowerCase().includes(query);
  });
  const uniqueStudents = new Set(students.map(row => row.user_id)).size;
  const completed = students.filter(row => row.completed_at).length;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Students</h1>
          <p className="mt-1 text-sm text-zinc-500">Students enrolled in your courses.</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <Users size={18} className="text-purple-400" />
          <p className="mt-3 text-2xl font-bold text-white">{loading ? '…' : uniqueStudents}</p>
          <p className="text-xs text-zinc-500">Unique students</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <BookOpen size={18} className="text-blue-400" />
          <p className="mt-3 text-2xl font-bold text-white">{loading ? '…' : students.length}</p>
          <p className="text-xs text-zinc-500">Course enrollments</p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <UserRound size={18} className="text-green-400" />
          <p className="mt-3 text-2xl font-bold text-white">{loading ? '…' : completed}</p>
          <p className="text-xs text-zinc-500">Completed courses</p>
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search students…" className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 pl-9 pr-4 text-sm text-white placeholder-zinc-600 focus:border-purple-500/40 focus:outline-none" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        {loading ? (
          <div className="space-y-px">{[...Array(5)].map((_, index) => <div key={index} className="h-14 animate-pulse bg-white/[0.02]" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={34} className="mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-zinc-600">No students found.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Student</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Course</th>
                <th className="hidden px-5 py-3 text-left text-xs font-medium text-zinc-500 md:table-cell">Progress</th>
                <th className="hidden px-5 py-3 text-left text-xs font-medium text-zinc-500 lg:table-cell">Enrolled</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(row => (
                <tr key={row.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {row.student?.avatar_url ? <img src={row.student.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <div className="flex h-8 w-8 items-center justify-center rounded-full border border-purple-500/25 bg-purple-500/15 text-xs font-semibold text-purple-300">{(row.student?.full_name || 'S').charAt(0).toUpperCase()}</div>}
                      <span className="text-sm font-medium text-white">{row.student?.full_name || 'Unnamed student'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-400"><Link href={`/instructor/courses/${row.course_id}/curriculum`} className="hover:text-purple-300">{row.course?.title_en ?? 'Course'}</Link></td>
                  <td className="hidden px-5 py-3 md:table-cell"><div className="h-2 w-28 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-purple-500" style={{ width: `${row.progress_pct ?? 0}%` }} /></div><span className="mt-1 block text-xs text-zinc-600">{row.progress_pct ?? 0}%</span></td>
                  <td className="hidden px-5 py-3 text-sm text-zinc-500 lg:table-cell">{new Date(row.enrolled_at).toLocaleDateString('en-GB')}</td>
                  <td className="px-5 py-3"><span className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs capitalize text-zinc-400">{row.completed_at ? 'completed' : row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
