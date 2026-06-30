'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowRight, BookOpen, ChevronDown, FolderKanban, GraduationCap, Mail, Newspaper, PenLine, Quote, Settings, Share2, Star, Tag, UserCheck, Users } from 'lucide-react';

interface Stats {
  projects: number;
  featuredProjects: number;
  teamMembers: number;
  testimonials: number;
  publications: number;
  publishedPublications: number;
  ownPublications: number;
  ownPublishedPublications: number;
  authors: number;
  publicationCategories: number;
  courses: number;
  students: number;
  instructors: number;
  invitations: number;
  contacts: number;
  users: number;
  socialLinks: number;
}

const emptyStats: Stats = {
  projects: 0,
  featuredProjects: 0,
  teamMembers: 0,
  testimonials: 0,
  publications: 0,
  publishedPublications: 0,
  ownPublications: 0,
  ownPublishedPublications: 0,
  authors: 0,
  publicationCategories: 0,
  courses: 0,
  students: 0,
  instructors: 0,
  invitations: 0,
  contacts: 0,
  users: 0,
  socialLinks: 0,
};

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: React.ElementType; tone: string }) {
  return (
    <div className={`rounded-2xl border bg-zinc-900 p-5 ${tone}`}>
      <div className="mb-3 inline-flex rounded-lg bg-black/20 p-2">
        <Icon size={15} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs leading-tight text-zinc-500">{label}</p>
    </div>
  );
}

function QuickLink({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: React.ElementType }) {
  return (
    <Link href={href} className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition-all hover:border-accent/30 hover:bg-zinc-900/80">
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-xl border border-accent/20 bg-accent/10 p-2.5">
          <Icon size={17} className="text-accent" />
        </div>
        <ArrowRight size={15} className="text-zinc-700 transition-all group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
      <h3 className="mb-1 font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-500">{description}</p>
    </Link>
  );
}

