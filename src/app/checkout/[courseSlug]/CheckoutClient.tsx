'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Lock, Loader2, ShieldCheck } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleCheckout = async () => {
    setLoading(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace(`/auth/login?redirect=/checkout/${course.slug}`);
      return;
    }

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ courseSlug: course.slug }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        router.push(`/learn/${course.slug}`);
        return;
      }
      setError(data.error ?? 'Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    window.location.href = data.url;
  };

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
              {course.discount_price !== null && course.discount_price < course.price && (
                <p className="text-neutral-500 text-xs line-through">{course.price} {course.currency.toUpperCase()}</p>
              )}
            </div>
          </div>

          {/* Checkout action */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-5 text-neutral-400 text-sm">
              <Lock size={13} className="text-accent shrink-0" />
              Secure checkout powered by Stripe
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                {error}
              </p>
            )}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold text-base hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin" /> Redirecting to payment&hellip;</>
                : <>Pay {displayPrice} {course.currency.toUpperCase()} &rarr;</>
              }
            </button>

            <div className="flex items-center justify-center gap-4 mt-5 text-neutral-600 text-xs">
              <span className="flex items-center gap-1"><ShieldCheck size={11} /> SSL encrypted</span>
              <span>&middot;</span>
              <span>Visa, Mastercard, Apple Pay</span>
              <span>&middot;</span>
              <span>30-day refund policy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
