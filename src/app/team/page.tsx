'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/Button';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

interface TeamMember { id: string; name: string; position_en: string; position_lv: string; bio_en: string; bio_lv: string; photo_url: string; sort_order: number; role?: string; bio?: string; image_url?: string; }

const fallbackMembers: TeamMember[] = [
  { id: '1', name: 'Anna Kovaļevska', position_en: 'Founder & Creative Director', position_lv: 'Dibinātāja un Radošā Direktore', bio_en: 'With over 15 years of experience in digital design and education, Anna leads our creative vision and client strategy.', bio_lv: 'Ar vairāk nekā 15 gadu pieredzi digitālajā dizainā un izglītībā, Anna vada mūsu radošo vīziju.', photo_url: '', sort_order: 0 },
  { id: '2', name: 'Māris Liepiņš', position_en: 'Lead AI Engineer', position_lv: 'Galvenais AI Inženieris', bio_en: 'Māris specialises in AI integrations and automation, bringing cutting-edge technology to our clients.', bio_lv: 'Māris specializējas AI integrācijās un automatizācijā.', photo_url: '', sort_order: 1 },
  { id: '3', name: 'Laura Bērziņa', position_en: 'UX/UI Designer', position_lv: 'UX/UI Dizainere', bio_en: 'Laura creates beautiful, intuitive interfaces that delight users across all platforms.', bio_lv: 'Laura rada skaistu, intuitīvu saskarni visās platformās.', photo_url: '', sort_order: 2 },
  { id: '4', name: 'Jānis Kalniņš', position_en: 'Education Technology Specialist', position_lv: 'Izglītības Tehnoloģiju Speciālists', bio_en: 'Jānis designs and implements comprehensive learning systems that transform educational experiences.', bio_lv: 'Jānis projektē un ievieš visaptverošas mācību sistēmas.', photo_url: '', sort_order: 3 },
];

export default function TeamPage() {
  const { t, language } = useLanguage();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      // Try with sort_order first, fall back to created_at if column missing
      let { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        // sort_order column may not exist yet — retry with created_at
        ({ data, error } = await supabase
          .from('team_members')
          .select('*')
          .order('created_at', { ascending: true }));
      }

      if (!error && data && data.length > 0) {
        setMembers(data);
      }
      setLoaded(true);
    };
    fetchMembers();
  }, []);

  const displayMembers = members.length > 0 ? members : fallbackMembers;

  return (
    <div className="min-h-screen bg-bg pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center mb-20">
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-bold text-white mb-4">{t('team.title')}</motion.h1>
          <motion.p variants={fadeUp} className="text-neutral-400 max-w-2xl mx-auto">{t('team.subtitle')}</motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="grid md:grid-cols-2 gap-12 items-center mb-24">
          <div>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white mb-6">{t('team.whoweare')}</motion.h2>
            <motion.p variants={fadeUp} className="text-neutral-400 leading-relaxed mb-4">{t('team.description1')}</motion.p>
            <motion.p variants={fadeUp} className="text-neutral-400 leading-relaxed mb-4">{t('team.description2')}</motion.p>
            <motion.p variants={fadeUp} className="text-neutral-400 leading-relaxed">{t('team.description3')}</motion.p>
          </div>
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
            {[{ num: '15+', label: 'Years Experience' }, { num: '50+', label: 'Projects Delivered' }, { num: '30+', label: 'Happy Clients' }, { num: '3', label: 'Countries Served' }].map((stat) => (
              <div key={stat.label} className="p-6 rounded-2xl border border-white/8 bg-bg-card text-center">
                <p className="text-4xl font-bold text-gradient mb-1">{stat.num}</p>
                <p className="text-neutral-500 text-sm">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-3xl font-bold text-white text-center mb-12">{t('team.meetteam')}</motion.h2>

        {!loaded ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        <motion.div initial="hidden" animate="visible" variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {displayMembers.map((m) => {
            return (
              <motion.div key={m.id} variants={fadeUp}
                className="p-6 rounded-2xl border border-white/8 bg-bg-card hover:border-accent/30 transition-all group text-center">
                {(m.photo_url || m.image_url) ? (
                  <img src={m.photo_url || m.image_url} alt={m.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-2 border-accent/20" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/30 to-accent-dark/30 flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl group-hover:from-accent/40 group-hover:to-accent-dark/40 transition-all">
                    {m.name?.charAt(0) || '?'}
                  </div>
                )}
                <h3 className="text-white font-semibold mb-1">{m.name}</h3>
                <p className="text-accent text-xs font-medium mb-3">
                  {language === 'lv'
                    ? (m.position_lv || m.position_en || m.role || '')
                    : (m.position_en || m.role || '')}
                </p>
                <p className="text-neutral-500 text-sm leading-relaxed">
                  {language === 'lv'
                    ? (m.bio_lv || m.bio_en || m.bio || '')
                    : (m.bio_en || m.bio || '')}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="p-10 rounded-2xl border border-accent/20 bg-accent/5 text-center relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-80 h-40 bg-accent/10 rounded-full blur-[60px]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 relative">{t('team.worktogether')}</h2>
          <p className="text-neutral-400 mb-6 relative">{t('team.worktogether.subtitle')}</p>
          <Link href="/contact" className="relative">
            <Button>{t('team.contactus')} <ArrowRight size={14} className="ml-2" /></Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
