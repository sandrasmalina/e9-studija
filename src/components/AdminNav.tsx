'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FolderKanban, BookOpen, Users, Mail, LogOut, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/projects', icon: FolderKanban, label: 'Projects' },
  { href: '/admin/team', icon: Users, label: 'Team Members' },
  { href: '/admin/contacts', icon: Mail, label: 'Contacts' },
  { href: '/admin/courses', icon: BookOpen, label: 'Courses', comingSoon: true },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  return (
    <aside className="w-56 min-h-screen bg-zinc-950 border-r border-zinc-900 flex flex-col p-4 shrink-0">
      <div className="mb-8 px-2 pt-2">
        <p className="text-white font-bold text-sm tracking-tight">E9 Studija</p>
        <p className="text-zinc-600 text-xs mt-0.5">Admin Panel</p>
      </div>

      <nav className="flex-1 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label, comingSoon }) => (
          <Link
            key={href}
            href={comingSoon ? '#' : href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              pathname.startsWith(href)
                ? 'bg-accent/10 text-accent font-medium'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
            } ${comingSoon ? 'pointer-events-none opacity-40' : ''}`}
          >
            <Icon size={15} />
            {label}
            {comingSoon && (
              <span className="ml-auto text-[10px] bg-zinc-900 text-zinc-600 px-1.5 py-0.5 rounded">Soon</span>
            )}
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-4 space-y-0.5 border-t border-zinc-900">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
        >
          <ExternalLink size={15} /> View Site
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-500 hover:text-red-400 hover:bg-red-950/20 transition-colors w-full"
        >
          <LogOut size={15} /> Logout
        </button>
      </div>
    </aside>
  );
}
