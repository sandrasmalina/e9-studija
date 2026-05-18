'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLearner } from '@/contexts/LearnerContext';

export default function LearnCoursePage() {
  const router = useRouter();
  const { courseSlug, sections } = useLearner();

  useEffect(() => {
    const firstLecture = sections[0]?.lectures[0];
    if (firstLecture) {
      router.replace(`/learn/${courseSlug}/${firstLecture.id}`);
    }
  }, [courseSlug, sections, router]);

  return null;
}
