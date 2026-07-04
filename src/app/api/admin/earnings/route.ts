import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabaseAdmin.from('profiles').select('role').eq('id', user.id).single(),
    supabaseAdmin.from('user_roles').select('roles(name)').eq('user_id', user.id),
  ]);
  const isAdmin = profile?.role === 'admin' || (roles ?? []).some((row: { roles?: { name?: string } | { name?: string }[] }) => {
    const r = Array.isArray(row.roles) ? row.roles[0] : row.roles;
    return r?.name === 'admin';
  });
  return isAdmin ? user : null;
}

interface InstructorProfile { role: string | null; revenue_share_pct: number | null }
interface CourseJoin {
  title_en: string | null;
  instructor_id: string | null;
  profiles: InstructorProfile | InstructorProfile[] | null;
}
interface EnrollmentRow {
  amount_paid: number | null;
  currency: string | null;
  courses: CourseJoin | CourseJoin[] | null;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // All paid, active enrollments joined to the course's instructor profile.
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select('amount_paid, currency, courses(title_en, instructor_id, profiles!courses_instructor_id_fkey(role, revenue_share_pct))')
    .eq('status', 'active')
    .gt('amount_paid', 0);

  if (error) {
    console.error('[admin/earnings]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as EnrollmentRow[];
  let totalRevenue = 0;
  let platformIncome = 0;

  for (const row of rows) {
    const amount = row.amount_paid ?? 0;
    totalRevenue += amount;
    const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
    const instructor = Array.isArray(course?.profiles) ? course?.profiles[0] : course?.profiles;
    const isAdminCourse = instructor?.role === 'admin';
    // Platform keeps 100% for admin courses; otherwise 100% - instructor revenue share.
    const platformPct = isAdminCourse ? 100 : Math.max(0, Math.min(100, 100 - (instructor?.revenue_share_pct ?? 70)));
    platformIncome += amount * (platformPct / 100);
  }

  return NextResponse.json({
    totalRevenue: Number(totalRevenue.toFixed(2)),
    platformIncome: Number(platformIncome.toFixed(2)),
    totalEnrollments: rows.length,
  });
}
