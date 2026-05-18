'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

interface Project { id: string; title: string; category: string; short_description: string; thumbnail_url: string; }

const demoProjects = [
  { id: 'demo1', title: 'Interactive Learning Platform', category: 'Educational System', short_description: 'A comprehensive e-learning platform with AI-powered personalization.', thumbnail_url: '' },
  { id: 'demo2', title: 'AI Business Assistant', category: 'AI Agent', short_description: 'Custom AI agent that automates customer support and scheduling.', thumbnail_url: '' },
  { id: 'demo3', title: 'Digital Product Catalog', category: 'Interactive Catalog', short_description: 'Beautiful, interactive product showcase with 3D visualization.', thumbnail_url: '' },
  { id: 'demo4', title: "Interactive Children's Book", category: 'Interactive Book', short_description: 'Engaging digital storybook with animations and sound effects.', thumbnail_url: '' },
  { id: 'demo5', title: 'Corporate Training System', category: 'Course Platform', short_description: 'Complete LMS solution for employee onboarding and development.', thumbnail_url: '' },
  { id: 'demo6', title: 'Healthcare AI Workflow', category: 'AI Integration', short_description: 'Intelligent automation for patient data management.', thumbnail_url: '' },
];

export default function ProjectsPage() {
  const { t, language } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('projects').select('id,title,category,short_description,thumbnail_url')
      .eq('published', true).eq('language', language).order('created_at', { ascending: false })
      .then(({ data }) => {
        setProjects(data && data.length > 0 ? data : demoProjects);
        setLoading(false);
      });
  }, [language]);

  return (
    <div className="min-h-screen bg-bg pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center mb-16">
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-bold text-white mb-4">{t('projects.title')}</motion.h1>
          <motion.p variants={fadeUp} className="text-neutral-400 max-w-2xl mx-auto">{t('projects.subtitle')}</motion.p>
        </motion.div>

        {loading ? (
          <p className="text-center text-neutral-500">{t('projects.loading')}</p>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={stagger} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => (
              <motion.div key={p.id} variants={fadeUp}>
                <Link href={`/projects/${p.id}`} className="block h-full rounded-2xl overflow-hidden border border-white/8 bg-bg-card hover:border-accent/30 transition-all group">
                  <div className="aspect-video bg-bg-secondary flex items-center justify-center overflow-hidden">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/10 to-bg-secondary" />
                    )}
                  </div>
                  <div className="p-6">
                    <span className="text-accent text-xs font-medium uppercase tracking-widest">{p.category}</span>
                    <h3 className="text-white font-semibold mt-2 mb-2">{p.title}</h3>
                    <p className="text-neutral-500 text-sm line-clamp-2">{p.short_description}</p>
                    <div className="mt-4 flex items-center gap-1 text-accent text-sm font-medium">
                      {t('projects.view')} <ChevronRight size={14} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
