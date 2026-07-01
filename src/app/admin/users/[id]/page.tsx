'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, BookOpen, ExternalLink, GraduationCap, Mail, Phone, ShieldCheck, User, Users, WalletCards } from 'lucide-react';

interface CourseRow {
  id: string;
  title_en: string;
  slug: string;
  status: string;
  price: number | null;
  is_free: boolean | null;
  enrollment_count: number | null;
  created_at: string;
  assignment_role?: string | null;
}

interface EnrollmentRow {
  id: string;
  status: string;
  amount_paid: number | null;
  currency: string | null;
  enrolled_at: string;
  expires_at: string | null;
  progress_pct: number | null;
  completed_at: string | null;
  course: { id: string; title_en: string; slug: string; status: string } | null;
}

interface UserDetail {
  profile: {
    id: string;
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    role: string | null;
    roles: string[];
    email: string | null;
    phone: string | null;
    bio: string | null;
    bio_lv: string | null;
    role_title: string | null;
    website: string | null;
    linkedin_url: string | null;
    stripe_account_id: string | null;
    revenue_share_pct: number | null;
    created_at: string;
  };
  createdCourses: CourseRow[];
  assignedCourses: CourseRow[];
  enrollments: EnrollmentRow[];
}

function formatDate(value: string | null) {
  if (!value) return 'Lifetime';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function accessLabel(expiresAt: string | null) {
  if (!expiresAt) return 'Lifetime access';
  return new Date(expiresAt).getTime() <= Date.now() ? 'Expired' : `Valid until ${formatDate(expiresAt)}`;
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'published' ? 'bg-green-500/10 text-green-300 border-green-500/20' : status === 'active' ? 'bg-green-500/10 text-green-300 border-green-500/20' : status === 'expired' ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700';
  return <span className={`rounded-lg border px-2 py-1 text-xs capitalize ${cls}`}>{status}</span>;
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <Icon size={18} className={color} />
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams() as { id: string };
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/users/${id}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } });
      const data = await response.json();
      if (!response.ok) setErr(data.error ?? 'Could not load user');
      else setDetail(data);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-zinc-900/60 animate-pulse" />)}</div>;
  if (err || !detail) return <p className="text-red-400 text-sm">{err || 'User not found'}</p>;

  const { profile, createdCourses, assignedCourses, enrollments } = detail;
  const createdDraft = createdCourses.filter(course => course.status === 'draft').length;
  const createdPublished = createdCourses.filter(course => course.status === 'published').length;
  const createdReview = createdCourses.filter(course => course.status === 'review').length;
  const boughtActive = enrollments.filter(enrollment => enrollment.status === 'active' && (!enrollment.expires_at || new Date(enrollment.expires_at).getTime() > Date.now())).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="rounded-xl border border-zinc-800 p-2 text-zinc-500 hover:text-white">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{profile.full_name || 'Unnamed User'}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500"><Mail size={14} /> {profile.email ?? 'No email found'}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 lg:col-span-2">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-zinc-800">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <User size={22} className="text-zinc-500" />}
            </div>
            <div>
              <p className="text-white font-semibold">{profile.full_name || profile.email || profile.id}</p>
              <p className="mt-1 text-xs text-zinc-600 font-mono">{profile.id}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {profile.roles.map(role => <span key={role} className="rounded-lg bg-purple-500/10 px-2.5 py-1 text-xs capitalize text-purple-300">{role}</span>)}
          </div>
        </div>
        <StatCard icon={GraduationCap} label="Created courses" value={createdCourses.length} color="text-blue-400" />
        <StatCard icon={BookOpen} label="Bought/enrolled" value={enrollments.length} color="text-green-400" />
        <StatCard icon={GraduationCap} label="Draft created" value={createdDraft} color="text-zinc-400" />
        <StatCard icon={GraduationCap} label="Published created" value={createdPublished} color="text-green-400" />
        <StatCard icon={GraduationCap} label="In review" value={createdReview} color="text-yellow-400" />
        <StatCard icon={WalletCards} label="Active bought access" value={boughtActive} color="text-purple-400" />
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="font-semibold text-white">Client Contact Details</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-600">Email</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-white"><Mail size={14} className="text-zinc-500" /> {profile.email ?? 'No email found'}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-600">Phone</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-white"><Phone size={14} className="text-zinc-500" /> {profile.phone ?? 'No phone saved'}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-600">Name</p>
            <p className="mt-1 text-sm text-white">{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.full_name || 'No name saved'}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-600">Role title</p>
            <p className="mt-1 text-sm text-white">{profile.role_title || 'No role title saved'}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-600">Website</p>
            {profile.website ? <a href={profile.website} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300">{profile.website}<ExternalLink size={12} /></a> : <p className="mt-1 text-sm text-zinc-500">No website saved</p>}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-600">LinkedIn</p>
            {profile.linkedin_url ? <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300">{profile.linkedin_url}<ExternalLink size={12} /></a> : <p className="mt-1 text-sm text-zinc-500">No LinkedIn saved</p>}
          </div>
        </div>
        {(profile.bio || profile.bio_lv) && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {profile.bio && <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"><p className="text-xs uppercase tracking-wider text-zinc-600">Bio</p><p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{profile.bio}</p></div>}
            {profile.bio_lv && <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"><p className="text-xs uppercase tracking-wider text-zinc-600">Bio LV</p><p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{profile.bio_lv}</p></div>}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="border-b border-zinc-800 p-4"><h2 className="font-semibold text-white flex items-center gap-2"><GraduationCap size={16} /> Teacher courses created · draft, review, published</h2></div>
        {createdCourses.length === 0 ? <p className="p-5 text-sm text-zinc-600">No created courses.</p> : (
          <div className="divide-y divide-zinc-800/70">
            {createdCourses.map(course => (
              <div key={course.id} className="flex items-center justify-between gap-4 p-4">
                <div><p className="text-sm font-medium text-white">{course.title_en}</p><p className="text-xs text-zinc-600">{course.enrollment_count ?? 0} students · {course.is_free ? 'Free' : `EUR ${course.price ?? 0}`}</p></div>
                <div className="flex items-center gap-2"><StatusBadge status={course.status} /><Link href={`/courses/${course.slug}?preview=1`} target="_blank" className="text-xs text-zinc-400 hover:text-white">Preview</Link><Link href={`/admin/courses/${course.id}/edit`} className="text-xs text-purple-400 hover:text-purple-300">Open</Link></div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="border-b border-zinc-800 p-4"><h2 className="font-semibold text-white flex items-center gap-2"><Users size={16} /> Other instructor involvement</h2></div>
        {assignedCourses.length === 0 ? <p className="p-5 text-sm text-zinc-600">No assigned teaching courses.</p> : (
          <div className="divide-y divide-zinc-800/70">
            {assignedCourses.map(course => (
              <div key={course.id} className="flex items-center justify-between gap-4 p-4">
                <div><p className="text-sm font-medium text-white">{course.title_en}</p><p className="text-xs text-zinc-600 capitalize">{course.assignment_role ?? 'teacher'}</p></div>
                <div className="flex items-center gap-2"><StatusBadge status={course.status} /><Link href={`/admin/courses/${course.id}/edit`} className="text-xs text-purple-400 hover:text-purple-300">Open</Link></div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="border-b border-zinc-800 p-4"><h2 className="font-semibold text-white flex items-center gap-2"><WalletCards size={16} /> Student courses bought/enrolled</h2></div>
        {enrollments.length === 0 ? <p className="p-5 text-sm text-zinc-600">No student enrollments.</p> : (
          <div className="divide-y divide-zinc-800/70">
            {enrollments.map(enrollment => (
              <div key={enrollment.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{enrollment.course?.title_en ?? 'Unknown course'}</p>
                  <p className={`mt-1 text-xs ${enrollment.expires_at && new Date(enrollment.expires_at).getTime() <= Date.now() ? 'text-red-400' : 'text-zinc-600'}`}>{accessLabel(enrollment.expires_at)} · enrolled {formatDate(enrollment.enrolled_at)}</p>
                </div>
                <div className="flex items-center gap-3"><StatusBadge status={enrollment.status} /><span className="text-xs text-zinc-500">{enrollment.progress_pct ?? 0}%</span><span className="text-xs text-zinc-400">{enrollment.amount_paid ? `${enrollment.currency ?? 'EUR'} ${enrollment.amount_paid}` : 'Free'}</span></div>
              </div>
            ))}
          </div>
        )}
      </section>

      {profile.stripe_account_id && <p className="flex items-center gap-2 text-xs text-zinc-600"><ShieldCheck size={13} /> Stripe account: {profile.stripe_account_id} · revenue share {profile.revenue_share_pct ?? 70}%</p>}
    </div>
  );
}