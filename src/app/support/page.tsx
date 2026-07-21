'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageCircle, TicketCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';
import TurnstileWidget from '@/components/TurnstileWidget';

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

export default function SupportPage() {
  const { language, t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [ticketNumber, setTicketNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = window.localStorage.getItem('e9-admin-theme');
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      if (profile?.full_name) setName(profile.full_name);
    })();
  }, []);

  const isLight = theme === 'light';
  const pageBg = isLight ? 'bg-[#f6f4ef]' : 'bg-bg';
  const cardCls = isLight ? 'border-black/10 bg-white' : 'border-white/8 bg-bg-card';
  const headingCls = isLight ? 'text-zinc-900' : 'text-white';
  const subTextCls = isLight ? 'text-zinc-600' : 'text-neutral-400';
  const mutedCls = isLight ? 'text-zinc-500' : 'text-neutral-500';
  const labelCls = isLight ? 'text-zinc-600' : 'text-neutral-400';
  const inputCls = isLight
    ? 'bg-white border-black/10 text-zinc-900 placeholder:text-zinc-400 focus:border-accent/50'
    : 'bg-bg border-white/8 text-white placeholder:text-neutral-600 focus:border-accent/50';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setErrorMsg(language === 'lv' ? 'Lūdzu aizpildiet obligātos laukus.' : 'Please fill in all required fields.');
      return;
    }
    if (!turnstileToken) {
      setErrorMsg(t('turnstile.error.required'));
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ name, email, phone, subject, message, turnstileToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not create support ticket');
      setTicketNumber(data.ticketNumber ?? '');
      setStatus('success');
      setSubject('');
      setMessage('');
      setTurnstileToken('');
    } catch (error) {
      setStatus('error');
      setErrorMsg(error instanceof Error ? error.message : (language === 'lv' ? 'Neizdevās izveidot pieteikumu.' : 'Could not create support ticket.'));
    }
  };

  return (
    <div className={`min-h-screen ${pageBg} pt-28 pb-24`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center mb-14">
          <motion.p variants={fadeUp} className="text-accent text-sm font-medium tracking-widest uppercase mb-3">
            {language === 'lv' ? 'ATBALSTS' : 'SUPPORT'}
          </motion.p>
          <motion.h1 variants={fadeUp} className={`text-4xl md:text-6xl font-bold mb-4 ${headingCls}`}>
            {language === 'lv' ? 'Izveidot atbalsta pieteikumu' : 'Raise a Support Ticket'}
          </motion.h1>
          <motion.p variants={fadeUp} className={`max-w-2xl mx-auto ${subTextCls}`}>
            {language === 'lv'
              ? 'Aprakstiet problēmu vai jautājumu, un mēs nosūtīsim jums pieteikuma numuru e-pastā.'
              : 'Tell us what happened and we will email you a ticket number automatically.'}
          </motion.p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className={`p-6 rounded-2xl border flex items-start gap-4 ${cardCls}`}>
            <div className="p-2.5 rounded-lg bg-accent/10"><TicketCheck size={16} className="text-accent" /></div>
            <div>
              <p className={`text-xs uppercase tracking-widest mb-1 ${mutedCls}`}>{language === 'lv' ? 'Pieteikums' : 'Ticket'}</p>
              <p className={`text-sm font-medium ${headingCls}`}>{language === 'lv' ? 'Automātisks numurs' : 'Automatic number'}</p>
            </div>
          </div>
          <div className={`p-6 rounded-2xl border flex items-start gap-4 ${cardCls}`}>
            <div className="p-2.5 rounded-lg bg-accent/10"><Mail size={16} className="text-accent" /></div>
            <div>
              <p className={`text-xs uppercase tracking-widest mb-1 ${mutedCls}`}>Email</p>
              <p className={`text-sm font-medium ${headingCls}`}>e9studija@gmail.com</p>
            </div>
          </div>
          <div className={`p-6 rounded-2xl border flex items-start gap-4 ${cardCls}`}>
            <div className="p-2.5 rounded-lg bg-accent/10"><MessageCircle size={16} className="text-accent" /></div>
            <div>
              <p className={`text-xs uppercase tracking-widest mb-1 ${mutedCls}`}>{language === 'lv' ? 'Atbilde' : 'Response'}</p>
              <p className={`text-sm font-medium ${headingCls}`}>{language === 'lv' ? 'E-pastā' : 'By email'}</p>
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className={`max-w-2xl mx-auto p-5 sm:p-8 rounded-2xl border ${cardCls}`}>
          {status === 'success' ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <TicketCheck size={24} className="text-accent" />
              </div>
              <h3 className={`font-bold text-xl mb-2 ${headingCls}`}>
                {language === 'lv' ? 'Pieteikums izveidots' : 'Ticket Created'}
              </h3>
              <p className={subTextCls}>
                {language === 'lv' ? 'Jūsu pieteikuma numurs:' : 'Your ticket number:'} <span className={`font-semibold ${headingCls}`}>{ticketNumber}</span>
              </p>
              <p className={`text-sm mt-2 ${mutedCls}`}>
                {language === 'lv' ? 'Mēs nosūtījām apstiprinājumu uz jūsu e-pastu.' : 'We sent the confirmation to your email.'}
              </p>
              <Button type="button" className="mt-6" onClick={() => setStatus('idle')}>
                {language === 'lv' ? 'Izveidot vēl vienu' : 'Create another ticket'}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={`block text-sm mb-2 ${labelCls}`}>{t('contact.name')}</label>
                <input value={name} onChange={event => { setName(event.target.value); setErrorMsg(''); }} placeholder={t('contact.name.placeholder')} className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${inputCls}`} />
              </div>
              <div>
                <label className={`block text-sm mb-2 ${labelCls}`}>{t('contact.email')}</label>
                <input type="email" value={email} onChange={event => { setEmail(event.target.value); setErrorMsg(''); }} placeholder={t('contact.email.placeholder')} className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${inputCls}`} />
              </div>
              <div>
                <label className={`block text-sm mb-2 ${labelCls}`}>{t('contact.phone')}</label>
                <input type="tel" value={phone} onChange={event => { setPhone(event.target.value); setErrorMsg(''); }} placeholder={t('contact.phone.placeholder')} className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${inputCls}`} />
              </div>
              <div>
                <label className={`block text-sm mb-2 ${labelCls}`}>{language === 'lv' ? 'Tēma' : 'Subject'}</label>
                <input value={subject} onChange={event => { setSubject(event.target.value); setErrorMsg(''); }} placeholder={language === 'lv' ? 'Īsi aprakstiet jautājumu' : 'Short summary of the issue'} className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors ${inputCls}`} />
              </div>
              <div>
                <label className={`block text-sm mb-2 ${labelCls}`}>{t('contact.message')}</label>
                <textarea value={message} onChange={event => { setMessage(event.target.value); setErrorMsg(''); }} rows={5} placeholder={language === 'lv' ? 'Aprakstiet problēmu vai jautājumu...' : 'Describe the issue or question...'} className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors resize-none ${inputCls}`} />
              </div>
              <TurnstileWidget
                onVerify={(token) => { setTurnstileToken(token); setErrorMsg(''); }}
                onExpire={() => setTurnstileToken('')}
                onError={() => { setTurnstileToken(''); setErrorMsg(t('turnstile.error.failed')); }}
              />
              {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}
              <Button type="submit" disabled={status === 'sending' || !turnstileToken} className="w-full" size="lg">
                {status === 'sending' ? (language === 'lv' ? 'Sūta...' : 'Sending...') : (language === 'lv' ? 'Izveidot pieteikumu' : 'Create Ticket')}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
