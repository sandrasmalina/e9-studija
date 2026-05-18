'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

interface Project {
  id: string;
  title: string; title_lv: string;
  category: string; client_name: string;
  short_description: string; short_description_lv: string;
  overview_en: string; overview_lv: string;
  goals_en: string; goals_lv: string;
  process_en: string; process_lv: string;
  results_en: string; results_lv: string;
  thumbnail_url: string; gallery_urls: string[];
  project_url: string;
}

export default function ProjectPage() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from('projects').select('*').eq('id', id).single()
      .then(({ data }) => {
        setProject(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center"><p className="text-neutral-500">Loading...</p></div>;
  if (!project) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
      <p className="text-neutral-400">Project not found.</p>
      <Link href="/projects"><Button variant="secondary">{t('project.back')}</Button></Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg pt-28 pb-24">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <Link href="/projects" className="inline-flex items-center gap-2 text-neutral-500 hover:text-accent text-sm mb-10 transition-colors">
            <ArrowLeft size={14} /> {t('project.back')}
          </Link>

          {project.thumbnail_url && (
            <div className="relative aspect-video rounded-2xl overflow-hidden mb-10 border border-white/8">
              <img src={project.thumbnail_url} alt={language === 'lv' && project.title_lv ? project.title_lv : project.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-violet-700/30 to-fuchsia-600/20 mix-blend-overlay pointer-events-none" />
            </div>
          )}

          <div className="flex flex-wrap gap-4 mb-6 text-sm">
            <span className="px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">{project.category}</span>
            {project.client_name && (
              <span className="px-3 py-1 rounded-full border border-white/8 text-neutral-400">
                {t('project.client')}: {project.client_name}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-white mb-6">
            {language === 'lv' && project.title_lv ? project.title_lv : project.title}
          </h1>

          {(project.short_description || project.short_description_lv) && (
            <p className="text-neutral-400 text-lg leading-relaxed mb-8">
              {language === 'lv' && project.short_description_lv ? project.short_description_lv : project.short_description}
            </p>
          )}

          {project.project_url && (
            <div className="mb-10">
              <a
                href={project.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors"
              >
                <ExternalLink size={14} /> View Live Project
              </a>
            </div>
          )}

          <div className="space-y-10">
            {(project.overview_en || project.overview_lv) && (
              <section>
                <h2 className="text-xs font-semibold text-accent mb-3 uppercase tracking-widest">{t('project.overview')}</h2>
                <p className="text-neutral-400 leading-relaxed">
                  {language === 'lv' && project.overview_lv ? project.overview_lv : project.overview_en}
                </p>
              </section>
            )}
            {(project.goals_en || project.goals_lv) && (
              <section>
                <h2 className="text-xs font-semibold text-accent mb-3 uppercase tracking-widest">{t('project.goals')}</h2>
                <p className="text-neutral-400 leading-relaxed">
                  {language === 'lv' && project.goals_lv ? project.goals_lv : project.goals_en}
                </p>
              </section>
            )}
            {(project.process_en || project.process_lv) && (
              <section>
                <h2 className="text-xs font-semibold text-accent mb-3 uppercase tracking-widest">{t('project.process')}</h2>
                <p className="text-neutral-400 leading-relaxed">
                  {language === 'lv' && project.process_lv ? project.process_lv : project.process_en}
                </p>
              </section>
            )}
            {(project.results_en || project.results_lv) && (
              <section>
                <h2 className="text-xs font-semibold text-accent mb-3 uppercase tracking-widest">{t('project.results')}</h2>
                <p className="text-neutral-400 leading-relaxed">
                  {language === 'lv' && project.results_lv ? project.results_lv : project.results_en}
                </p>
              </section>
            )}
          </div>
        </motion.div>

        {/* CTA */}
        <div className="mt-20 p-10 rounded-2xl border border-accent/20 bg-accent/5 text-center relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-80 h-40 bg-accent/10 rounded-full blur-[60px]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 relative">{t('project.cta.title')}</h2>
          <p className="text-neutral-400 mb-6 relative">{t('project.cta.subtitle')}</p>
          <Link href="/contact" className="relative">
            <Button>{t('project.cta.button')} <ArrowRight size={14} className="ml-2" /></Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
