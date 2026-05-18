'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import Button from '@/components/Button';
import { ArrowRight } from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

export default function TeamPage() {
  const { t } = useLanguage();

  const members = [
    { key: 'member1', initials: 'AK' },
    { key: 'member2', initials: 'ML' },
    { key: 'member3', initials: 'LB' },
    { key: 'member4', initials: 'JK' },
  ];

  return (
    <div className="min-h-screen bg-bg pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center mb-20">
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-bold text-white mb-4">{t('team.title')}</motion.h1>
          <motion.p variants={fadeUp} className="text-neutral-400 max-w-2xl mx-auto">{t('team.subtitle')}</motion.p>
        </motion.div>

        {/* Who We Are */}
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

        {/* Team Members */}
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-3xl font-bold text-white text-center mb-12">{t('team.meetteam')}</motion.h2>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {members.map((m) => (
            <motion.div key={m.key} variants={fadeUp}
              className="p-6 rounded-2xl border border-white/8 bg-bg-card hover:border-accent/30 transition-all group text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/30 to-accent-dark/30 flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl group-hover:from-accent/40 group-hover:to-accent-dark/40 transition-all">
                {m.initials}
              </div>
              <h3 className="text-white font-semibold mb-1">{t(`team.${m.key}.name`)}</h3>
              <p className="text-accent text-xs font-medium mb-3">{t(`team.${m.key}.position`)}</p>
              <p className="text-neutral-500 text-sm leading-relaxed">{t(`team.${m.key}.bio`)}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
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
