'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FolderKanban, BookOpen, Users, Mail, Share2, LogOut, Home, ChevronRight, Quote } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const navGroups = [
  {
    label: 'Content',
    items: [
      { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/admin/projects',  icon: FolderKanban,    label: 'Projects' },
      { href: '/admin/team',          icon: Users,           label: 'Team Members' },
      { href: '/admin/testimonials',   icon: Quote,           label: 'Testimonials' },
      { href: '/admin/courses',        icon: BookOpen,        label: 'Courses', comingSoon: true },
    ],
  },
  {
    label: 'Communication',
    items: [
      { href: '/admin/contacts', icon: Mail,   label: 'Contacts' },
      { href: '/admin/social',   icon: Share2, label: 'Social Links' },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  const handleViewSite = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <aside className="w-64 min-h-screen bg-zinc-950 border-r border-zinc-900 flex flex-col shrink-0">

      {/* Brand */}
      <div className="px-6 py-6 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-bold text-sm">
            E9
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">E9 Studija</p>
            <p className="text-zinc-500 text-xs">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map(({ href, icon: Icon, label, comingSoon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={comingSoon ? '#' : href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group relative ${
                      active
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    } ${comingSoon ? 'pointer-events-none opacity-35' : ''}`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />
                    )}
                    <Icon size={16} className={active ? 'text-accent' : 'text-zinc-500 group-hover:text-zinc-300 transition-colors'} />
                    <span className="flex-1">{label}</span>
                    {comingSoon
                      ? <span className="text-[9px] bg-zinc-900 text-zinc-600 px-1.5 py-0.5 rounded-md border border-zinc-800">Soon</span>
                      : active && <ChevronRight size={12} className="text-accent/50" />
                    }
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="px-3 py-4 border-t border-zinc-900 space-y-1">
        <button
          onClick={handleViewSite}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-all group"
        >
          <Home size={16} className="group-hover:text-zinc-300 transition-colors" />
          Exit to Site
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-all group"
        >
          <LogOut size={16} className="group-hover:text-red-400 transition-colors" />
          Logout
        </button>
      </div>
    </aside>
  );
}
