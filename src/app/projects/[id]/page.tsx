'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

interface Project {
  id: string; title: string; category: string; client_name: string;
  overview: string; goals: string; process: string; features: string;
  results: string; thumbnail_url: string; gallery_urls: string[];
  testimonial_text: string; testimonial_author: string;
}

export default function ProjectPage() {
  const { id } = useParams();
  const { t } = useLanguage();
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
            <div className="aspect-video rounded-2xl overflow-hidden mb-10 border border-white/8">
              <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
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

          <h1 className="text-3xl md:text-5xl font-bold text-white mb-10">{project.title}</h1>

          <div className="space-y-10">
            {project.overview && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-3 uppercase tracking-widest text-xs text-accent">{t('project.overview')}</h2>
                <p className="text-neutral-400 leading-relaxed">{project.overview}</p>
              </section>
            )}
            {project.goals && (
              <section>
                <h2 className="text-xs font-semibold text-accent mb-3 uppercase tracking-widest">{t('project.goals')}</h2>
                <p className="text-neutral-400 leading-relaxed">{project.goals}</p>
              </section>
            )}
            {project.process && (
              <section>
                <h2 className="text-xs font-semibold text-accent mb-3 uppercase tracking-widest">{t('project.process')}</h2>
                <p className="text-neutral-400 leading-relaxed">{project.process}</p>
              </section>
            )}
            {project.features && (
              <section>
                <h2 className="text-xs font-semibold text-accent mb-3 uppercase tracking-widest">{t('project.features')}</h2>
                <p className="text-neutral-400 leading-relaxed">{project.features}</p>
              </section>
            )}
            {project.results && (
              <section>
                <h2 className="text-xs font-semibold text-accent mb-3 uppercase tracking-widest">{t('project.results')}</h2>
                <p className="text-neutral-400 leading-relaxed">{project.results}</p>
              </section>
            )}
            {project.testimonial_text && (
              <section className="p-8 rounded-2xl border border-white/8 bg-bg-card">
                <p className="text-neutral-300 italic mb-4">"{project.testimonial_text}"</p>
                {project.testimonial_author && <p className="text-accent text-sm font-medium">— {project.testimonial_author}</p>}
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
