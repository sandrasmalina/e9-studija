import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import CourseSlugClient from './CourseSlugClient';

interface Props {
  params: { slug: string };
  searchParams?: { preview?: string };
}

export async function generateMetadata({ params, searchParams }: Props) {
  const supabase = await createClient();
  const preview = searchParams?.preview === '1';
  const query = supabase
    .from('courses')
    .select('title_en, title_lv, short_description_en, thumbnail_url, meta_title, meta_description, og_title, og_description, og_image, canonical_url, no_index')
    .eq('slug', params.slug);
  if (!preview) query.eq('status', 'published');
  const { data } = await query.single();

  if (!data) return { title: 'Course Not Found' };

  return {
    title: data.meta_title || data.title_en,
    description: data.meta_description || data.short_description_en || '',
    alternates: data.canonical_url ? { canonical: data.canonical_url } : undefined,
    robots: data.no_index || preview ? { index: false, follow: false } : undefined,
    openGraph: {
      title: data.og_title || data.meta_title || data.title_en,
      description: data.og_description || data.meta_description || data.short_description_en || '',
      images: data.og_image || data.thumbnail_url ? [data.og_image || data.thumbnail_url] : undefined,
    },
  };
}

export default async function CourseSlugPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const preview = searchParams?.preview === '1';

  const query = supabase
    .from('courses')
    .select(`
      *,
      instructor:profiles!instructor_id(id, full_name, avatar_url, bio, bio_lv, website),
      course_instructors(
        instructor_id, sort_order,
        instructor:profiles!course_instructors_instructor_id_fkey(id, full_name, avatar_url, bio, bio_lv, website)
      ),
      category:categories!category_id(name_en, name_lv, slug, icon),
      sections(
        id, title_en, title_lv, sort_order,
        lectures(id, title_en, title_lv, video_duration_seconds, is_preview, content_type, sort_order)
      ),
      course_availability_groups(id, name_en, name_lv, language, starts_at, ends_at, capacity, sort_order),
      reviews(id, rating, review_text, created_at,
        reviewer:profiles!user_id(full_name, avatar_url)
      )
    `)
    .eq('slug', params.slug)
    .order('sort_order', { referencedTable: 'sections', ascending: true });
  if (!preview) query.eq('status', 'published');
  const { data: course, error } = await query.single();

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
      isPreview={preview}
    />
  );
}
