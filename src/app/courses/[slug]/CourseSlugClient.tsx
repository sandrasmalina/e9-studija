'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import CourseThumbnailImage from '@/components/courses/CourseThumbnailImage';
import {
  Clock, BookOpen, Users, Award, ChevronDown, ChevronUp,
  Play, Lock, CheckCircle, Globe, ArrowLeft, Star, Loader2, X, Mail, Moon, Sun, Heart
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import StarRating from '@/components/courses/StarRating';
import PriceBadge from '@/components/courses/PriceBadge';
import { buildLegalAcceptanceMetadata, getLatestLegalDocumentRefs } from '@/lib/legal-documents';

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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function extractVimeoId(url: string): string {
  const m = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  return m ? m[1] : url;
}

function extractVimeoHash(url: string): string | null {
  const hParam = url.match(/[?&]h=([a-zA-Z0-9]+)/);
  if (hParam) return hParam[1];
  const pathHash = url.match(/vimeo\.com\/\d+\/([a-zA-Z0-9]+)/);
  return pathHash ? pathHash[1] : null;
}

function extractYouTubeId(url: string): string {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : url;
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

interface AvailabilityGroup {
  id: string;
  name_en: string | null;
  name_lv: string | null;
  language: string | null;
  starts_at: string | null;
  ends_at: string | null;
  capacity: number | null;
  sort_order: number | null;
}

interface CourseInstructor {
  instructor_id: string;
  sort_order: number | null;
  instructor: { id: string; full_name: string | null; avatar_url: string | null; bio: string | null; bio_lv: string | null; website: string | null } | null;
}

interface Course {
  id: string;
  slug: string;
  title_en: string;
  title_lv: string | null;
  description_en: string | null;
  description_lv: string | null;
  learning_schedule_en: string | null;
  learning_schedule_lv: string | null;
  short_description_en: string | null;
  short_description_lv: string | null;
  thumbnail_url: string | null;
  thumbnail_url_lv: string | null;
  promo_video_url: string | null;
  promo_video_type: string | null;
  price: number;
  discount_price: number | null;
  discount_starts_at: string | null;
  discount_ends_at: string | null;
  currency: string;
  is_free: boolean;
  billing_type: string | null;
  subscription_interval: string | null;
  access_duration_months: number | null;
  level: string | null;
  language: string;
  delivery_mode: string | null;
  total_duration_minutes: number;
  total_lectures: number;
  enrollment_count: number;
  fake_enrollment_count: number | null;
  rating_avg: number;
  rating_count: number;
  certificate_enabled: boolean;
  requirements: string[] | null;
  requirements_lv: string[] | null;
  what_you_learn: string[] | null;
  what_you_learn_lv: string[] | null;
  target_audience: string | null;
  target_audience_lv: string | null;
  published_at: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  instructor: { id: string; full_name: string | null; avatar_url: string | null; bio: string | null; bio_lv: string | null; website: string | null } | null;
  course_instructors: CourseInstructor[] | null;
  category: { name_en: string; name_lv: string | null; slug: string; icon: string | null } | null;
  course_availability_groups: AvailabilityGroup[] | null;
  sections: Section[];
  reviews: Review[];
}

export default function CourseSlugClient({ course, isPreview = false }: { course: Course; isPreview?: boolean }) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoEnroll = searchParams.get('auto_enroll') === '1';
  const autoEnrollRef = useRef(false);
  const [contentTheme, setContentTheme] = useState<'dark' | 'light'>('dark');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([course.sections[0]?.id]));
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('e9-content-theme');
    if (saved === 'light' || saved === 'dark') setContentTheme(saved);
  }, []);

  const toggleContentTheme = () => {
    setContentTheme(current => {
      const next = current === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('e9-content-theme', next);
      return next;
    });
  };

  // Auth + enrollment state
  const [enrollState, setEnrollState] = useState<'loading' | 'not-authed' | 'enrolled' | 'not-enrolled'>('loading');
  const [wishlistState, setWishlistState] = useState<'loading' | 'saved' | 'not-saved'>('loading');
  const [wishlistSaving, setWishlistSaving] = useState(false);

  // Enrollment modal (for unauthenticated users)
  const [showModal, setShowModal] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState(false);
  const [enrollUserId, setEnrollUserId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  // Review state
  const [localReviews, setLocalReviews] = useState<Review[]>(course.reviews ?? []);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setEnrollState('not-authed'); setWishlistState('not-saved'); return; }
      setEnrollUserId(user.id);

      const [{ data: enrollment }, { data: wishlistItem }] = await Promise.all([
        supabase
          .from('enrollments')
          .select('id, status, expires_at')
          .eq('user_id', user.id)
          .eq('course_id', course.id)
          .maybeSingle(),
        supabase
          .from('wishlists')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', course.id)
          .maybeSingle(),
      ]);

      setWishlistState(wishlistItem ? 'saved' : 'not-saved');

      const isExpired = enrollment?.expires_at ? new Date(enrollment.expires_at).getTime() <= Date.now() : false;
      if (enrollment?.status === 'active' && !isExpired) {
        setEnrollState('enrolled');
        // Check if user already left a review
        const { data: rev } = await supabase
          .from('reviews')
          .select('id, rating, review_text, created_at')
          .eq('course_id', course.id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (rev) {
          setUserReview({ ...rev, reviewer: null });
          setReviewDone(true);
        }
      } else {
        setEnrollState('not-enrolled');
      }
    })();
  }, [course.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnrollFree = async () => {
    if (!enrollUserId) return;
    setEnrolling(true);
    const expiresAt = course.access_duration_months ? (() => {
      const next = new Date();
      next.setMonth(next.getMonth() + course.access_duration_months);
      return next.toISOString();
    })() : null;
    const { error } = await supabase.from('enrollments').upsert({
      user_id: enrollUserId,
      course_id: course.id,
      amount_paid: 0,
      currency: course.currency,
      status: 'active',
      expires_at: expiresAt,
    }, { onConflict: 'user_id,course_id' });
    if (!error || error.code === '23505') {
      const { documents: legalDocuments } = await getLatestLegalDocumentRefs(supabase);
      if (legalDocuments.length > 0) {
        await supabase.from('legal_acceptances').upsert(
          legalDocuments.map(document => ({
            user_id: enrollUserId,
            document_id: document.id,
            document_type: document.document_type,
            version: document.version,
            accepted_at: new Date().toISOString(),
            source: 'free_course_enroll',
          })),
          { onConflict: 'user_id,document_type,version', ignoreDuplicates: true },
        );
      }
      router.push(`/learn/${course.slug}`);
    } else {
      setEnrolling(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!enrollUserId) {
      router.push('/auth/login');
      return;
    }

    setWishlistSaving(true);
    if (wishlistState === 'saved') {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', enrollUserId)
        .eq('course_id', course.id);
      if (!error) setWishlistState('not-saved');
    } else {
      const { error } = await supabase
        .from('wishlists')
        .upsert({ user_id: enrollUserId, course_id: course.id }, { onConflict: 'user_id,course_id' });
      if (!error) setWishlistState('saved');
    }
    setWishlistSaving(false);
  };

  // Auto-enroll after email confirmation redirect (?auto_enroll=1)
  useEffect(() => {
    if (!autoEnroll || autoEnrollRef.current) return;
    if (enrollState === 'not-enrolled' && enrollUserId) {
      autoEnrollRef.current = true;
      handleEnrollFree();
    }
  }, [autoEnroll, enrollState, enrollUserId]); // eslint-disable-line

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = modalEmail.trim();
    const name = modalName.trim();
    if (!email) { setModalError('Email is required'); return; }
    setModalLoading(true);
    setModalError('');

    if (course.is_free || course.price === 0) {
      const { documents: legalDocuments, error: legalError } = await getLatestLegalDocumentRefs(supabase);
      if (legalError || legalDocuments.length === 0) {
        setModalError(legalError?.message ?? 'Legal documents are not available. Please try again later.');
        setModalLoading(false);
        return;
      }
      // Free course: send magic link → auto-enroll after confirmation
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: {
            full_name: name,
            legal_acceptance: buildLegalAcceptanceMetadata(legalDocuments, 'free_course_signup'),
          },
          emailRedirectTo: `${window.location.origin}/courses/${course.slug}?auto_enroll=1`,
          shouldCreateUser: true,
        },
      });
      if (error) {
        setModalError(error.message);
        setModalLoading(false);
      } else {
        setModalSuccess(true);
      }
    } else {
      // Paid course: guest checkout — Stripe collects payment, webhook creates account
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseSlug: course.slug, guestEmail: email, guestName: name, language }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setModalError(data.error || 'Could not start checkout. Please try again.');
        setModalLoading(false);
      }
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollUserId) return;
    setReviewSubmitting(true);
    const { data: newRev, error } = await supabase.from('reviews').upsert(
      { course_id: course.id, user_id: enrollUserId, rating: reviewRating, review_text: reviewText || null },
      { onConflict: 'course_id,user_id' }
    ).select('id, rating, review_text, created_at').maybeSingle();
    if (!error && newRev) {
      setLocalReviews(prev => {
        const without = prev.filter(r => r.id !== newRev.id);
        return [{ ...newRev, reviewer: null }, ...without];
      });
      setUserReview({ ...newRev, reviewer: null });
      setReviewDone(true);
      // Recompute rating stats on the course
      const { data: allRatings } = await supabase.from('reviews').select('rating').eq('course_id', course.id);
      if (allRatings && allRatings.length > 0) {
        const avg = allRatings.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / allRatings.length;
        await supabase.from('courses').update({
          rating_count: allRatings.length,
          rating_avg: Math.round(avg * 10) / 10,
        }).eq('id', course.id);
      }
    }
    setReviewSubmitting(false);
  };

  const title = (language === 'lv' && course.title_lv) ? course.title_lv : course.title_en;
  const desc = (language === 'lv' && course.description_lv) ? course.description_lv : course.description_en;
  const learningSchedule = (language === 'lv' && course.learning_schedule_lv)
    ? course.learning_schedule_lv
    : (course.language === 'lv' && course.learning_schedule_lv ? course.learning_schedule_lv : course.learning_schedule_en);
  const useLatvianThumbnail = course.language === 'lv' || (course.language === 'both' && language === 'lv');
  const thumbnailUrl = useLatvianThumbnail
    ? (course.thumbnail_url_lv || course.thumbnail_url)
    : (course.thumbnail_url || course.thumbnail_url_lv);
  const assignedInstructor = (course.course_instructors ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .find(row => row.instructor?.full_name)?.instructor ?? null;
  const displayInstructor = course.instructor?.full_name ? course.instructor : assignedInstructor;
  const learningOutcomes = (language === 'lv' && course.what_you_learn_lv?.length) ? course.what_you_learn_lv : course.what_you_learn;
  const requirements = (language === 'lv' && course.requirements_lv?.length) ? course.requirements_lv : course.requirements;
  const instructorBio = displayInstructor
    ? ((language === 'lv' && displayInstructor.bio_lv) ? displayInstructor.bio_lv : displayInstructor.bio)
    : null;
  const targetAudience = ((language === 'lv' && course.target_audience_lv) ? course.target_audience_lv : course.target_audience)
    ?.split('\n')
    .map(item => item.trim())
    .filter(Boolean) ?? [];
  const courseLanguageLabel = course.language === 'both' ? 'EN + LV' : course.language.toUpperCase();
  const groupLanguageLabel = (groupLanguage: string | null) => groupLanguage === 'both' ? 'EN + LV' : (groupLanguage || course.language).toUpperCase();
  const deliveryModeLabel = language === 'lv'
    ? ({ online: 'Tiešsaistē', live: 'Klātienē', hybrid: 'Hibrīds' } as Record<string, string>)[course.delivery_mode || 'online'] || 'Tiešsaistē'
    : ({ online: 'Online', live: 'Live', hybrid: 'Hybrid' } as Record<string, string>)[course.delivery_mode || 'online'] || 'Online';
  const availabilityGroups = (course.course_availability_groups ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const displayStudentCount = (course.enrollment_count || 0) + (course.fake_enrollment_count || 0);
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
    <div className={`content-page content-theme-${contentTheme} min-h-screen bg-bg`}>
      <button
        type="button"
        onClick={toggleContentTheme}
        className="fixed right-5 top-24 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-bg-card/90 text-neutral-400 shadow-2xl backdrop-blur transition-colors hover:text-white"
        title={contentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {contentTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      {isPreview && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full border border-amber-400/30 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-200 shadow-2xl backdrop-blur">
          Draft preview
        </div>
      )}
      {/* Hero */}
      <div className="bg-[#0f0c1e] border-b border-white/5 pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Link href="/courses" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white text-sm mb-5 transition-colors">
            <ArrowLeft size={14} />
            {t('courses.back')}
          </Link>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,404px)] gap-8 xl:gap-10 items-start">
            {/* Left: info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl pt-1">
              {course.category && (
                <Link href={`/courses/category/${course.category.slug}`}
                  className="inline-flex items-center gap-1.5 text-accent text-xs font-medium uppercase tracking-wider mb-3 hover:underline">
                  {course.category.icon && <span>{course.category.icon}</span>}
                  {categoryName}
                </Link>
              )}
              <h1 className="break-words text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{title}</h1>
              {course.short_description_en && (
                <p className="text-neutral-400 text-lg mb-5 leading-relaxed max-w-2xl">
                  {language === 'lv' && course.short_description_lv ? course.short_description_lv : course.short_description_en}
                </p>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-400 mb-5">
                {course.rating_count > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 font-bold">{Number(course.rating_avg).toFixed(1)}</span>
                    <StarRating rating={Number(course.rating_avg)} count={course.rating_count} />
                  </div>
                )}
                <span className="flex items-center gap-1.5"><Users size={14} />{displayStudentCount.toLocaleString()} students</span>
                {course.total_duration_minutes > 0 && (
                  <span className="flex items-center gap-1.5"><Clock size={14} />{formatMinutes(course.total_duration_minutes)}</span>
                )}
                {totalLectures > 0 && (
                  <span className="flex items-center gap-1.5"><BookOpen size={14} />{totalLectures} lectures</span>
                )}
                {course.level && (
                  <span className="flex items-center gap-1.5 capitalize">{course.level}</span>
                )}
                <span className="flex items-center gap-1.5"><Globe size={14} />{courseLanguageLabel}</span>
              </div>

              {displayInstructor?.full_name && (
                <div className="flex items-center gap-3 mb-6">
                  {displayInstructor.avatar_url && (
                    <img src={displayInstructor.avatar_url} alt={displayInstructor.full_name}
                      className="h-8 w-8 rounded-full object-cover" />
                  )}
                  <span className="text-neutral-400 text-sm">
                    {t('courses.by')} <span className="text-accent">{displayInstructor.full_name}</span>
                  </span>
                </div>
              )}

              {learningOutcomes && learningOutcomes.length > 0 && (
                <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                  <h2 className="text-base font-bold text-white mb-4">{t('courses.section.learn')}</h2>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                    {learningOutcomes.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                        <CheckCircle size={14} className="text-accent shrink-0 mt-0.5" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Right: sticky buy card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl border border-white/10 bg-[#16122a] overflow-hidden shadow-2xl shadow-black/10 lg:fixed lg:right-6 lg:top-24 lg:z-30 lg:w-[360px] xl:w-[404px] 2xl:right-[calc((100vw-80rem)/2+1.5rem)]">
              {/* Thumbnail / promo */}
              <div className="relative aspect-video bg-bg-secondary overflow-hidden">
                <CourseThumbnailImage
                  thumbnailUrl={course.thumbnail_url}
                  thumbnailUrlLv={course.thumbnail_url_lv}
                  promoVideoUrl={course.promo_video_url}
                  promoVideoType={course.promo_video_type}
                  language={language}
                  alt={title}
                />
                {course.promo_video_url && (
                  <button
                    type="button"
                    onClick={() => setVideoPlaying(true)}
                    aria-label="Play promo video"
                    className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/45 transition-colors group"
                  >
                    <div className="w-16 h-16 rounded-full bg-black/55 border-2 border-white/70 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600/80 transition-all duration-200 shadow-2xl">
                      <Play size={26} className="text-white ml-1.5" />
                    </div>
                  </button>
                )}
              </div>

              <div className="p-5">
                {enrollState !== 'enrolled' && (
                  <PriceBadge
                    price={Number(course.price)}
                    discountPrice={course.discount_price ? Number(course.discount_price) : null}
                    discountStartsAt={course.discount_starts_at}
                    discountEndsAt={course.discount_ends_at}
                    currency={course.currency}
                    isFree={course.is_free}
                    billingType={course.billing_type}
                    subscriptionInterval={course.subscription_interval}
                  />
                )}
                {enrollState === 'enrolled' && (
                  <div className="flex items-center gap-2 rounded-xl border border-green-500/25 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-300">
                    <Award size={16} className="shrink-0" />
                    {language === 'lv' ? 'Tev ir piekļuve šim kursam' : 'You have access to this course'}
                  </div>
                )}

                {/* Enrollment CTA — dynamic based on auth + enrollment state */}
                <div className="mt-4">
                  {isPreview && (
                    <div className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 text-center text-sm font-medium text-zinc-400">
                      Preview mode — enrollment disabled
                    </div>
                  )}
                  {!isPreview && enrollState === 'loading' && (
                    <div className="w-full py-3 flex items-center justify-center rounded-xl bg-accent/10">
                      <Loader2 size={18} className="text-accent animate-spin" />
                    </div>
                  )}
                  {!isPreview && enrollState === 'enrolled' && (
                    <Link href={`/learn/${course.slug}`}>
                      <Button className="w-full text-base py-3">{language === 'lv' ? 'Turpināt mācības →' : 'Continue Learning →'}</Button>
                    </Link>
                  )}
                  {!isPreview && enrollState === 'not-enrolled' && (course.is_free || course.price === 0) && (
                    <Button className="w-full text-base py-3" onClick={handleEnrollFree} disabled={enrolling}>
                      {enrolling ? <Loader2 size={16} className="animate-spin mx-auto" /> : (t('courses.enroll.free') || 'Enroll for Free')}
                    </Button>
                  )}
                  {!isPreview && enrollState === 'not-enrolled' && !course.is_free && course.price > 0 && (
                    <Link href={`/checkout/${course.slug}`}>
                      <Button className="w-full text-base py-3">{course.billing_type === 'subscription' ? (language === 'lv' ? 'Abonēt kursu' : 'Subscribe') : (t('courses.enroll.paid') || 'Buy Course')}</Button>
                    </Link>
                  )}
                  {!isPreview && enrollState === 'not-authed' && (course.is_free || course.price === 0) && (
                    <Button className="w-full text-base py-3" onClick={() => setShowModal(true)}>
                      {t('courses.enroll.free') || 'Enroll for Free'}
                    </Button>
                  )}
                  {!isPreview && enrollState === 'not-authed' && !course.is_free && course.price > 0 && (
                    <Link href={`/checkout/${course.slug}`}>
                      <Button className="w-full text-base py-3">{course.billing_type === 'subscription' ? (language === 'lv' ? 'Abonēt kursu' : 'Subscribe') : (t('courses.enroll.paid') || 'Buy Course')}</Button>
                    </Link>
                  )}
                </div>

                {!isPreview && (
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    disabled={wishlistSaving || wishlistState === 'loading'}
                    className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${wishlistState === 'saved' ? 'border-pink-500/30 bg-pink-500/10 text-pink-300 hover:bg-pink-500/15' : 'border-white/10 bg-white/[0.03] text-neutral-300 hover:border-pink-500/30 hover:text-pink-300'}`}
                  >
                    {wishlistSaving || wishlistState === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} fill={wishlistState === 'saved' ? 'currentColor' : 'none'} />}
                    {wishlistState === 'saved'
                      ? (language === 'lv' ? 'Saglabāts vēlmju sarakstā' : 'Saved to wishlist')
                      : (language === 'lv' ? 'Pievienot vēlmju sarakstam' : 'Add to wishlist')}
                  </button>
                )}

                {previewLectures.length > 0 && (
                  <p className="text-center text-xs text-neutral-500 mt-3">{t('courses.preview.hint')}</p>
                )}

                <ul className="mt-4 grid gap-2 text-sm text-neutral-400 sm:grid-cols-2 lg:grid-cols-1">
                  <li className="flex items-center gap-2"><Globe size={14} className="text-accent shrink-0" />{language === 'lv' ? 'Formāts' : 'Format'}: {deliveryModeLabel}</li>
                  {course.certificate_enabled && (
                    <li className="flex items-center gap-2"><Award size={14} className="text-accent shrink-0" />{t('courses.feature.certificate')}</li>
                  )}
                  <li className="flex items-center gap-2"><Clock size={14} className="text-accent shrink-0" />{t('courses.feature.lifetime')}</li>
                  {totalLectures > 0 && (
                    <li className="flex items-center gap-2"><BookOpen size={14} className="text-accent shrink-0" />{totalLectures} {t('courses.feature.lectures')}</li>
                  )}
                  {course.starts_at && (
                    <li className="flex items-center gap-2"><Clock size={14} className="text-accent shrink-0" />{language === 'lv' ? 'Atveras' : 'Opens'} {formatDate(course.starts_at)}</li>
                  )}
                  {course.ends_at && (
                    <li className="flex items-center gap-2"><Clock size={14} className="text-accent shrink-0" />{language === 'lv' ? 'Noslēdzas' : 'Finishes'} {formatDate(course.ends_at)}</li>
                  )}
                </ul>

                {availabilityGroups.length > 0 && (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <button type="button" onClick={() => setGroupsOpen(open => !open)} className="flex w-full items-center justify-between gap-3 text-left">
                      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{language === 'lv' ? 'Grupas un vietas' : 'Groups and spots'}</span>
                      <span className="flex items-center gap-1 text-xs text-neutral-500">
                        {availabilityGroups.length} {language === 'lv' ? 'grupas' : 'groups'}
                        {groupsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </button>
                    {groupsOpen && <div className="mt-3 space-y-2">
                      {availabilityGroups.map(group => {
                        const groupName = (language === 'lv' && group.name_lv) ? group.name_lv : group.name_en || group.name_lv || (language === 'lv' ? 'Grupa' : 'Group');
                        const spots = group.capacity && group.capacity > 0
                          ? `${group.capacity} ${language === 'lv' ? 'vietas' : 'spots'}`
                          : `∞ ${language === 'lv' ? 'vietas' : 'spots'}`;
                        return (
                          <div key={group.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <p className="font-medium text-white">{groupName}</p>
                              <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">{spots}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
                              <span>{groupLanguageLabel(group.language)}</span>
                              {group.starts_at && <span>{language === 'lv' ? 'Sākas' : 'Starts'} {formatDate(group.starts_at)}</span>}
                              {group.ends_at && <span>{language === 'lv' ? 'Beidzas' : 'Ends'} {formatDate(group.ends_at)}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 sm:py-10 lg:pr-[444px] xl:pr-[488px]">
        <div className="max-w-4xl space-y-10">

            {((requirements && requirements.length > 0) || targetAudience.length > 0) && (
              <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/5">
                <div className="grid lg:grid-cols-2">
                {requirements && requirements.length > 0 && (
                  <div className="p-6 sm:p-7">
                    <h2 className="text-xl font-bold text-white mb-5">{t('courses.section.requirements')}</h2>
                    <ul className="space-y-3">
                      {requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-neutral-400">
                          <CheckCircle size={15} className="text-accent shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {targetAudience.length > 0 && (
                  <div className="border-t border-white/10 p-6 sm:p-7 lg:border-l lg:border-t-0">
                    <h2 className="text-xl font-bold text-white mb-5">{language === 'lv' ? 'Kam šis kurss ir paredzēts' : 'Who this course is for'}</h2>
                    <ul className="space-y-3">
                      {targetAudience.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-sm text-neutral-400">
                          <Users size={15} className="text-accent shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                </div>
              </section>
            )}

            {/* Description */}
            {learningSchedule && (
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-7">
                <h2 className="text-xl font-bold text-white mb-5">{language === 'lv' ? 'Mācību datumi un formāts' : 'Learning Dates and Format'}</h2>
                <div className="course-description-content prose prose-invert prose-sm max-w-none text-neutral-400 [&_h2]:text-white [&_h3]:text-neutral-200 [&_a]:text-purple-400 [&_a:hover]:text-purple-300" dangerouslySetInnerHTML={{ __html: learningSchedule }} />
              </section>
            )}

            {desc && (
              <section>
                <h2 className="text-xl font-bold text-white mb-5">{t('courses.section.description')}</h2>
                <div className="course-description-content prose prose-invert prose-sm max-w-none text-neutral-400 [&_h2]:text-white [&_h3]:text-neutral-200 [&_a]:text-purple-400 [&_a:hover]:text-purple-300" dangerouslySetInnerHTML={{ __html: desc }} />
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
                          className="w-full flex items-start justify-between gap-3 px-4 py-4 sm:px-5 bg-[#0f0c1e] hover:bg-white/3 transition-colors text-left"
                        >
                          <div className="min-w-0 flex items-start gap-3">
                            {open ? <ChevronUp size={14} className="text-neutral-500 shrink-0" /> : <ChevronDown size={14} className="text-neutral-500 shrink-0" />}
                            <span className="break-words text-white font-medium text-sm">{sectionTitle}</span>
                          </div>
                          <span className="text-right text-neutral-500 text-xs shrink-0">
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
                                    className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5 border-t border-white/5 text-sm hover:bg-white/2">
                                    <div className="min-w-0 flex items-start gap-3">
                                      {lecture.is_preview
                                        ? <Play size={13} className="text-accent shrink-0" />
                                        : <Lock size={13} className="text-neutral-600 shrink-0" />
                                      }
                                      <span className={`${lecture.is_preview ? 'text-neutral-300' : 'text-neutral-500'} break-words`}>{lecTitle}</span>
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
            {displayInstructor && (
              <section>
                <h2 className="text-xl font-bold text-white mb-5">{t('courses.section.instructor')}</h2>
                <div className="flex items-start gap-4">
                  {displayInstructor.avatar_url ? (
                    <img src={displayInstructor.avatar_url} alt={displayInstructor.full_name ?? ''}
                      className="h-16 w-16 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <span className="text-accent text-xl font-bold">{displayInstructor.full_name?.[0]}</span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-semibold">{displayInstructor.full_name}</h3>
                    {instructorBio && (
                      <p className="text-neutral-400 text-sm mt-2 leading-relaxed">{instructorBio}</p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Reviews */}
            <section>
              <h2 className="text-xl font-bold text-white mb-5">
                {t('courses.section.reviews')}
                {localReviews.length > 0 && (
                  <span className="ml-2 text-neutral-500 font-normal text-base">({localReviews.length})</span>
                )}
              </h2>

              {/* Review submission form — only for enrolled students */}
              {enrollState === 'enrolled' && (
                <div className="mb-6 p-5 rounded-xl border border-white/8 bg-[#0f0c1e]">
                  {reviewDone ? (
                    <div className="text-center py-2">
                      <CheckCircle size={20} className="text-accent mx-auto mb-2" />
                      <p className="text-white text-sm font-medium">Review submitted</p>
                      {userReview?.review_text && (
                        <p className="text-neutral-400 text-xs mt-1 italic">&ldquo;{userReview.review_text}&rdquo;</p>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitReview}>
                      <p className="text-white text-sm font-medium mb-3">Leave a review</p>
                      {/* Star picker */}
                      <div className="flex items-center gap-1 mb-4">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} type="button" onClick={() => setReviewRating(n)}
                            className="focus:outline-none transition-transform hover:scale-110">
                            <Star size={22}
                              className={n <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-600'}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-neutral-400 text-xs">{reviewRating}/5</span>
                      </div>
                      <textarea
                        value={reviewText}
                        onChange={e => setReviewText(e.target.value)}
                        placeholder="Share your experience (optional)..."
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-accent/50 resize-none"
                      />
                      <div className="flex justify-end mt-3">
                        <button type="submit" disabled={reviewSubmitting}
                          className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2">
                          {reviewSubmitting && <Loader2 size={13} className="animate-spin" />}
                          Submit Review
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {localReviews.length > 0 && (
                <div className="space-y-4">
                  {localReviews.slice(0, 6).map(review => (
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
              )}
            </section>
        </div>
      </div>

      {/* Enrollment modal for unauthenticated users */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f0c1e] border border-white/10 rounded-2xl p-8 relative">
            <button onClick={() => { setShowModal(false); setModalError(''); setModalSuccess(false); setModalEmail(''); setModalName(''); }}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
              <X size={18} />
            </button>

            {modalSuccess ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Mail size={24} className="text-accent" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Check your inbox</h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  We sent a magic link to <span className="text-white font-medium">{modalEmail}</span>.
                  Click it to create your account and get instant access to this course.
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-white font-bold text-lg mb-1">
                  {course.is_free || course.price === 0 ? 'Enroll for Free' : 'Get Course Access'}
                </h3>
                <p className="text-neutral-500 text-sm mb-6">
                  {course.is_free || course.price === 0
                    ? 'Enter your email to get instant free access. No password needed.'
                    : 'Enter your details to continue to payment. Your account will be created after purchase.'}
                </p>
                <form onSubmit={handleModalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-neutral-400 text-xs mb-1.5">Full Name (optional)</label>
                    <input
                      type="text"
                      value={modalName}
                      onChange={e => setModalName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-accent/50"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 text-xs mb-1.5">Email address</label>
                    <input
                      type="email"
                      required
                      value={modalEmail}
                      onChange={e => setModalEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-accent/50"
                    />
                  </div>
                  {modalError && (
                    <p className="text-red-400 text-xs">{modalError}</p>
                  )}
                  <p className="text-xs leading-relaxed text-neutral-500">
                    By continuing, you agree to the{' '}
                    <Link href="/terms" target="_blank" className="text-accent hover:underline">Terms of Service</Link>
                    {' '}and acknowledge the{' '}
                    <Link href="/privacy" target="_blank" className="text-accent hover:underline">Privacy Policy</Link>.
                  </p>
                  <button type="submit" disabled={modalLoading}
                    className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                    {modalLoading && <Loader2 size={15} className="animate-spin" />}
                    {course.is_free || course.price === 0 ? 'Get Free Access' : 'Continue to Payment'}
                  </button>
                  <p className="text-center text-neutral-600 text-xs">
                    Already have an account?{' '}
                    <button type="button" onClick={() => router.push(`/auth/login?redirect=/courses/${course.slug}`)}
                      className="text-accent hover:underline">Sign in</button>
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Promo video modal */}
      <AnimatePresence>
        {videoPlaying && course.promo_video_url && (
          <motion.div
            key="promo-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-sm"
            onClick={() => setVideoPlaying(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative w-full max-w-5xl"
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setVideoPlaying(false)}
                className="absolute -top-10 right-0 flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
              >
                <X size={18} /> Close
              </button>
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl">
                {course.promo_video_type === 'vimeo' ? (
                  <iframe
                    src={`https://player.vimeo.com/video/${extractVimeoId(course.promo_video_url)}?${extractVimeoHash(course.promo_video_url) ? `h=${extractVimeoHash(course.promo_video_url)}&` : ''}autoplay=1&title=0&byline=0&portrait=0`}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title={title}
                  />
                ) : (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(course.promo_video_url)}?autoplay=1&rel=0&modestbranding=1`}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={title}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
