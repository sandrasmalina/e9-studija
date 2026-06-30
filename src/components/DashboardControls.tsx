'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, GraduationCap, Languages, LayoutDashboard, Newspaper } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

const spaces = [
  { href: '/admin/dashboard', labelKey: 'dashboard.space.admin', roles: ['admin'], icon: LayoutDashboard, priority: 1 },
  { href: '/admin/publications', labelKey: 'dashboard.space.author', roles: ['author', 'admin'], icon: Newspaper, priority: 2 },
  { href: '/instructor', labelKey: 'dashboard.space.instructor', roles: ['instructor', 'admin'], icon: BookOpen, priority: 3 },
  { href: '/dashboard', labelKey: 'dashboard.space.learner', roles: ['student', 'admin', 'instructor', 'author'], icon: GraduationCap, priority: 4 },
];

function useAvailableSpaces() {
  const pathname = usePathname();
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const [{ data: profile }, { data: assignedRoles }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', data.user.id).single(),
        supabase.from('user_roles').select('roles(name)').eq('user_id', data.user.id),
      ]);
      const roleNames = new Set<string>();
      if (profile?.role) roleNames.add(profile.role);
      (assignedRoles ?? []).forEach((row: any) => row.roles?.name && roleNames.add(row.roles.name));
      setRoles([...roleNames]);
    });
  }, []);

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return pathname.startsWith('/admin') && !pathname.startsWith('/admin/publications');
    if (href === '/admin/publications') return pathname.startsWith('/admin/publications');
    if (href === '/instructor') return pathname.startsWith('/instructor');
    if (href === '/dashboard') return pathname.startsWith('/dashboard');
    return pathname === href;
  };
  const availableSpaces = spaces
    .filter(space => space.roles.some(role => roles.includes(role)))
    .sort((a, b) => Number(isActive(b.href)) - Number(isActive(a.href)) || a.priority - b.priority);

  return { availableSpaces, isActive };
}

export function DashboardSpaces() {
  const { t } = useLanguage();
  const { availableSpaces, isActive } = useAvailableSpaces();
  const switchableSpaces = availableSpaces.filter(space => !isActive(space.href));

  if (switchableSpaces.length === 0) return null;

  return (
    <div className="space-y-1 border-t border-white/[0.06] pt-3">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{t('dashboard.spaces')}</p>
      {switchableSpaces.map(({ href, labelKey, icon: Icon }) => {
        return (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-200"
          >
            <Icon size={14} className="text-zinc-600" />
            {t(labelKey)}
          </Link>
        );
      })}
    </div>
  );
}

export function DashboardLanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="px-3 pt-3">
      <div className="mb-2 flex items-center gap-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
        <Languages size={12} /> {t('dashboard.language')}
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.03] p-1">
        {(['en', 'lv'] as const).map(lang => (
          <button
            key={lang}
            type="button"
            onClick={() => setLanguage(lang)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              language === lang ? 'bg-purple-500 text-white' : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardControls() {
  return (
    <div className="space-y-4 border-t border-white/[0.06] px-3 py-4">
      <DashboardSpaces />
      <DashboardLanguageSwitcher />
    </div>
  );
}
