'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, BookOpen, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import StarRating from './StarRating';
import PriceBadge from './PriceBadge';

export interface CourseCardData {
  id: string;
  slug: string;
  title_en: string;
  title_lv: string | null;
  short_description_en: string | null;
  short_description_lv: string | null;
  thumbnail_url: string | null;
  thumbnail_url_lv: string | null;
  price: number;
  discount_price: number | null;
  currency: string;
  is_free: boolean;
  billing_type: string | null;
  subscription_interval: string | null;
  level: string | null;
  language: string | null;
  total_duration_minutes: number;
  total_lectures: number;
  enrollment_count: number;
  fake_enrollment_count?: number | null;
  rating_avg: number;
  rating_count: number;
  instructor?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  category?: {
    name_en: string;
    name_lv: string | null;
    slug: string;
  } | null;
}

interface CourseCardProps {
  course: CourseCardData;
}

const levelColors: Record<string, string> = {
  beginner: 'text-emerald-400 bg-emerald-400/10',
  intermediate: 'text-yellow-400 bg-yellow-400/10',
  advanced: 'text-red-400 bg-red-400/10',
  all: 'text-accent bg-accent/10',
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function CourseCard({ course }: CourseCardProps) {
  const { language } = useLanguage();
  const title = (language === 'lv' && course.title_lv) ? course.title_lv : course.title_en;
  const desc = (language === 'lv' && course.short_description_lv) ? course.short_description_lv : course.short_description_en;
  const useLatvianThumbnail = course.language === 'lv' || (course.language === 'both' && language === 'lv');
  const thumbnailUrl = useLatvianThumbnail
    ? (course.thumbnail_url_lv || course.thumbnail_url)
    : (course.thumbnail_url || course.thumbnail_url_lv);
  const levelClass = course.level ? (levelColors[course.level] ?? levelColors.all) : null;
  const displayStudentCount = (course.enrollment_count || 0) + (course.fake_enrollment_count || 0);

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col rounded-2xl border border-white/8 bg-[#0f0c1e] hover:border-accent/30 hover:shadow-[0_0_30px_rgba(168,85,247,0.08)] transition-all duration-300 overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-bg-secondary overflow-hidden">
        {thumbnailUrl ? (
          <>
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-violet-700/20 to-fuchsia-600/10 mix-blend-overlay pointer-events-none" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent/10 to-fuchsia-600/5">
            <BookOpen size={32} className="text-accent/40" />
          </div>
        )}
        {/* Level badge */}
        {course.level && course.level !== 'all' && (
          <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-md text-xs font-medium capitalize ${levelClass}`}>
            {course.level}
          </span>
        )}
        {/* Free badge */}
        {course.is_free && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Free
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5">
        {course.category && (
          <span className="text-accent text-xs font-medium mb-2 uppercase tracking-wider">
            {language === 'lv' && course.category.name_lv ? course.category.name_lv : course.category.name_en}
          </span>
        )}
        <h3 className="text-white font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-accent transition-colors">
          {title}
        </h3>
        {desc && (
          <p className="text-neutral-500 text-xs leading-relaxed line-clamp-2 mb-3 flex-1">
            {desc}
          </p>
        )}

        {/* Instructor */}
        {course.instructor?.full_name && (
          <p className="text-neutral-600 text-xs mb-3">{course.instructor.full_name}</p>
        )}

        {/* Rating */}
        {course.rating_count > 0 && (
          <div className="mb-3">
            <StarRating rating={Number(course.rating_avg)} count={course.rating_count} />
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-neutral-600 text-xs mb-4">
          {course.total_duration_minutes > 0 && (
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {formatDuration(course.total_duration_minutes)}
            </span>
          )}
          {course.total_lectures > 0 && (
            <span className="flex items-center gap-1">
              <BookOpen size={11} />
              {course.total_lectures} lectures
            </span>
          )}
          {displayStudentCount > 0 && (
            <span className="flex items-center gap-1">
              <Users size={11} />
              {displayStudentCount.toLocaleString()}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mt-auto pt-3 border-t border-white/5">
          <PriceBadge
            price={Number(course.price)}
            discountPrice={course.discount_price ? Number(course.discount_price) : null}
            currency={course.currency}
            isFree={course.is_free}
            billingType={course.billing_type}
            subscriptionInterval={course.subscription_interval}
          />
        </div>
      </div>
    </Link>
  );
}
