import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CategoryPageClient from './CategoryPageClient';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories')
    .select('name_en, name_lv')
    .eq('slug', params.slug)
    .single();
  if (!data) return { title: 'Category Not Found' };
  return { title: `${data.name_en} Courses | E9 Studija` };
}

export default async function CategoryPage({ params }: Props) {
  const supabase = await createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('id, slug, name_en, name_lv, icon')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single();

  if (!category) notFound();

  const { data: courses } = await supabase
    .from('courses')
    .select(`
      id, slug, title_en, title_lv,
      short_description_en, short_description_lv,
      thumbnail_url, thumbnail_url_lv, price, discount_price, currency,
      is_free, billing_type, subscription_interval, level, language, total_duration_minutes,
      total_lectures, enrollment_count, fake_enrollment_count, rating_avg, rating_count,
      instructor:profiles!instructor_id(full_name, avatar_url),
      category:categories!category_id(name_en, name_lv, slug)
    `)
    .eq('status', 'published')
    .eq('category_id', category.id)
    .order('enrollment_count', { ascending: false });

  return <CategoryPageClient category={category} courses={(courses ?? []) as any} />;
}
