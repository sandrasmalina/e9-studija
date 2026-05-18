'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, GraduationCap, ChevronRight, Lightbulb, Target, Users, ArrowRight, Quote, ImageIcon, Rocket, BookOpen, Bot, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

interface Project { id: string; title: string; title_lv: string; category: string; short_description: string; short_description_lv: string; thumbnail_url: string; }
interface Testimonial { id: string; client_name: string; client_role: string; content_en: string; content_lv: string; is_published?: boolean; sort_order?: number; }

const fallbackTestimonials: Testimonial[] = [
  { id: 'ft1', client_name: 'Anna Bērziņa', client_role: 'Marketing Director, TechCorp', content_en: 'E9 Studija transformed our digital presence with an innovative AI-powered platform. The team\'s creativity and technical expertise exceeded all our expectations.', content_lv: 'E9 Studija pārveidoja mūsu digitālo klātbūtni ar inovatīvu AI platformu. Komandas radošums un tehniskā pieredze pārsniedza visas mūsu cerības.' },
  { id: 'ft2', client_name: 'Jānis Kalniņš', client_role: 'CEO, StartupHub Riga', content_en: 'The interactive learning platform they built for us increased student engagement by 40%. Their attention to detail and deep understanding of educational technology is outstanding.', content_lv: 'Interaktīvā mācību platforma, ko viņi izveidoja mums, palielināja studentu iesaistīšanos par 40%. Viņu uzmanība detaļām ir izcila.' },
  { id: 'ft3', client_name: 'Laura Ozola', client_role: 'Head of Product, InnovateLV', content_en: 'Working with E9 Studija was a game-changer. They delivered a sophisticated AI support system that reduced our support load by 60% within the first month.', content_lv: 'Sadarbība ar E9 Studija bija pagrieziena punkts. Viņi piegādāja sarežģītu AI klientu atbalsta sistēmu, kas pirmā mēneša laikā samazināja slodzi par 60%.' },
];

