'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, BookOpen, Users, Award, ChevronDown, ChevronUp,
  Play, Lock, CheckCircle, Globe, ArrowLeft, Star
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/Button';
import StarRating from '@/components/courses/StarRating';
import PriceBadge from '@/components/courses/PriceBadge';

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function formatMinutes(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface Lecture {
  id: string;
  title_en: string;
  title_lv: string | null;
  video_duration_seconds: number;
  is_preview: boolean;
  content_type: string;
  sort_order: number;
}

interface Section {
  id: string;
  title_en: string;
  title_lv: string | null;
  sort_order: number;
  lectures: Lecture[];
}

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  reviewer: { full_name: string | null; avatar_url: string | null } | null;
}

interface Course {
  id: string;
  slug: string;
  title_en: string;
  title_lv: string | null;
  description_en: string | null;
  description_lv: string | null;
  short_description_en: string | null;
  short_description_lv: string | null;
  thumbnail_url: string | null;
  promo_video_url: string | null;
  promo_video_type: string | null;
  price: number;
  discount_price: number | null;
  currency: string;
  is_free: boolean;
  level: string | null;
  language: string;
  total_duration_minutes: number;
  total_lectures: number;
  enrollment_count: number;
  rating_avg: number;
  rating_count: number;
  certificate_enabled: boolean;
  requirements: string[] | null;
  what_you_learn: string[] | null;
  target_audience: string | null;
  published_at: string | null;
  instructor: { id: string; full_name: string | null; avatar_url: string | null; bio: string | null; website: string | null } | null;
  category: { name_en: string; name_lv: string | null; slug: string; icon: string | null } | null;
  sections: Section[];
  reviews: Review[];
}

