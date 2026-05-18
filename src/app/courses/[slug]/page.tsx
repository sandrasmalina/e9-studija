import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import CourseSlugClient from './CourseSlugClient';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('courses')
    .select('title_en, title_lv, short_description_en, meta_title, meta_description')
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single();

  if (!data) return { title: 'Course Not Found' };

  return {
    title: data.meta_title || data.title_en,
    description: data.meta_description || data.short_description_en || '',
  };
}

export default async function CourseSlugPage({ params }: Props) {
  const supabase = await createClient();

  const { data: course, error } = await supabase
    .from('courses')
    .select(`
      *,
      instructor:profiles!instructor_id(id, full_name, avatar_url, bio, website),
      category:categories!category_id(name_en, name_lv, slug, icon),
      sections(
        id, title_en, title_lv, sort_order,
        lectures(id, title_en, title_lv, video_duration_seconds, is_preview, content_type, sort_order)
      ),
      reviews(id, rating, review_text, created_at,
        reviewer:profiles!user_id(full_name, avatar_url)
      )
    `)
    .eq('slug', params.slug)
    .eq('status', 'published')
    .order('sort_order', { referencedTable: 'sections', ascending: true })
    .single();

  if (error || !course) notFound();

  // Sort lectures within each section
  const sectionsWithSortedLectures = (course.sections ?? [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((s: any) => ({
      ...s,
      lectures: (s.lectures ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    }));

  return (
    <CourseSlugClient
      course={{ ...course, sections: sectionsWithSortedLectures }}
    />
  );
}
