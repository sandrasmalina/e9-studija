import { supabase as serverSupabase } from '@/lib/supabase';
import CheckoutClient from './CheckoutClient';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { courseSlug: string };
}

export default async function CheckoutPage({ params }: PageProps) {
  const { data: course } = await serverSupabase
    .from('courses')
    .select('id, slug, title_en, title_lv, price, discount_price, currency, thumbnail_url, thumbnail_url_lv, language, is_free, billing_type, subscription_interval')
    .eq('slug', params.courseSlug)
    .single();

  if (!course || course.is_free || course.price === 0) {
    notFound();
  }

  return <CheckoutClient course={course} />;
}
