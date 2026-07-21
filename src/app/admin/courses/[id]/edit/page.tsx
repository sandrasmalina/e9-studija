import { redirect } from 'next/navigation';

// Admin course editing uses the same full chapter-based editor as instructors,
// so both stay in sync automatically. This route redirects to it.
export default function AdminCourseEditRedirect({ params }: { params: { id: string } }) {
  redirect(`/instructor/courses/${params.id}/edit`);
}