export default function HomePage() {
  const { t, language } = useLanguage();
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const displayedTestimonials = testimonials.length > 0 ? testimonials : fallbackTestimonials;

  useEffect(() => {
    if (isPaused || displayedTestimonials.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((i) => (i + 1) % displayedTestimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, displayedTestimonials.length]);

  const scrollCarousel = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const w = carouselRef.current.offsetWidth;
    carouselRef.current.scrollBy({ left: dir === 'right' ? w * 0.75 : -w * 0.75, behavior: 'smooth' });
  };

  const demoProjects: Project[] = [
    { id: 'd1', title: 'AI Customer Support Agent', title_lv: 'AI Klientu Atbalsta Aģents', category: 'AI Automation', short_description: 'Intelligent chat agent that handles support tickets with context-aware responses and seamless human handoff.', short_description_lv: 'Inteliģents tērzēšanas aģents, kas apstrādā atbalsta pieprasījumus ar kontekstam atbilstošām atbildēm.', thumbnail_url: '' },
    { id: 'd2', title: 'Interactive Learning Platform', title_lv: 'Interaktīva Mācību Platforma', category: 'Education', short_description: 'Custom LMS with gamification, progress tracking and AI-powered personalised learning paths.', short_description_lv: 'Individuāla LMS ar gamifikāciju, progresa sekošanu un AI personalizētiem mācību ceļiem.', thumbnail_url: '' },
    { id: 'd3', title: 'Digital Product Catalogue', title_lv: 'Digitālais Produktu Katalogs', category: 'Interactive Design', short_description: 'Immersive product experience with 3D previews, guided tours and embedded video storytelling.', short_description_lv: 'Iegremdējoša produktu pieredze ar 3D priekšskatiem un video stāstījumu.', thumbnail_url: '' },
  ];

  useEffect(() => {
    supabase.from('projects').select('id,title,title_lv,category,short_description,short_description_lv,thumbnail_url,sort_order')
      .eq('published', true).eq('is_featured', true)
      .order('sort_order', { ascending: true }).limit(6)
      .then(({ data, error }) => {
        if (error) {
          // sort_order column may not exist yet — fallback to created_at
          supabase.from('projects').select('id,title,title_lv,category,short_description,short_description_lv,thumbnail_url')
            .eq('published', true).eq('is_featured', true)
            .order('created_at', { ascending: true }).limit(6)
            .then(({ data: d2 }) => { if (d2 && d2.length > 0) setFeaturedProjects(d2); });
        } else if (data && data.length > 0) {
          setFeaturedProjects(data);
        }
      });
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
      {/* Hero — sticky so the next section slides on top as you scroll */}
      <section className="sticky top-0 z-10 relative min-h-screen flex items-center justify-center overflow-hidden pt-20" style={{background: '#06041a'}}>
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

      {/* WHO THIS IS FOR — slides on top of sticky hero as you scroll */}
      <section className="relative z-20 rounded-t-[2.5rem] py-28 overflow-hidden" style={{background: '#0b0915'}}>
        {/* subtle top-edge glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-accent/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-20">
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-accent mb-4 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/10">
              {t('whoweworkwith.eyebrow')}
            </span>
            <h2 className="text-4xl md:text-6xl font-bold text-white mt-4">
              {t('whoweworkwith.title')}
            </h2>
          </motion.div>

          {/* 2×2 cards grid */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid md:grid-cols-2 gap-5"
          >
            {[
              {
                num: '01',
                icon: Rocket,
                title: t('whoweworkwith.1.title'),
                desc: t('whoweworkwith.1.desc'),
                tag: 'MVPs · SaaS · Founders',
                grad: 'from-violet-600/20 to-purple-900/10',
                glow: 'rgba(124,58,237,0.35)',
              },
              {
                num: '02',
                icon: BookOpen,
                title: t('whoweworkwith.2.title'),
                desc: t('whoweworkwith.2.desc'),
                tag: 'Coaches · Authors · Consultants',
                grad: 'from-fuchsia-600/20 to-pink-900/10',
                glow: 'rgba(217,70,239,0.3)',
              },
              {
                num: '03',
                icon: Bot,
                title: t('whoweworkwith.3.title'),
                desc: t('whoweworkwith.3.desc'),
                tag: 'Operations · Automation · Scale',
                grad: 'from-indigo-600/20 to-violet-900/10',
                glow: 'rgba(99,102,241,0.3)',
              },
              {
                num: '04',
                icon: GraduationCap,
                title: t('whoweworkwith.4.title'),
                desc: t('whoweworkwith.4.desc'),
                tag: 'LMS · eLearning · Academies',
                grad: 'from-purple-600/20 to-fuchsia-900/10',
                glow: 'rgba(168,85,247,0.3)',
              },
            ].map((item) => (
              <motion.div
                key={item.num}
                variants={fadeUp}
                className={`group relative rounded-2xl border border-white/[0.07] bg-gradient-to-br ${item.grad} p-8 overflow-hidden hover:border-accent/30 transition-all duration-500`}
                style={{ backdropFilter: 'blur(8px)' }}
              >
                {/* hover glow blob */}
                <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{ background: item.glow }} />

                <div className="relative z-10 flex flex-col h-full gap-6">
                  {/* Top row: icon + number */}
                  <div className="flex items-start justify-between">
                    <div className="p-3.5 rounded-xl bg-white/[0.06] border border-white/[0.08] group-hover:bg-accent/15 group-hover:border-accent/30 transition-all duration-300">
                      <item.icon size={26} className="text-accent" />
                    </div>
                    <span className="text-5xl font-black text-white/[0.06] group-hover:text-white/10 transition-colors select-none leading-none">
                      {item.num}
                    </span>
                  </div>

                  {/* Text */}
                  <div>
                    <h3 className="text-white text-2xl font-bold mb-2">{item.title}</h3>
                    <p className="text-neutral-400 text-base leading-relaxed">{item.desc}</p>
                  </div>

                  {/* Tag pill */}
                  <div className="flex items-center gap-2 mt-auto pt-4 border-t border-white/[0.06]">
                    <CheckCircle2 size={13} className="text-accent/70 shrink-0" />
                    <span className="text-xs text-neutral-500 tracking-wide">{item.tag}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Services */}
      <section className="relative z-20 py-24" style={{background: '#0b0915'}}>
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
      <section className="relative z-20 py-24" style={{background: '#0f0c1e'}}>
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
      <section className="relative z-20 py-24" style={{background: '#0b0915'}}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold text-white">{t('featured.title')}</h2>
              {featuredProjects.length === 0 && (
                <p className="text-zinc-600 text-sm mt-2">Sample projects — add real ones via Admin</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => scrollCarousel('left')} className="p-2.5 rounded-xl border border-white/10 text-neutral-400 hover:text-white hover:border-accent/40 transition-all">
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <button onClick={() => scrollCarousel('right')} className="p-2.5 rounded-xl border border-white/10 text-neutral-400 hover:text-white hover:border-accent/40 transition-all">
                <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>

          {/* Carousel */}
          <div ref={carouselRef} className="flex gap-6 overflow-x-auto pb-4 scroll-smooth" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
            {displayedProjects.map((p) => {
              const title = language === 'lv' && p.title_lv ? p.title_lv : p.title;
              const desc = language === 'lv' && p.short_description_lv ? p.short_description_lv : p.short_description;
              return (
                <div key={p.id} className="shrink-0 w-80 md:w-96">
                  <Link href={p.id.startsWith('d') ? '/projects' : `/projects/${p.id}`} className="block rounded-2xl overflow-hidden glass-card card-highlight hover:border-accent/40 transition-all duration-300 group glow-hover h-full">
                    <div className="relative aspect-video overflow-hidden bg-white/[0.02] flex items-center justify-center">
                      {p.thumbnail_url ? (
                        <>
                          <img src={p.thumbnail_url} alt={title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-br from-violet-700/30 to-fuchsia-600/20 mix-blend-overlay pointer-events-none" />
                        </>
                      ) : (
                        <div className="w-full h-full gradient-mesh flex items-center justify-center">
                          <ImageIcon size={40} className="text-accent/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <span className="text-accent text-xs font-medium uppercase tracking-widest">{p.category}</span>
                      <h3 className="text-white font-semibold mt-2 mb-2">{title}</h3>
                      <p className="text-zinc-500 text-sm line-clamp-2">{desc}</p>
                      <div className="mt-4 flex items-center gap-1 text-accent text-sm font-medium">{t('projects.view')} <ChevronRight size={14} /></div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Link href="/projects"><Button variant="secondary">{t('featured.viewall')}</Button></Link>
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="relative z-20 py-24" style={{background: '#0f0c1e'}}>
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

      {/* Testimonials Slider */}
      <section
        className="relative z-20 py-24"
        style={{ background: '#16122a' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="max-w-3xl mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white text-center mb-16"
          >
            {t('testimonials.title')}
          </motion.h2>

          <div className="relative">
            {/* Prev button */}
            <button
              onClick={() => { setActiveIdx((i) => (i - 1 + displayedTestimonials.length) % displayedTestimonials.length); setIsPaused(true); }}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-14 z-10 p-2.5 rounded-xl border border-white/10 text-neutral-400 hover:text-white hover:border-accent/40 transition-all"
              aria-label="Previous"
            >
              <ChevronRight size={18} className="rotate-180" />
            </button>

            {/* Next button */}
            <button
              onClick={() => { setActiveIdx((i) => (i + 1) % displayedTestimonials.length); setIsPaused(true); }}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-14 z-10 p-2.5 rounded-xl border border-white/10 text-neutral-400 hover:text-white hover:border-accent/40 transition-all"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>

            {/* Slide card */}
            <div className="overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIdx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="p-8 md:p-12 rounded-2xl border border-white/8 bg-bg-card text-center"
                >
                  <Quote size={32} className="text-accent/40 mx-auto mb-6" />
                  <p className="text-neutral-300 text-base md:text-lg leading-relaxed italic mb-8">
                    &ldquo;{language === 'lv' && displayedTestimonials[activeIdx]?.content_lv
                      ? displayedTestimonials[activeIdx].content_lv
                      : displayedTestimonials[activeIdx]?.content_en}&rdquo;
                  </p>
                  <div>
                    <p className="text-white font-semibold">{displayedTestimonials[activeIdx]?.client_name}</p>
                    <p className="text-neutral-500 text-sm mt-1">{displayedTestimonials[activeIdx]?.client_role}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dot indicators */}
            {displayedTestimonials.length > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {displayedTestimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveIdx(i); setIsPaused(true); }}
                    aria-label={`Slide ${i + 1}`}
                    className={`rounded-full transition-all duration-300 ${
                      i === activeIdx ? 'w-6 h-2 bg-accent' : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-20 py-24 overflow-hidden" style={{background: '#06041a'}}>
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
