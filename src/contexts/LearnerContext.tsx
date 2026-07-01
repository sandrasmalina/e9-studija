'use client';

import { createContext, useContext } from 'react';

export interface LectureMeta {
  id: string;
  title_en: string;
  sort_order: number;
  video_duration_seconds: number;
  is_preview: boolean;
  content_type: string; // 'video' | 'text' | 'quiz'
}

export interface SectionMeta {
  id: string;
  title_en: string;
  sort_order: number;
  lectures: LectureMeta[];
}

export interface LearnerCtxValue {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  sections: SectionMeta[];
  allLectures: LectureMeta[]; // flattened, sorted
  completedIds: Set<string>;
  totalLectures: number;
  isPreview?: boolean;
  markComplete: (lectureId: string) => Promise<void>;
}

export const LearnerContext = createContext<LearnerCtxValue | null>(null);

export function useLearner(): LearnerCtxValue {
  const ctx = useContext(LearnerContext);
  if (!ctx) throw new Error('useLearner must be used inside LearnerContext.Provider');
  return ctx;
}
