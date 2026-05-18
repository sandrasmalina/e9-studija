'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import CourseCard, { CourseCardData } from '@/components/courses/CourseCard';

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

interface Category {
  id: string;
  slug: string;
  name_en: string;
  name_lv: string | null;
  icon: string | null;
}

interface Props {
  category: Category;
  courses: CourseCardData[];
}

export default function CategoryPageClient({ category, courses }: Props) {
  const { t, language } = useLanguage();
  const name = (language === 'lv' && category.name_lv) ? category.name_lv : category.name_en;

  return (
    <div className="min-h-screen bg-bg pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-6">

        <Link href="/courses" className="inline-flex items-center gap-2 text-neutral-500 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft size={14} />
          {t('courses.back')}
        </Link>

        <motion.div initial="hidden" animate="visible" variants={stagger} className="mb-12">
          {category.icon && (
            <motion.p variants={fadeUp} className="text-3xl mb-2">{category.icon}</motion.p>
          )}
          <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-white mb-3">
            {name}
          </motion.h1>
          <motion.p variants={fadeUp} className="text-neutral-500 text-sm">
            {courses.length} {courses.length === 1 ? 'course' : 'courses'}
          </motion.p>
        </motion.div>

        {courses.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center gap-4">
            <BookOpen size={40} className="text-neutral-700" />
            <p className="text-neutral-500">{t('courses.empty')}</p>
            <Link href="/courses" className="text-accent text-sm hover:underline">{t('courses.back')}</Link>
          </div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <motion.div key={course.id} variants={fadeUp}>
                <CourseCard course={course} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
