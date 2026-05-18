'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Brain, GraduationCap, ChevronRight, Lightbulb, Target, Users, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

interface Project { id: string; title: string; category: string; short_description: string; thumbnail_url: string; }
interface Testimonial { id: string; client_name: string; client_role: string; content_en: string; content_lv: string; }

export default function HomePage() {
  const { t, language } = useLanguage();
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  const demoProjects: Project[] = [
    { id: 'd1', title: 'AI Customer Support Agent', category: 'AI Automation', short_description: 'Intelligent chat agent that handles support tickets with context-aware responses and seamless human handoff.', thumbnail_url: '' },
    { id: 'd2', title: 'Interactive Learning Platform', category: 'Education', short_description: 'Custom LMS with gamification, progress tracking and AI-powered personalised learning paths.', thumbnail_url: '' },
    { id: 'd3', title: 'Digital Product Catalogue', category: 'Interactive Design', short_description: 'Immersive product experience with 3D previews, guided tours and embedded video storytelling.', thumbnail_url: '' },
  ];

  useEffect(() => {
    supabase.from('projects').select('id,title,category,short_description,thumbnail_url')
      .eq('published', true).eq('is_featured', true)
      .order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => { if (data && data.length > 0) setFeaturedProjects(data); });
    supabase.from('testimonials').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setTestimonials(data); });
  }, [language]);

  const displayedProjects = featuredProjects.length > 0 ? featuredProjects : demoProjects;

  const services = [
    { icon: Sparkles, title: t('whatwedo.interactive.title'), desc: t('whatwedo.interactive.desc') },
    { icon: Brain, title: t('whatwedo.ai.title'), desc: t('whatwedo.ai.desc') },
    { icon: GraduationCap, title: t('whatwedo.education.title'), desc: t('whatwedo.education.desc') },
  ];
  const steps = [
    { num: '01', title: t('howwework.discovery'), desc: t('howwework.discovery.desc') },
    { num: '02', title: t('howwework.design'), desc: t('howwework.design.desc') },
    { num: '03', title: t('howwework.aiintegration'), desc: t('howwework.aiintegration.desc') },
    { num: '04', title: t('howwework.delivery'), desc: t('howwework.delivery.desc') },
    { num: '05', title: t('howwework.support'), desc: t('howwework.support.desc') },
  ];
  const reasons = [
    { icon: Users, label: t('whychooseus.clientcentered') },
    { icon: Lightbulb, label: t('whychooseus.creative') },
    { icon: Target, label: t('whychooseus.results') },
    { icon: Brain, label: t('whychooseus.ai') },
    { icon: Sparkles, label: t('whychooseus.design') },
    { icon: GraduationCap, label: t('whychooseus.educational') },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20" style={{background: '#06041a'}}>
        {/* Mesh gradient */}
        <div className="absolute inset-0 gradient-mesh pointer-events-none" />
        {/* Dot grid */}
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        {/* Orbs */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-pink/15 rounded-full blur-[100px] pointer-events-none" />
        {/* Fade to body bg */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#09090b] to-transparent pointer-events-none" />
        <motion.div className="relative z-10 max-w-5xl mx-auto px-6 text-center" initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-medium mb-8">
            <Sparkles size={12} /> AI &amp; Digital Studio
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl lg:text-7xl font-bold text-gradient leading-tight mb-6">
            {t('hero.title')}
          </motion.h1>
          <motion.p variants={fadeUp} className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10">
            {t('hero.subtitle')}
          </motion.p>
          <motion.div variants={fadeUp} className="flex gap-4 justify-center flex-wrap">
            <Link href="/contact"><Button size="lg">{t('hero.cta.consultation')}</Button></Link>
            <Link href="/projects"><Button variant="secondary" size="lg">{t('hero.cta.projects')}</Button></Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Services */}
      <section className="py-24" style={{background: '#0b0915'}}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.h2 initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} className="text-3xl md:text-5xl font-bold text-white text-center mb-16">
            {t('whatwedo.title')}
          </motion.h2>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={stagger} className="grid md:grid-cols-3 gap-6">
            {services.map((s) => (
              <motion.div key={s.title} variants={fadeUp} className="p-8 rounded-2xl bg-bg-card border border-white/8 hover:border-accent/30 transition-all group glow-hover">
                <div className="p-3 rounded-xl bg-accent/10 w-fit mb-5 group-hover:bg-accent/20 transition-colors">
                  <s.icon size={22} className="text-accent" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-3">{s.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24" style={{background: '#0f0c1e'}}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.h2 initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} className="text-3xl md:text-5xl font-bold text-white text-center mb-16">
            {t('whychooseus.title')}
          </motion.h2>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={stagger} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {reasons.map((r) => (
              <motion.div key={r.label} variants={fadeUp} className="flex items-center gap-3 p-5 rounded-xl glass-card card-highlight">
                <r.icon size={18} className="text-accent flex-shrink-0" />
                <span className="text-zinc-300 text-sm font-medium">{r.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="py-24" style={{background: '#0b0915'}}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white">{t('featured.title')}</h2>
            {featuredProjects.length === 0 && (
              <p className="text-zinc-600 text-sm mt-3">Sample projects — connect Supabase to show real work</p>
            )}
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={stagger} className="grid md:grid-cols-3 gap-6 mb-10">
            {displayedProjects.map((p) => (
              <motion.div key={p.id} variants={fadeUp}>
                <Link href={p.id.startsWith('d') ? '/projects' : `/projects/${p.id}`} className="block rounded-2xl overflow-hidden glass-card card-highlight hover:border-accent/40 transition-all duration-300 group glow-hover">
                  <div className="aspect-video overflow-hidden bg-white/[0.02] flex items-center justify-center">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                    ) : (
                      <div className="w-full h-full gradient-mesh flex items-center justify-center">
                        <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/20" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <span className="text-accent text-xs font-medium uppercase tracking-widest">{p.category}</span>
                    <h3 className="text-white font-semibold mt-2 mb-2">{p.title}</h3>
                    <p className="text-zinc-500 text-sm line-clamp-2">{p.short_description}</p>
                    <div className="mt-4 flex items-center gap-1 text-accent text-sm font-medium">View Project <ChevronRight size={14} /></div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
          <div className="text-center">
            <Link href="/projects"><Button variant="secondary">{t('featured.viewall')}</Button></Link>
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="py-24" style={{background: '#0f0c1e'}}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold" style={{color:'#f0eeff'}}>{t('howwework.title')}</h2>
          </motion.div>

          {/* Desktop: horizontal connected timeline */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Connecting line through circle centers (circles are w-14=56px, centered, top-0) */}
              <div className="absolute left-[10%] right-[10%] top-7 h-px z-0"
                style={{background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.5) 20%, rgba(236,72,153,0.6) 50%, rgba(168,85,247,0.5) 80%, transparent)'}} />

              <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={stagger}
                className="grid grid-cols-5 gap-4">
                {steps.map((step) => (
                  <motion.div key={step.num} variants={fadeUp} className="flex flex-col items-center text-center">
                    {/* Numbered circle */}
                    <div className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-base mb-6"
                      style={{
                        background: 'linear-gradient(135deg, #e040fb 0%, #a855f7 50%, #7c3aed 100%)',
                        boxShadow: '0 8px 32px rgba(168,85,247,0.45), 0 0 0 4px rgba(168,85,247,0.12)'
                      }}>
                      {step.num}
                    </div>
                    {/* Card */}
                    <div className="glass-card card-highlight rounded-2xl p-5 w-full">
                      <div className="w-8 h-0.5 mx-auto mb-3 rounded-full" style={{background: 'linear-gradient(90deg, #e040fb, #7c3aed)'}} />
                      <h3 className="font-bold text-sm mb-2" style={{color:'#f0eeff'}}>{step.title}</h3>
                      <p className="text-xs leading-relaxed" style={{color:'#9b8fb8'}}>{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Mobile: vertical stack */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={stagger}
            className="flex flex-col gap-4 md:hidden">
            {steps.map((step) => (
              <motion.div key={step.num} variants={fadeUp} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm"
                  style={{background: 'linear-gradient(135deg, #e040fb, #7c3aed)', boxShadow: '0 4px 16px rgba(168,85,247,0.4)'}}>
                  {step.num}
                </div>
                <div className="glass-card card-highlight rounded-xl p-4 flex-1">
                  <h3 className="font-bold text-sm mb-1" style={{color:'#f0eeff'}}>{step.title}</h3>
                  <p className="text-xs" style={{color:'#9b8fb8'}}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-bg">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <motion.h2 initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} className="text-3xl md:text-5xl font-bold text-white mb-12">
              {t('testimonials.title')}
            </motion.h2>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once:true }} variants={stagger} className="grid md:grid-cols-2 gap-6">
              {testimonials.slice(0,2).map((item) => (
                <motion.div key={item.id} variants={fadeUp} className="p-8 rounded-2xl border border-white/8 bg-bg-card text-left">
                  <p className="text-neutral-300 text-sm leading-relaxed mb-6 italic">"{language === 'lv' ? item.content_lv : item.content_en}"</p>
                  <p className="text-white font-semibold text-sm">{item.client_name}</p>
                  <p className="text-neutral-500 text-xs">{item.client_role}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24 relative overflow-hidden" style={{background: '#06041a'}}>
        <div className="absolute inset-0 gradient-mesh pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[300px] bg-accent/12 rounded-full blur-[120px]" />
        </div>
        <motion.div initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">{t('cta.title')}</h2>
          <p className="text-neutral-400 mb-8">{t('cta.subtitle')}</p>
          <Link href="/contact"><Button size="lg">{t('cta.button')} <ArrowRight size={16} className="ml-2" /></Button></Link>
        </motion.div>
      </section>
    </div>
  );
}
