'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Clock, MessageCircle, Building2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

interface TimeSlot { id: string; label: string; available: boolean; }

export default function ContactPage() {
  const { t, language } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    supabase.from('time_slots').select('*').eq('available', true).order('label')
      .then(({ data }) => { if (data) setSlots(data); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMsg(t('contact.error.fields'));
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, time_slot: selectedSlot }),
      });
      if (!res.ok) throw new Error();
      setStatus('success');
      setName(''); setEmail(''); setMessage(''); setSelectedSlot('');
    } catch {
      setStatus('error');
      setErrorMsg(t('contact.error.failed'));
    }
  };

  const infoCards = [
    { icon: Mail, title: t('contact.info.email'), value: 'info@e9studija.lv' },
    { icon: Clock, title: t('contact.info.hours'), value: t('contact.info.hours.text') },
    { icon: MessageCircle, title: t('contact.info.response'), value: t('contact.info.response.text') },
  ];

  return (
    <div className="min-h-screen bg-bg pt-28 pb-24">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center mb-16">
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-bold text-white mb-4">{t('contact.title')}</motion.h1>
          <motion.p variants={fadeUp} className="text-neutral-400 max-w-2xl mx-auto">{t('contact.subtitle')}</motion.p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {infoCards.map((card) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl border border-white/8 bg-bg-card flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-accent/10"><card.icon size={16} className="text-accent" /></div>
              <div>
                <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">{card.title}</p>
                <p className="text-white text-sm font-medium">{card.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto p-8 rounded-2xl border border-white/8 bg-bg-card">
          {status === 'success' ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <Mail size={24} className="text-accent" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">{t('contact.success.title')}</h3>
              <p className="text-neutral-400">{t('contact.success.message')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-neutral-400 text-sm mb-2">{t('contact.name')}</label>
                <input
                  type="text" value={name} onChange={e => { setName(e.target.value); setErrorMsg(''); }}
                  placeholder={t('contact.name.placeholder')}
                  className="w-full bg-bg border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-neutral-400 text-sm mb-2">{t('contact.email')}</label>
                <input
                  type="email" value={email} onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
                  placeholder={t('contact.email.placeholder')}
                  className="w-full bg-bg border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-neutral-400 text-sm mb-2">{t('contact.message')}</label>
                <textarea
                  value={message} onChange={e => { setMessage(e.target.value); setErrorMsg(''); }}
                  placeholder={t('contact.message.placeholder')} rows={5}
                  className="w-full bg-bg border border-white/8 rounded-xl px-4 py-3 text-white text-sm placeholder:text-neutral-600 focus:border-accent/50 focus:outline-none transition-colors resize-none"
                />
              </div>
              {slots.length > 0 && (
                <div>
                  <label className="block text-neutral-400 text-sm mb-2">{t('contact.select.time')}</label>
                  <div className="flex flex-wrap gap-2">
                    {slots.map(slot => (
                      <button type="button" key={slot.id} onClick={() => setSelectedSlot(slot.id)}
                        className={`px-3 py-2 rounded-lg text-xs border transition-all ${
                          selectedSlot === slot.id ? 'border-accent bg-accent/10 text-accent' : 'border-white/8 text-neutral-400 hover:border-accent/30'
                        }`}>
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
              <Button type="submit" disabled={status === 'sending'} className="w-full" size="lg">
                {status === 'sending' ? t('contact.sending') : t('contact.send')}
              </Button>
            </form>
          )}
        </motion.div>

        {/* Company details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="max-w-2xl mx-auto mt-8 p-6 rounded-2xl border border-white/8 bg-bg-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/10"><Building2 size={15} className="text-accent" /></div>
            <p className="text-xs text-neutral-500 uppercase tracking-widest">
              {language === 'lv' ? 'Uzņēmuma rekvizīti' : 'Company Details'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-neutral-500">{language === 'lv' ? 'Nosaukums' : 'Company'}:</span>
              <span className="text-white ml-2">SIA E9 Studija</span>
            </div>
            <div>
              <span className="text-neutral-500">{language === 'lv' ? 'Reģ. nr.' : 'Reg. No.'}:</span>
              <span className="text-white ml-2">44103139391</span>
            </div>
            <div>
              <span className="text-neutral-500">{language === 'lv' ? 'Banka' : 'Bank'}:</span>
              <span className="text-white ml-2">A/S Swedbank</span>
            </div>
            <div>
              <span className="text-neutral-500">{language === 'lv' ? 'Konts' : 'Account'}:</span>
              <span className="text-white ml-2 font-mono tracking-wide">LV89HABA0551047910013</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
