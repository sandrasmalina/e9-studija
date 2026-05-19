'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Lock, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';

interface CourseSummary {
  id: string;
  slug: string;
  title_en: string;
  title_lv: string | null;
  price: number;
  discount_price: number | null;
  currency: string;
  thumbnail_url: string | null;
  is_free: boolean;
}

export default function CheckoutClient({ course }: { course: CourseSummary }) {
  const router = useRouter();
  const { language } = useLanguage();
  const [authed, setAuthed] = useState<boolean | null>(null);

  const title = (language === 'lv' && course.title_lv) ? course.title_lv : course.title_en;
  const displayPrice = course.discount_price ?? course.price;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace(`/auth/login?redirect=/checkout/${course.slug}`);
      } else {
        setAuthed(true);
      }
    });
  }, [course.slug, router]);

  if (!authed) return null;

  return (
    <div className="min-h-screen bg-[#0b0915] pt-24 pb-16 px-6">
      <div className="max-w-lg mx-auto">
        <Link href={`/courses/${course.slug}`}
          className="inline-flex items-center gap-2 text-neutral-500 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={14} />
          Back to course
        </Link>

        <div className="rounded-2xl border border-white/10 bg-[#16122a] overflow-hidden">
          {/* Course summary */}
          <div className="flex items-center gap-4 p-5 border-b border-white/8">
            {course.thumbnail_url ? (
              <Image src={course.thumbnail_url} alt={title} width={72} height={48}
                className="rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-[72px] h-12 rounded-lg bg-accent/10 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-white font-medium text-sm truncate">{title}</p>
              <p className="text-2xl font-bold text-white mt-1">
                {displayPrice === 0 ? 'Free' : `${displayPrice} ${course.currency.toUpperCase()}`}
              </p>
              {course.discount_price && course.discount_price < course.price && (
                <p className="text-neutral-500 text-xs line-through">{course.price} {course.currency.toUpperCase()}</p>
              )}
            </div>
          </div>

          {/* Payment placeholder */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6 text-neutral-400 text-sm">
              <Lock size={13} className="text-accent" />
              Secure checkout
            </div>

            <div className="rounded-xl border border-dashed border-white/20 bg-white/2 p-8 text-center">
              <CreditCard size={32} className="text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-400 text-sm font-medium">Payment coming soon</p>
              <p className="text-neutral-600 text-xs mt-1 max-w-xs mx-auto">
                Online payments are being set up. Contact us directly to complete your purchase.
              </p>
              <a href="mailto:info@e9studija.lv"
                className="mt-4 inline-flex items-center gap-1.5 text-accent text-sm hover:underline">
                info@e9studija.lv
              </a>
            </div>

            <p className="text-center text-neutral-600 text-xs mt-5">
              Once payment is confirmed, you&apos;ll receive immediate access to the course.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
