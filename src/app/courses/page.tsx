'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ExternalLink, BookOpen, Brain, Sparkles, Target, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/Button';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const courses = [
  { id: 1, title: 'Self-Healing & Personal Growth', description: 'Transform your life through evidence-based self-healing techniques and mindfulness practices.', icon: Sparkles, tags: ['Marketing', 'Personal Growth'], url: 'https://example.learnworlds.com/self-healing' },
  { id: 2, title: 'Business Innovation & Strategy', description: 'Master modern business strategies and leadership skills to drive growth.', icon: Target, tags: ['Business', 'Leadership'], url: 'https://example.learnworlds.com/business' },
  { id: 3, title: 'Creative Design Mastery', description: 'Unlock your creative potential with comprehensive design principles and tools.', icon: BookOpen, tags: ['Creativity', 'Design'], url: 'https://example.learnworlds.com/design' },
  { id: 4, title: 'AI & Technology Skills', description: 'Learn to leverage artificial intelligence and automation tools to enhance productivity.', icon: Brain, tags: ['AI Skills', 'Technology'], url: 'https://example.learnworlds.com/ai' },
  { id: 5, title: 'Instructional Design & Education', description: 'Become an expert in creating engaging learning experiences and curriculum development.', icon: BookOpen, tags: ['Education', 'Instructional Design'], url: 'https://example.learnworlds.com/instructional' },
  { id: 6, title: 'Digital Product Development', description: 'Learn end-to-end product development from ideation to launch.', icon: Target, tags: ['Business', 'Technology'], url: 'https://example.learnworlds.com/product' },
];

const filterKeys = ['all', 'marketing', 'business', 'creativity', 'education', 'ai', 'technology', 'personal'];

export default function CoursesPage() {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = activeFilter === 'all'
    ? courses
    : courses.filter(c => c.tags.some(tag => tag.toLowerCase() === activeFilter));

  return (
    <div className="min-h-screen bg-bg pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center mb-16">
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-bold text-white mb-4">{t('courses.title')}</motion.h1>
          <motion.p variants={fadeUp} className="text-neutral-400 max-w-2xl mx-auto">{t('courses.subtitle')}</motion.p>
        </motion.div>

        {/* Filters */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-2 justify-center mb-12">
          {filterKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all border ${
                activeFilter === key
                  ? 'bg-accent text-white border-accent'
                  : 'border-white/8 text-neutral-400 hover:border-accent/30 hover:text-white'
              }`}
            >
              {t(`courses.filter.${key}`)}
            </button>
          ))}
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={stagger} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {filtered.map((course) => (
            <motion.div key={course.id} variants={fadeUp} className="p-8 rounded-2xl border border-white/8 bg-bg-card hover:border-accent/30 transition-all group flex flex-col">
              <div className="p-3 rounded-xl bg-accent/10 w-fit mb-5 group-hover:bg-accent/20 transition-colors">
                <course.icon size={20} className="text-accent" />
              </div>
              <h3 className="text-white font-semibold mb-3">{course.title}</h3>
              <p className="text-neutral-500 text-sm leading-relaxed flex-1 mb-5">{course.description}</p>
              <div className="flex flex-wrap gap-2 mb-5">
                {course.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 rounded-md bg-bg-secondary text-neutral-500 text-xs">{tag}</span>
                ))}
              </div>
              <a href={course.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-accent text-sm font-medium hover:underline mt-auto">
                Enroll Now <ExternalLink size={12} />
              </a>
            </motion.div>
          ))}
        </motion.div>

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
