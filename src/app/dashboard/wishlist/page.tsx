'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Heart, PlayCircle, Trash2, ArrowRight, Star } from 'lucide-react';

interface WishlistItem {
  id: string;
  added_at: string;
  course: {
    id: string;
    title_en: string;
    title_lv: string | null;
    thumbnail_url: string | null;
    thumbnail_url_lv: string | null;
    language: string | null;
    slug: string;
    price: number | null;
    is_free: boolean;
    rating_avg: number | null;
    rating_count: number;
    instructor: { full_name: string } | null;
  };
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const { language } = useLanguage();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('wishlists')
        .select('id, added_at, course:courses(id, title_en, title_lv, thumbnail_url, thumbnail_url_lv, language, slug, price, is_free, rating_avg, rating_count, instructor:profiles!courses_instructor_id_fkey(full_name))')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });
      setItems((data ?? []) as unknown as WishlistItem[]);
      setLoading(false);
    })();
  }, []);

  const handleRemove = async (id: string) => {
    setRemoving(id);
    await supabase.from('wishlists').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    setRemoving(null);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Wishlist</h1>
        <p className="text-zinc-500 text-sm mt-1">{items.length} saved course{items.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-72 rounded-2xl bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <Heart size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Your wishlist is empty.</p>
          <Link href="/courses" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors">
            Browse Courses <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map(({ id, course }) => {
            const title = language === 'lv' && course.title_lv ? course.title_lv : course.title_en;
            const useLatvianThumbnail = course.language === 'lv' || (course.language === 'both' && language === 'lv');
            const thumbnailUrl = useLatvianThumbnail && course.thumbnail_url_lv ? course.thumbnail_url_lv : course.thumbnail_url;
            return (
              <div key={id} className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-purple-500/30 transition-all overflow-hidden">
                {/* Thumbnail */}
                <Link href={`/courses/${course.slug}`} className="block aspect-video bg-[#16122a] relative overflow-hidden">
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PlayCircle size={32} className="text-zinc-700" />
                    </div>
                  )}
                </Link>

                <div className="p-4">
                  <Link href={`/courses/${course.slug}`}>
                    <h3 className="text-white text-sm font-medium line-clamp-2 hover:text-purple-300 transition-colors">{title}</h3>
                  </Link>
                {course.instructor?.full_name && (
                  <p className="text-zinc-600 text-xs mt-1">{course.instructor.full_name}</p>
                )}

                <div className="flex items-center gap-2 mt-2">
                  {course.rating_avg && (
                    <span className="flex items-center gap-1 text-yellow-400 text-xs">
                      <Star size={11} fill="currentColor" /> {course.rating_avg.toFixed(1)}
                      <span className="text-zinc-600">({course.rating_count})</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="text-white font-semibold text-sm">
                    {course.is_free ? <span className="text-green-400">Free</span> : course.price ? `€${course.price}` : '—'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link href={`/courses/${course.slug}`}
                      className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-xs font-medium hover:bg-purple-600 transition-colors">
                      View Course
                    </Link>
                    <button onClick={() => handleRemove(id)} disabled={removing === id}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-900/20 transition-all disabled:opacity-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
