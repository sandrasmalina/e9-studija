import { supabase as serverSupabase } from '@/lib/supabase';
import CheckoutClient from './CheckoutClient';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { courseSlug: string };
}

export default async function CheckoutPage({ params }: PageProps) {
  const { data: course } = await serverSupabase
    .from('courses')
    .select(`
      id, slug, title_en, title_lv, price, discount_price, currency, thumbnail_url, thumbnail_url_lv, language, is_free, billing_type, subscription_interval,
      service_models(
        id, course_id, name_en, name_lv, description_en, description_lv, sort_order, is_default, is_active,
        payment_plans(id, service_model_id, type, label_en, label_lv, currency, total_price, original_price, upfront_amount, installment_count, installment_amount, interval, provider_price_id, sort_order, is_default, is_active)
      )
    `)
    .eq('slug', params.courseSlug)
    .single();

  if (!course || course.is_free || course.price === 0) {
    notFound();
  }

  return <CheckoutClient course={course} />;
}
