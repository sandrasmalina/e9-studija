'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { BookOpen, Award, Heart, ArrowRight, Clock, PlayCircle } from 'lucide-react';
import CourseThumbnailImage from '@/components/courses/CourseThumbnailImage';

interface EnrolledCourse {
  id: string;
  course: {
    id: string;
    title_en: string;
    title_lv: string | null;
    thumbnail_url: string | null;
    thumbnail_url_lv: string | null;
    promo_video_url: string | null;
    promo_video_type: string | null;
    language: string | null;
    slug: string;
  };
  progress_pct: number;
  last_accessed_at: string | null;
  completed_at: string | null;
}

interface Stats {
  enrolled: number;
  completed: number;
  certificates: number;
  wishlist: number;
}

export default function DashboardPage() {
  const [name, setName] = useState('');
  const [stats, setStats] = useState<Stats>({ enrolled: 0, completed: 0, certificates: 0, wishlist: 0 });
  const [recent, setRecent] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, enrollRes, wishRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('enrollments').select('id, progress_pct, completed_at, last_accessed_at, course:courses(id, title_en, title_lv, thumbnail_url, thumbnail_url_lv, promo_video_url, promo_video_type, language, slug)').eq('user_id', user.id).order('last_accessed_at', { ascending: false }),
        supabase.from('wishlists').select('id', { count: 'exact' }).eq('user_id', user.id),
      ]);

      const enrollments = (enrollRes.data ?? []) as unknown as EnrolledCourse[];
      const completed = enrollments.filter(e => e.completed_at).length;
      const certificates = completed; // 1:1 for now

      setName(profileRes.data?.full_name || user.email?.split('@')[0] || 'Student');
      setStats({ enrolled: enrollments.length, completed, certificates, wishlist: wishRes.count ?? 0 });
      setRecent(enrollments.slice(0, 3));
      setLoading(false);
    })();
  }, []);

  const STATS_CARDS = [
    { label: t('dashboard.stat.enrolled'), value: stats.enrolled, icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
    { label: t('dashboard.stat.completed'), value: stats.completed, icon: Award, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    { label: t('dashboard.stat.certificates'), value: stats.certificates, icon: Award, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { label: t('dashboard.stat.wishlist'), value: stats.wishlist, icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 rounded-xl bg-white/[0.06] animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/[0.04] animate-pulse" />)}
        </div>
        <div className="h-64 rounded-2xl bg-white/[0.04] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('dashboard.welcome').replace('{name}', name.split(' ')[0])}</h1>
        <p className="text-zinc-500 text-sm mt-1">{t('dashboard.summary')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl border ${bg} p-5`}>
            <Icon size={20} className={color} />
            <p className="text-3xl font-bold text-white mt-3">{value}</p>
            <p className="text-zinc-500 text-sm mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Continue Learning */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">{t('dashboard.continue')}</h2>
          <Link href="/dashboard/my-courses" className="text-purple-400 text-sm hover:text-purple-300 flex items-center gap-1 transition-colors">
            {t('dashboard.allCourses')} <ArrowRight size={14} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
            <BookOpen size={36} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">{t('dashboard.emptyCourses')}</p>
            <Link href="/courses" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors">
              {t('dashboard.browseCourses')} <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {recent.map(({ id, course, progress_pct, last_accessed_at }) => {
              const title = language === 'lv' && course.title_lv ? course.title_lv : course.title_en;
              const useLatvianThumbnail = course.language === 'lv' || (course.language === 'both' && language === 'lv');
              const thumbnailUrl = useLatvianThumbnail && course.thumbnail_url_lv ? course.thumbnail_url_lv : course.thumbnail_url;
              return (
                <Link key={id} href={`/learn/${course.slug}`}
                  className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-purple-500/30 transition-all overflow-hidden">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-[#16122a] relative overflow-hidden">
                    <CourseThumbnailImage
                      thumbnailUrl={course.thumbnail_url}
                      thumbnailUrlLv={course.thumbnail_url_lv}
                      promoVideoUrl={course.promo_video_url}
                      promoVideoType={course.promo_video_type}
                      language={course.language}
                      alt={title}
                    />
                    {/* Progress overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                      <div className="h-full bg-purple-500 transition-all" style={{ width: `${progress_pct ?? 0}%` }} />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white text-sm font-medium line-clamp-2 group-hover:text-purple-300 transition-colors">{title}</h3>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-purple-400 text-xs font-medium">{t('dashboard.progressComplete').replace('{value}', String(progress_pct ?? 0))}</span>
                      {last_accessed_at && (
                        <span className="text-zinc-600 text-xs flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(last_accessed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
