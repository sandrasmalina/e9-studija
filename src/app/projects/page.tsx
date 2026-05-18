'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, ImageIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

interface Project { id: string; title: string; title_lv: string; category: string; short_description: string; short_description_lv: string; thumbnail_url: string; }

const demoProjects: Project[] = [
  { id: 'demo1', title: 'Interactive Learning Platform', title_lv: 'Interaktīva Mācību Platforma', category: 'Educational System', short_description: 'A comprehensive e-learning platform with AI-powered personalization.', short_description_lv: 'Visaptveroša e-mācību platforma ar AI personalizāciju.', thumbnail_url: '' },
  { id: 'demo2', title: 'AI Business Assistant', title_lv: 'AI Biznesa Asistents', category: 'AI Agent', short_description: 'Custom AI agent that automates customer support and scheduling.', short_description_lv: 'Pielāgots AI aģents, kas automatizē klientu atbalstu.', thumbnail_url: '' },
  { id: 'demo3', title: 'Digital Product Catalog', title_lv: 'Digitālais Produktu Katalogs', category: 'Interactive Catalog', short_description: 'Beautiful, interactive product showcase with 3D visualization.', short_description_lv: 'Skaists interaktīvs produktu katalogs ar 3D vizualizāciju.', thumbnail_url: '' },
  { id: 'demo4', title: "Interactive Children's Book", title_lv: 'Interaktīva Bērnu Grāmata', category: 'Interactive Book', short_description: 'Engaging digital storybook with animations and sound effects.', short_description_lv: 'Aizraujoša digitāla pasaku grāmata ar animācijām.', thumbnail_url: '' },
  { id: 'demo5', title: 'Corporate Training System', title_lv: 'Korporatīvā Apmācību Sistēma', category: 'Course Platform', short_description: 'Complete LMS solution for employee onboarding and development.', short_description_lv: 'Pilnīgs LMS risinājums darbinieku apmācībai.', thumbnail_url: '' },
  { id: 'demo6', title: 'Healthcare AI Workflow', title_lv: 'Veselības aprūpes AI Darbplūsma', category: 'AI Integration', short_description: 'Intelligent automation for patient data management.', short_description_lv: 'Inteliģenta automatizācija pacientu datu pārvaldībai.', thumbnail_url: '' },
];

export default function ProjectsPage() {
  const { t, language } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('projects').select('id,title,title_lv,category,short_description,short_description_lv,thumbnail_url')
      .eq('published', true).order('created_at', { ascending: false })
      .then(({ data }) => {
        setProjects(data && data.length > 0 ? data : demoProjects);
        setLoading(false);
      });
  }, []);

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
            {projects.map((p) => {
              const title = language === 'lv' && p.title_lv ? p.title_lv : p.title;
              const desc = language === 'lv' && p.short_description_lv ? p.short_description_lv : p.short_description;
              return (
              <motion.div key={p.id} variants={fadeUp}>
                <Link href={`/projects/${p.id}`} className="block h-full rounded-2xl overflow-hidden border border-white/8 bg-bg-card hover:border-accent/30 transition-all group">
                  <div className="aspect-video bg-bg-secondary flex items-center justify-center overflow-hidden">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/10 to-bg-secondary flex items-center justify-center">
                        <ImageIcon size={40} className="text-accent/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <span className="text-accent text-xs font-medium uppercase tracking-widest">{p.category}</span>
                    <h3 className="text-white font-semibold mt-2 mb-2">{title}</h3>
                    <p className="text-neutral-500 text-sm line-clamp-2">{desc}</p>
                    <div className="mt-4 flex items-center gap-1 text-accent text-sm font-medium">
                      {t('projects.view')} <ChevronRight size={14} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );})}
          </motion.div>
        )}
      </div>
    </div>
  );
}
