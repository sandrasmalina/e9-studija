'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, ArrowRight, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/Button';
import CourseCard, { CourseCardData } from '@/components/courses/CourseCard';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_lv: string | null;
  icon: string | null;
  sort_order: number;
}

export default function CoursesPage() {
  const { t, language } = useLanguage();
  const [courses, setCourses] = useState<CourseCardData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchCourses = useCallback(async (categorySlug: string, query: string) => {
    setLoading(true);
    let req = supabase
      .from('courses')
      .select(`
        id, slug, title_en, title_lv,
        short_description_en, short_description_lv,
        thumbnail_url, price, discount_price, currency,
        is_free, level, total_duration_minutes,
        total_lectures, enrollment_count, fake_enrollment_count, rating_avg, rating_count,
        instructor:profiles!instructor_id(full_name, avatar_url),
        category:categories!category_id(name_en, name_lv, slug)
      `)
      .eq('status', 'published')
      .order('enrollment_count', { ascending: false });

    if (categorySlug !== 'all') {
      // Filter by joining category slug
      req = req.eq('category.slug', categorySlug);
    }

    const { data, error } = await req;
    if (error) { setLoading(false); return; }

    let filtered = (data ?? []) as unknown as CourseCardData[];

    // Client-side filter when category is not 'all' (supabase may not filter foreign key eq properly)
    if (categorySlug !== 'all') {
      filtered = filtered.filter(c => c.category?.slug === categorySlug);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(c =>
        c.title_en.toLowerCase().includes(q) ||
        (c.title_lv?.toLowerCase().includes(q)) ||
        (c.short_description_en?.toLowerCase().includes(q))
      );
    }

    setCourses(filtered);
    setLoading(false);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.from('categories')
      .select('id, slug, name_en, name_lv, icon, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => { if (data) setCategories(data); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchCourses(activeCategory, search);
    }, search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [activeCategory, search, fetchCourses]);

  const categoryLabel = (cat: Category) =>
    language === 'lv' && cat.name_lv ? cat.name_lv : cat.name_en;

  return (
    <div className="min-h-screen bg-bg pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center mb-14">
          <motion.p variants={fadeUp} className="text-accent text-sm font-medium tracking-widest uppercase mb-3">
            {t('courses.eyebrow')}
          </motion.p>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-bold text-white mb-4">
            {t('courses.title')}
          </motion.h1>
          <motion.p variants={fadeUp} className="text-neutral-400 max-w-2xl mx-auto text-lg">
            {t('courses.subtitle')}
          </motion.p>
        </motion.div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="max-w-xl mx-auto mb-10 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('courses.search.placeholder')}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-accent/50 transition-colors"
          />
        </motion.div>

        {/* Category tabs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-2 justify-center mb-12">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all border ${
              activeCategory === 'all'
                ? 'bg-accent text-white border-accent'
                : 'border-white/8 text-neutral-400 hover:border-accent/30 hover:text-white'
            }`}
          >
            {t('courses.filter.all')}
          </button>
          {categories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all border flex items-center gap-1.5 ${
                activeCategory === cat.slug
                  ? 'bg-accent text-white border-accent'
                  : 'border-white/8 text-neutral-400 hover:border-accent/30 hover:text-white'
              }`}
            >
              {cat.icon && <span>{cat.icon}</span>}
              {categoryLabel(cat)}
            </button>
          ))}
        </motion.div>

        {/* Course grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/8 bg-[#0f0c1e] aspect-[4/5] animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-24 flex flex-col items-center gap-4">
            <BookOpen size={40} className="text-neutral-700" />
            <p className="text-neutral-500">{t('courses.empty')}</p>
          </motion.div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
            {courses.map(course => (
              <motion.div key={course.id} variants={fadeUp}>
                <CourseCard course={course} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Custom CTA */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="p-10 rounded-2xl border border-accent/20 bg-accent/5 text-center relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-80 h-40 bg-accent/10 rounded-full blur-[60px]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 relative">{t('courses.custom.title')}</h2>
          <p className="text-neutral-400 mb-6 relative">{t('courses.custom.subtitle')}</p>
          <Link href="/contact" className="relative">
            <Button>{t('courses.custom.button')} <ArrowRight size={14} className="ml-2" /></Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