export default function CourseSlugClient({ course }: { course: Course }) {
  const { t, language } = useLanguage();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([course.sections[0]?.id]));

  const title = (language === 'lv' && course.title_lv) ? course.title_lv : course.title_en;
  const desc = (language === 'lv' && course.description_lv) ? course.description_lv : course.description_en;
  const categoryName = course.category
    ? (language === 'lv' && course.category.name_lv ? course.category.name_lv : course.category.name_en)
    : null;

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalLectures = course.sections.reduce((acc, s) => acc + s.lectures.length, 0);
  const previewLectures = course.sections.flatMap(s => s.lectures).filter(l => l.is_preview);

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <div className="bg-[#0f0c1e] border-b border-white/5 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <Link href="/courses" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft size={14} />
            {t('courses.back')}
          </Link>

          <div className="grid lg:grid-cols-[1fr_360px] gap-12 items-start">
            {/* Left: info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {course.category && (
                <Link href={`/courses/category/${course.category.slug}`}
                  className="inline-flex items-center gap-1.5 text-accent text-xs font-medium uppercase tracking-wider mb-3 hover:underline">
                  {course.category.icon && <span>{course.category.icon}</span>}
                  {categoryName}
                </Link>
              )}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{title}</h1>
              {course.short_description_en && (
                <p className="text-neutral-400 text-lg mb-6 leading-relaxed">
                  {language === 'lv' && course.short_description_lv ? course.short_description_lv : course.short_description_en}
                </p>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400 mb-6">
                {course.rating_count > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-bold">{Number(course.rating_avg).toFixed(1)}</span>
                    <StarRating rating={Number(course.rating_avg)} count={course.rating_count} />
                  </div>
                )}
                <span className="flex items-center gap-1.5"><Users size={14} />{course.enrollment_count.toLocaleString()} students</span>
                {course.total_duration_minutes > 0 && (
                  <span className="flex items-center gap-1.5"><Clock size={14} />{formatMinutes(course.total_duration_minutes)}</span>
                )}
                {totalLectures > 0 && (
                  <span className="flex items-center gap-1.5"><BookOpen size={14} />{totalLectures} lectures</span>
                )}
                {course.level && (
                  <span className="flex items-center gap-1.5 capitalize">{course.level}</span>
                )}
                <span className="flex items-center gap-1.5"><Globe size={14} />{course.language.toUpperCase()}</span>
              </div>

              {course.instructor?.full_name && (
                <div className="flex items-center gap-3">
                  {course.instructor.avatar_url && (
                    <Image src={course.instructor.avatar_url} alt={course.instructor.full_name} width={32} height={32}
                      className="rounded-full object-cover" />
                  )}
                  <span className="text-neutral-400 text-sm">
                    {t('courses.by')} <span className="text-accent">{course.instructor.full_name}</span>
                  </span>
                </div>
              )}
            </motion.div>

            {/* Right: sticky buy card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="lg:sticky lg:top-28 rounded-2xl border border-white/10 bg-[#16122a] overflow-hidden">
              {/* Thumbnail / promo */}
              <div className="relative aspect-video bg-bg-secondary">
                {course.thumbnail_url ? (
                  <Image src={course.thumbnail_url} alt={title} fill className="object-cover" sizes="360px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-accent/5">
                    <Play size={40} className="text-accent/40" />
                  </div>
                )}
                {course.promo_video_url && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer">
                      <Play size={22} className="text-white ml-1" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6">
                <PriceBadge
                  price={Number(course.price)}
                  discountPrice={course.discount_price ? Number(course.discount_price) : null}
                  currency={course.currency}
                  isFree={course.is_free}
                />

                <Link href={`/auth/register?redirect=/learn/${course.slug}`} className="block mt-4">
                  <Button className="w-full text-base py-3">
                    {course.is_free || course.price === 0 ? t('courses.enroll.free') : t('courses.enroll.paid')}
                  </Button>
                </Link>

                {previewLectures.length > 0 && (
                  <p className="text-center text-xs text-neutral-500 mt-3">{t('courses.preview.hint')}</p>
                )}

                <ul className="mt-5 space-y-2 text-sm text-neutral-400">
                  {course.certificate_enabled && (
                    <li className="flex items-center gap-2"><Award size={14} className="text-accent shrink-0" />{t('courses.feature.certificate')}</li>
                  )}
                  <li className="flex items-center gap-2"><Clock size={14} className="text-accent shrink-0" />{t('courses.feature.lifetime')}</li>
                  {totalLectures > 0 && (
                    <li className="flex items-center gap-2"><BookOpen size={14} className="text-accent shrink-0" />{totalLectures} {t('courses.feature.lectures')}</li>
                  )}
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid lg:grid-cols-[1fr_360px] gap-12">
          <div className="space-y-12">

            {/* What you'll learn */}
            {course.what_you_learn && course.what_you_learn.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-5">{t('courses.section.learn')}</h2>
                <div className="grid sm:grid-cols-2 gap-3 p-6 rounded-xl border border-white/8 bg-[#0f0c1e]">
                  {course.what_you_learn.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                      <CheckCircle size={14} className="text-accent shrink-0 mt-0.5" />
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Requirements */}
            {course.requirements && course.requirements.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-5">{t('courses.section.requirements')}</h2>
                <ul className="space-y-2">
                  {course.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-400">
                      <span className="text-accent mt-1">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Description */}
            {desc && (
              <section>
                <h2 className="text-xl font-bold text-white mb-5">{t('courses.section.description')}</h2>
                <div className="text-neutral-400 text-sm leading-relaxed whitespace-pre-line">{desc}</div>
              </section>
            )}

            {/* Curriculum */}
            {course.sections.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-2">{t('courses.section.curriculum')}</h2>
                <p className="text-neutral-500 text-sm mb-5">
                  {course.sections.length} {t('courses.curriculum.sections')} · {totalLectures} {t('courses.curriculum.lectures')}
                  {course.total_duration_minutes > 0 && ` · ${formatMinutes(course.total_duration_minutes)}`}
                </p>
                <div className="space-y-2">
                  {course.sections.map(section => {
                    const open = expandedSections.has(section.id);
                    const sectionTitle = (language === 'lv' && section.title_lv) ? section.title_lv : section.title_en;
                    const sectionDuration = section.lectures.reduce((acc, l) => acc + l.video_duration_seconds, 0);
                    return (
                      <div key={section.id} className="rounded-xl border border-white/8 overflow-hidden">
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full flex items-center justify-between px-5 py-4 bg-[#0f0c1e] hover:bg-white/3 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            {open ? <ChevronUp size={14} className="text-neutral-500 shrink-0" /> : <ChevronDown size={14} className="text-neutral-500 shrink-0" />}
                            <span className="text-white font-medium text-sm">{sectionTitle}</span>
                          </div>
                          <span className="text-neutral-500 text-xs shrink-0 ml-4">
                            {section.lectures.length} lectures{sectionDuration > 0 ? ` · ${formatDuration(sectionDuration)}` : ''}
                          </span>
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              key="content"
                              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              {section.lectures.map(lecture => {
                                const lecTitle = (language === 'lv' && lecture.title_lv) ? lecture.title_lv : lecture.title_en;
                                return (
                                  <div key={lecture.id}
                                    className="flex items-center justify-between px-5 py-3 border-t border-white/5 text-sm hover:bg-white/2">
                                    <div className="flex items-center gap-3">
                                      {lecture.is_preview
                                        ? <Play size={13} className="text-accent shrink-0" />
                                        : <Lock size={13} className="text-neutral-600 shrink-0" />
                                      }
                                      <span className={lecture.is_preview ? 'text-neutral-300' : 'text-neutral-500'}>{lecTitle}</span>
                                      {lecture.is_preview && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent">Preview</span>
                                      )}
                                    </div>
                                    {lecture.video_duration_seconds > 0 && (
                                      <span className="text-neutral-600 text-xs shrink-0 ml-4">{formatDuration(lecture.video_duration_seconds)}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Instructor */}
            {course.instructor && (
              <section>
                <h2 className="text-xl font-bold text-white mb-5">{t('courses.section.instructor')}</h2>
                <div className="flex items-start gap-4">
                  {course.instructor.avatar_url ? (
                    <Image src={course.instructor.avatar_url} alt={course.instructor.full_name ?? ''} width={64} height={64}
                      className="rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <span className="text-accent text-xl font-bold">{course.instructor.full_name?.[0]}</span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-semibold">{course.instructor.full_name}</h3>
                    {course.instructor.bio && (
                      <p className="text-neutral-400 text-sm mt-2 leading-relaxed">{course.instructor.bio}</p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Reviews */}
            {course.reviews && course.reviews.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-white mb-5">
                  {t('courses.section.reviews')}
                  <span className="ml-2 text-neutral-500 font-normal text-base">({course.reviews.length})</span>
                </h2>
                <div className="space-y-4">
                  {course.reviews.slice(0, 6).map(review => (
                    <div key={review.id} className="p-5 rounded-xl border border-white/8 bg-[#0f0c1e]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-bold">
                          {review.reviewer?.full_name?.[0] ?? '?'}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{review.reviewer?.full_name ?? 'Student'}</p>
                          <StarRating rating={review.rating} showCount={false} size={12} />
                        </div>
                      </div>
                      {review.review_text && (
                        <p className="text-neutral-400 text-sm leading-relaxed">{review.review_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Spacer for sticky card alignment on desktop */}
          <div />
        </div>
      </div>
    </div>
  );
}
