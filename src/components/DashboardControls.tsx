'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, GraduationCap, Languages, LayoutDashboard, Newspaper } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

const spaces = [
  { href: '/dashboard', labelKey: 'dashboard.space.learner', roles: ['student', 'admin', 'instructor', 'author'], icon: GraduationCap },
  { href: '/instructor', labelKey: 'dashboard.space.instructor', roles: ['instructor', 'admin'], icon: BookOpen },
  { href: '/admin/publications', labelKey: 'dashboard.space.author', roles: ['author', 'admin'], icon: Newspaper },
  { href: '/admin/dashboard', labelKey: 'dashboard.space.admin', roles: ['admin'], icon: LayoutDashboard },
];

export default function DashboardControls() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();
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

  const availableSpaces = spaces.filter(space => space.roles.some(role => roles.includes(role)));

  return (
    <div className="space-y-4 border-t border-white/[0.06] px-3 py-4">
      <div>
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

      {availableSpaces.length > 1 && (
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{t('dashboard.spaces')}</p>
          <div className="space-y-1">
            {availableSpaces.map(({ href, labelKey, icon: Icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href.split('?')[0]));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                    active ? 'bg-purple-500/15 text-purple-200' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
                  }`}
                >
                  <Icon size={14} className={active ? 'text-purple-300' : 'text-zinc-600'} />
                  {t(labelKey)}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