function Section({ title, subtitle, children, defaultOpen = false }: { title: string; subtitle: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        </div>
        <ChevronDown size={18} className="text-zinc-600 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-5 space-y-4">{children}</div>
    </details>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? '';
      const [{ data: profile }, { data: assignedRoles }] = await Promise.all([
        userId ? supabase.from('profiles').select('role').eq('id', userId).single() : Promise.resolve({ data: null as any }),
        userId ? supabase.from('user_roles').select('roles(name)').eq('user_id', userId) : Promise.resolve({ data: [] as any[] }),
      ]);

      const roleSet = new Set<string>();
      if (profile?.role) roleSet.add(profile.role);
      (assignedRoles ?? []).forEach((row: any) => row.roles?.name && roleSet.add(row.roles.name));
      const roleList = [...roleSet];
      const admin = roleSet.has('admin');
      setRoles(roleList);

      const [
        projects,
        featuredProjects,
        teamMembers,
        testimonials,
        publications,
        publishedPublications,
        ownPublications,
        ownPublishedPublications,
        publicationCategories,
        courses,
        contacts,
        users,
        socialLinks,
        invitations,
        authors,
        students,
        instructors,
      ] = await Promise.all([
        admin ? supabase.from('projects').select('id', { count: 'exact', head: true }) : Promise.resolve({ count: 0 }),
        admin ? supabase.from('projects').select('id', { count: 'exact', head: true }).eq('is_featured', true) : Promise.resolve({ count: 0 }),
        admin ? supabase.from('team_members').select('id', { count: 'exact', head: true }) : Promise.resolve({ count: 0 }),
        admin ? supabase.from('testimonials').select('id', { count: 'exact', head: true }) : Promise.resolve({ count: 0 }),
        admin ? supabase.from('publications').select('id', { count: 'exact', head: true }) : Promise.resolve({ count: 0 }),
        admin ? supabase.from('publications').select('id', { count: 'exact', head: true }).eq('status', 'published') : Promise.resolve({ count: 0 }),
        userId ? supabase.from('publications').select('id', { count: 'exact', head: true }).eq('author_id', userId) : Promise.resolve({ count: 0 }),
        userId ? supabase.from('publications').select('id', { count: 'exact', head: true }).eq('author_id', userId).eq('status', 'published') : Promise.resolve({ count: 0 }),
        admin ? supabase.from('publication_categories').select('id', { count: 'exact', head: true }) : Promise.resolve({ count: 0 }),
        admin ? supabase.from('courses').select('id', { count: 'exact', head: true }) : Promise.resolve({ count: 0 }),
        admin ? supabase.from('contact_submissions').select('id', { count: 'exact', head: true }) : Promise.resolve({ count: 0 }),
        admin ? supabase.from('profiles').select('id', { count: 'exact', head: true }) : Promise.resolve({ count: 0 }),
        admin ? supabase.from('social_links').select('id', { count: 'exact', head: true }) : Promise.resolve({ count: 0 }),
        admin ? supabase.from('invitations').select('id', { count: 'exact', head: true }).eq('status', 'pending') : Promise.resolve({ count: 0 }),
        admin ? supabase.from('user_roles').select('user_id,roles!inner(name)', { count: 'exact', head: true }).eq('roles.name', 'author') : Promise.resolve({ count: 0 }),
        admin ? supabase.from('user_roles').select('user_id,roles!inner(name)', { count: 'exact', head: true }).eq('roles.name', 'student') : Promise.resolve({ count: 0 }),
        admin ? supabase.from('user_roles').select('user_id,roles!inner(name)', { count: 'exact', head: true }).eq('roles.name', 'instructor') : Promise.resolve({ count: 0 }),
      ]);

      setStats({
        projects: projects.count ?? 0,
        featuredProjects: featuredProjects.count ?? 0,
        teamMembers: teamMembers.count ?? 0,
        testimonials: testimonials.count ?? 0,
        publications: publications.count ?? 0,
        publishedPublications: publishedPublications.count ?? 0,
        ownPublications: ownPublications.count ?? 0,
        ownPublishedPublications: ownPublishedPublications.count ?? 0,
        authors: authors.count ?? 0,
        publicationCategories: publicationCategories.count ?? 0,
        courses: courses.count ?? 0,
        students: students.count ?? 0,
        instructors: instructors.count ?? 0,
        invitations: invitations.count ?? 0,
        contacts: contacts.count ?? 0,
        users: users.count ?? 0,
        socialLinks: socialLinks.count ?? 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const isAdmin = roles.includes('admin');
  const isAuthor = roles.includes('author');

  if (loading) {
    return <div className="max-w-6xl space-y-4">{[...Array(6)].map((_, index) => <div key={index} className="h-24 rounded-2xl bg-zinc-900/60 animate-pulse" />)}</div>;
  }

  return (
    <div className="max-w-6xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Overview by platform chapter and your active roles.</p>
      </div>

      {(isAdmin || isAuthor) && (
        <Section title="Publications" subtitle={isAdmin ? 'All article, author, and publication activity.' : 'Your author workspace and publication metrics.'} defaultOpen>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label={isAdmin ? 'Total Publications' : 'Your Publications'} value={isAdmin ? stats.publications : stats.ownPublications} icon={Newspaper} tone="border-violet-500/20 text-violet-400" />
            <StatCard label={isAdmin ? 'Published Publications' : 'Published by You'} value={isAdmin ? stats.publishedPublications : stats.ownPublishedPublications} icon={Star} tone="border-emerald-500/20 text-emerald-400" />
            {isAdmin && <StatCard label="Authors" value={stats.authors} icon={PenLine} tone="border-amber-500/20 text-amber-400" />}
            {isAdmin && <StatCard label="Publication Categories" value={stats.publicationCategories} icon={Tag} tone="border-cyan-500/20 text-cyan-400" />}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <QuickLink href="/admin/publications" title="Manage Publications" description="Create, edit, publish, and feature publication entries." icon={Newspaper} />
            {isAdmin && <QuickLink href="/admin/publication-categories" title="Publication Categories" description="Manage article filters and publication categories." icon={Tag} />}
            {isAdmin && <QuickLink href="/admin/users?role=author" title="Authors" description="Assign author roles and manage author access." icon={PenLine} />}
          </div>
        </Section>
      )}

      {isAdmin && (
        <>
          <Section title="Webpage" subtitle="Public website content and homepage-facing modules.">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Projects" value={stats.projects} icon={FolderKanban} tone="border-violet-500/20 text-violet-400" />
              <StatCard label="Featured Projects" value={stats.featuredProjects} icon={Star} tone="border-amber-500/20 text-amber-400" />
              <StatCard label="Team Members" value={stats.teamMembers} icon={Users} tone="border-cyan-500/20 text-cyan-400" />
              <StatCard label="Testimonials" value={stats.testimonials} icon={Quote} tone="border-fuchsia-500/20 text-fuchsia-400" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <QuickLink href="/admin/projects" title="Projects" description="Add, edit, publish, and feature portfolio projects." icon={FolderKanban} />
              <QuickLink href="/admin/team" title="Team" description="Update public team members and bios." icon={Users} />
              <QuickLink href="/admin/testimonials" title="Testimonials" description="Manage public client quotes." icon={Quote} />
            </div>
          </Section>

          <Section title="Courses" subtitle="Learning platform, students, teachers, and course settings.">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Courses" value={stats.courses} icon={BookOpen} tone="border-purple-500/20 text-purple-400" />
              <StatCard label="Students" value={stats.students} icon={GraduationCap} tone="border-blue-500/20 text-blue-400" />
              <StatCard label="Teachers" value={stats.instructors} icon={UserCheck} tone="border-emerald-500/20 text-emerald-400" />
              <StatCard label="Instructor Apps" value={stats.instructors} icon={UserCheck} tone="border-amber-500/20 text-amber-400" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <QuickLink href="/admin/courses" title="Courses" description="Manage all platform courses and course publishing." icon={BookOpen} />
              <QuickLink href="/admin/users?role=student" title="Students" description="Find learners and adjust role access when needed." icon={GraduationCap} />
              <QuickLink href="/admin/settings" title="Course Settings" description="Configure learning platform defaults and course settings." icon={Settings} />
            </div>
          </Section>

          <Section title="Platform Management" subtitle="Users, contacts, social links, and operational support.">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Platform Users" value={stats.users} icon={Users} tone="border-zinc-600 text-zinc-300" />
              <StatCard label="Pending Invitations" value={stats.invitations} icon={Mail} tone="border-amber-500/20 text-amber-400" />
              <StatCard label="Contact Submissions" value={stats.contacts} icon={Mail} tone="border-cyan-500/20 text-cyan-400" />
              <StatCard label="Social Links" value={stats.socialLinks} icon={Share2} tone="border-pink-500/20 text-pink-400" />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <QuickLink href="/admin/users" title="All Platform Users" description="Assign roles, support accounts, and manage user access." icon={Users} />
              <QuickLink href="/admin/invitations" title="Invitations" description="Create individual invites and reusable teacher or author campaign links." icon={Mail} />
              <QuickLink href="/admin/contacts" title="Contact Submissions" description="Review and reply to contact form submissions." icon={Mail} />
            </div>
          </Section>
        </>
      )}

      {!isAdmin && !isAuthor && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-500">No admin dashboard metrics are available for your current role.</div>
      )}
    </div>
  );
}
