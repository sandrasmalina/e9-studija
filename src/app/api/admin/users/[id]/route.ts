import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

interface Props {
  params: { id: string };
}

async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabaseAdmin.from('profiles').select('role').eq('id', user.id).single(),
    supabaseAdmin.from('user_roles').select('roles(name)').eq('user_id', user.id),
  ]);
  return profile?.role === 'admin' || (roles ?? []).some((row: any) => row.roles?.name === 'admin');
}

export async function GET(req: NextRequest, { params }: Props) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [authUserRes, profileRes, rolesRes, createdCoursesRes, assignedCoursesRes, enrollmentsRes] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(params.id),
    supabaseAdmin.from('profiles').select('id, full_name, first_name, last_name, avatar_url, role, bio, bio_lv, role_title, website, linkedin_url, stripe_account_id, revenue_share_pct, created_at').eq('id', params.id).single(),
    supabaseAdmin.from('user_roles').select('roles(name, display_name)').eq('user_id', params.id),
    supabaseAdmin.from('courses').select('id, title_en, slug, status, price, is_free, enrollment_count, created_at').eq('instructor_id', params.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('course_instructors').select('role, sort_order, course:courses(id, title_en, slug, status, price, is_free, enrollment_count, created_at)').eq('instructor_id', params.id).order('sort_order'),
    supabaseAdmin.from('enrollments').select('id, status, amount_paid, currency, enrolled_at, expires_at, progress_pct, completed_at, course:courses(id, title_en, slug, status)').eq('user_id', params.id).order('enrolled_at', { ascending: false }),
  ]);

  if (profileRes.error || !profileRes.data) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
  }

  const roleNames = new Set<string>();
  if (profileRes.data.role) roleNames.add(profileRes.data.role);
  (rolesRes.data ?? []).forEach((row: any) => row.roles?.name && roleNames.add(row.roles.name));

  return NextResponse.json({
    profile: {
      ...profileRes.data,
      email: authUserRes.data.user?.email ?? null,
      phone: authUserRes.data.user?.phone || authUserRes.data.user?.user_metadata?.phone || authUserRes.data.user?.user_metadata?.phone_number || null,
      roles: Array.from(roleNames),
    },
    createdCourses: createdCoursesRes.data ?? [],
    assignedCourses: (assignedCoursesRes.data ?? []).map((row: any) => ({ ...row.course, assignment_role: row.role, assignment_sort_order: row.sort_order })).filter(Boolean),
    enrollments: enrollmentsRes.data ?? [],
  });
}