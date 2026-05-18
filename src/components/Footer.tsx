'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, Globe, ExternalLink, type LucideProps } from 'lucide-react';
import { ForwardRefExoticComponent, RefAttributes } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon_name: string;
}

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>;

const iconMap: Record<string, LucideIcon> = {
  Mail, Globe, ExternalLink,
  Linkedin: Globe, Instagram: Globe, Facebook: Globe, Twitter: Globe, Github: Globe, Youtube: Globe,
};

export default function Footer() {
  const { t } = useLanguage();
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    supabase.from('social_links').select('*').order('created_at').then(({ data }) => {
      if (data) setSocialLinks(data);
    });
  }, []);

  const navLinks = [
    { label: t('nav.home'), href: '/' },
    { label: t('nav.projects'), href: '/projects' },
    { label: t('nav.courses'), href: '/courses' },
    { label: t('nav.team'), href: '/team' },
    { label: t('nav.contact'), href: '/contact' },
  ];

  return (
    <footer className="bg-bg-secondary border-t border-white/8 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-10 mb-12">
          <div>
            <h3 className="text-white text-xl font-bold mb-3">E9 Studija</h3>
            <p className="text-neutral-500 text-sm leading-relaxed">{t('footer.description')}</p>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-widest">{t('footer.quicklinks')}</h4>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-neutral-500 hover:text-accent text-sm transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase tracking-widest">{t('footer.connect')}</h4>
            {socialLinks.length > 0 ? (
              <div className="flex gap-3 flex-wrap">
                {socialLinks.map((link) => {
                  const Icon = iconMap[link.icon_name] || Mail;
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-white/8 text-neutral-400 hover:text-accent hover:border-accent/30 transition-all"
                    >
                      <Icon size={16} />
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="flex gap-3">
                <a href="mailto:info@e9studija.lv" className="p-2 rounded-lg border border-white/8 text-neutral-400 hover:text-accent hover:border-accent/30 transition-all">
                  <Mail size={16} />
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="pt-8 border-t border-white/8 flex items-center justify-between text-neutral-600 text-sm flex-wrap gap-2">
          <span>© {new Date().getFullYear()} E9 Studija. {t('footer.rights')}</span>
          <Link href="/admin" className="text-neutral-700 hover:text-neutral-500 transition-colors text-xs">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
