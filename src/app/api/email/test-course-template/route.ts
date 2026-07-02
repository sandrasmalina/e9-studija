import { NextRequest, NextResponse } from 'next/server';
import { sendCourseEnrollmentEmail, type CourseEmailTemplate } from '@/lib/email';
import { supabase, supabaseAdmin } from '@/lib/supabase';

interface RenderVariables {
  [key: string]: string;
}

function canManageCourse(course: any, userId: string, role?: string | null, courseInstructor?: { instructor_id: string } | null) {
  return role === 'admin' || course?.instructor_id === userId || Boolean(courseInstructor);
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId, template, extraVariables } = await req.json() as { courseId?: string; template?: CourseEmailTemplate; extraVariables?: RenderVariables };
    if (!courseId || !template?.subject) {
      return NextResponse.json({ error: 'courseId and template subject are required' }, { status: 400 });
    }

    const [{ data: course }, { data: profile }, { data: courseInstructor }] = await Promise.all([
      supabaseAdmin.from('courses').select('id, title_en, slug, billing_type, subscription_interval, instructor_id, instructor:profiles!courses_instructor_id_fkey(full_name)').eq('id', courseId).single(),
      supabaseAdmin.from('profiles').select('role, full_name').eq('id', user.id).single(),
      supabaseAdmin.from('course_instructors').select('instructor_id').eq('course_id', courseId).eq('instructor_id', user.id).maybeSingle(),
    ]);

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!canManageCourse(course, user.id, profile?.role, courseInstructor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.e9studija.lv';
    const instructor = Array.isArray(course.instructor) ? course.instructor[0] : course.instructor;
    const delivery = await sendCourseEnrollmentEmail({
      to: user.email,
      studentName: profile?.full_name ?? user.email,
      courseTitle: course.title_en ?? 'E9 Studija course',
      courseUrl: `${siteUrl}/learn/${course.slug ?? ''}`,
      amountPaid: 1,
      currency: 'eur',
      billingType: course.billing_type,
      subscriptionInterval: course.subscription_interval,
      teacherName: instructor?.full_name ?? null,
      supportEmail: process.env.E9_SUPPORT_EMAIL ?? process.env.E9_ADMIN_EMAIL ?? null,
      extraVariables,
      template,
    });

    return NextResponse.json({ ok: true, status: delivery?.status ?? 'sent' });
  } catch (error) {
    console.error('[email/test-course-template]', error);
    return NextResponse.json({ error: 'Could not send test email' }, { status: 500 });
  }
}
