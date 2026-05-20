'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FolderKanban, Star, MessageSquare, BookOpen, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ projects: 0, featured: 0, contacts: 0, courses: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('projects').select('id', { count: 'exact', head: true }),
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('is_featured', true),
      supabase.from('contact_submissions').select('id', { count: 'exact', head: true }),
      supabase.from('courses').select('id', { count: 'exact', head: true }),
    ]).then(([p, f, c, co]) => {
      setStats({ projects: p.count ?? 0, featured: f.count ?? 0, contacts: c.count ?? 0, courses: co.count ?? 0 });
      setLoading(false);
    });
  }, []);

  const statCards = [
    { label: 'Total Projects', value: stats.projects, icon: FolderKanban, accent: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { label: 'Featured on Homepage', value: stats.featured, icon: Star, accent: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'Contact Submissions', value: stats.contacts, icon: MessageSquare, accent: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { label: 'Courses', value: stats.courses, icon: BookOpen, accent: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  ];

  return (
    <div className="max-w-4xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((c) => (
          <div key={c.label} className={`p-5 rounded-2xl bg-zinc-900 border ${c.border}`}>
            <div className={`inline-flex p-2 rounded-lg ${c.bg} mb-3`}>
              <c.icon size={15} className={c.accent} />
            </div>
            <p className="text-2xl font-bold text-white">
              {loading ? <span className="inline-block w-6 h-6 border-2 border-zinc-700 border-t-zinc-500 rounded-full animate-spin align-middle" /> : c.value}
            </p>
            <p className="text-zinc-500 text-xs mt-1 leading-tight">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/admin/projects"
          className="group p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-accent/30 hover:bg-zinc-900/80 transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
              <FolderKanban size={18} className="text-accent" />
            </div>
            <ArrowRight size={16} className="text-zinc-700 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-white font-semibold mb-1">Manage Projects</h3>
          <p className="text-zinc-500 text-sm">Add, edit, publish and feature projects on the homepage.</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-accent">
              <Plus size={11} /> Add New Project
            </span>
          </div>
        </Link>

        <Link
          href="/admin/courses"
          className="group p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-purple-500/30 hover:bg-zinc-900/80 transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <BookOpen size={18} className="text-purple-400" />
            </div>
            <ArrowRight size={16} className="text-zinc-700 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="text-white font-semibold mb-1">Manage Courses</h3>
          <p className="text-zinc-500 text-sm">Add, edit, publish and manage learning courses.</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-purple-400">
              <Plus size={11} /> Add New Course
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
