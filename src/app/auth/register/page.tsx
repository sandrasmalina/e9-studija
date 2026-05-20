'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Registration is not open to the public.
// Students get accounts when they join a course.
// Teachers are invited by admin.
export default function RegisterPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/courses'); }, [router]);
  return null;
}
