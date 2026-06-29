'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Globe, Menu, X, Lock, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();

  // These routes have their own layouts/headers - hide the public nav
  const hideNav = pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/learn') ||
    pathname.startsWith('/instructor');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAdmin(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAdmin(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const navItems = [
    { label: t('nav.home'), href: '/' },
    { label: t('nav.projects'), href: '/projects' },
    { label: t('nav.courses'), href: '/courses' },
    { label: t('nav.team'), href: '/team' },
    { label: t('nav.contact'), href: '/contact' },
  ];

  if (hideNav) return null;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-bg/90 backdrop-blur-md border-b border-white/8'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image src="/logo-512.png" alt="E9 Studija" width={38} height={38} className="object-contain" priority />
            <span className="text-white font-semibold text-lg tracking-tight" style={{ fontFamily: 'var(--font-jakarta, sans-serif)' }}>
              Studija
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm transition-colors relative ${
                  pathname === item.href
                    ? 'text-white font-medium'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {item.label}
                {pathname === item.href && (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-accent rounded-full" />
                )}
              </Link>
            ))}

            {/* Language toggle */}
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-white/8">
              <Globe size={14} className="text-neutral-500" />
              <button
                onClick={() => setLanguage('en')}
                className={`text-xs font-semibold transition-colors ${language === 'en' ? 'text-accent' : 'text-neutral-500 hover:text-white'}`}
              >
                EN
              </button>
              <span className="text-neutral-700">|</span>
              <button
                onClick={() => setLanguage('lv')}
                className={`text-xs font-semibold transition-colors ${language === 'lv' ? 'text-accent' : 'text-neutral-500 hover:text-white'}`}
              >
                LV
              </button>
            </div>

            {/* Admin link */}
            {isAdmin ? (
              <Link
                href="/admin/dashboard"
                className="ml-2 pl-4 border-l border-white/8 flex items-center gap-1.5 text-accent text-xs font-medium hover:text-white transition-colors"
                title="Dashboard"
              >
                <LayoutDashboard size={14} />
                Dashboard
              </Link>
            ) : (
              <Link
                href="/admin"
                className="ml-2 pl-4 border-l border-white/8 text-neutral-600 hover:text-accent transition-colors"
                title="Admin"
              >
                <Lock size={14} />
              </Link>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-neutral-300 hover:text-white transition-colors"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 h-full w-72 bg-bg-secondary border-l border-white/8 z-50 flex flex-col p-8"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <button
                className="self-end text-neutral-400 hover:text-white mb-8"
                onClick={() => setMenuOpen(false)}
              >
                <X size={22} />
              </button>
              <nav className="flex flex-col gap-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`text-lg transition-colors ${
                      pathname === item.href ? 'text-white font-semibold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex items-center gap-3 pt-8 border-t border-white/8">
                <Globe size={14} className="text-neutral-500" />
                <button onClick={() => setLanguage('en')} className={`text-sm font-semibold ${language === 'en' ? 'text-accent' : 'text-neutral-500'}`}>EN</button>
                <span className="text-neutral-700">|</span>
                <button onClick={() => setLanguage('lv')} className={`text-sm font-semibold ${language === 'lv' ? 'text-accent' : 'text-neutral-500'}`}>LV</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
