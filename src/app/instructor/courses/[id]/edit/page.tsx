'use client';

import { useEffect, useState, type DragEvent } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useUnsavedChangesGuard } from '@/lib/useUnsavedChangesGuard';
import { ArrowLeft, ExternalLink, ImageIcon, Save, Upload, X } from 'lucide-react';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-white text-sm font-medium mb-1.5">{label}</label>
      {hint && <p className="text-zinc-600 text-xs mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function Chapter({ id, title, subtitle, children, open, onOpen }: { id: string; title: string; subtitle?: string; children: React.ReactNode; open: boolean; onOpen: () => void }) {
  return (
    <details id={id} open={open} className="scroll-mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <summary onClick={event => { event.preventDefault(); onOpen(); }} className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-white font-semibold">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
          </div>
          <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-xs text-zinc-500">{open ? 'Open' : 'Closed'}</span>
        </div>
      </summary>
      {open && <div className="mt-5 space-y-4">{children}</div>}
    </details>
  );
}

const CHAPTER_TABS = [
  ['basic', 'Basic'],
  ['descriptions', 'Descriptions'],
  ['schedule', 'Schedule'],
  ['pricing', 'Pricing'],
  ['media', 'Media'],
  ['outcomes', 'Outcomes'],
  ['availability', 'Availability'],
] as const;

type ChapterId = typeof CHAPTER_TABS[number][0];

const inputCls = 'w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600';

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />;
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={`${inputCls} resize-none`} />;
}

interface CourseForm {
  title_en: string;
  title_lv: string;
  short_description_en: string;
  short_description_lv: string;
  description_en: string;
  description_lv: string;
  learning_schedule_en: string;
  learning_schedule_lv: string;
  thumbnail_url: string;
  thumbnail_url_lv: string;
  promo_video_url: string;
  promo_video_type: string;
  level: string;
  language: string;
  requirements: string;    // newline-separated
  requirements_lv: string;
  what_you_learn: string;  // newline-separated
  what_you_learn_lv: string;
  target_audience: string;
  target_audience_lv: string;
  delivery_mode: string;
  price: string;
  discount_price: string;
  discount_starts_at: string;
  discount_ends_at: string;
  discount_type: 'none' | 'permanent' | 'period';
  is_free: boolean;
  fake_enrollment_count: string;
  access_duration_months: string;
  starts_at: string;
  ends_at: string;
  certificate_enabled: boolean;
}

interface AvailabilityGroup {
  id?: string;
  name_en: string;
  name_lv: string;
  language: string;
  starts_at: string;
  ends_at: string;
  capacity: string;
}

interface Teacher {
  id: string;
  full_name: string | null;
  role: string | null;
}

const EMPTY: CourseForm = {
  title_en: '', title_lv: '', short_description_en: '', short_description_lv: '',
  description_en: '', description_lv: '', learning_schedule_en: '', learning_schedule_lv: '', thumbnail_url: '', thumbnail_url_lv: '', promo_video_url: '', promo_video_type: 'youtube',
  level: 'beginner', language: 'en', requirements: '', requirements_lv: '', what_you_learn: '', what_you_learn_lv: '', target_audience: '', target_audience_lv: '', delivery_mode: 'online',
  price: '0', discount_price: '', discount_starts_at: '', discount_ends_at: '', discount_type: 'none', is_free: false, fake_enrollment_count: '0',
  access_duration_months: '', starts_at: '', ends_at: '', certificate_enabled: true,
};

function serializeCourseEditState(form: CourseForm, teacherIds: string[], groups: AvailabilityGroup[]) {
  return JSON.stringify({ form, teacherIds, groups });
}

export default function CourseEditPage() {
  const { id } = useParams() as { id: string };
  const [form, setForm] = useState<CourseForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [courseSlug, setCourseSlug] = useState('');
  const [activeChapter, setActiveChapter] = useState<ChapterId | null>('basic');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [availabilityGroups, setAvailabilityGroups] = useState<AvailabilityGroup[]>([]);
  const [canManageTeacherAssignments, setCanManageTeacherAssignments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: courseError } = await supabase.from('courses')
        .select('slug, instructor_id, title_en, title_lv, short_description_en, short_description_lv, description_en, description_lv, learning_schedule_en, learning_schedule_lv, thumbnail_url, thumbnail_url_lv, promo_video_url, promo_video_type, level, language, requirements, requirements_lv, what_you_learn, what_you_learn_lv, target_audience, target_audience_lv, delivery_mode, price, discount_price, discount_starts_at, discount_ends_at, is_free, fake_enrollment_count, access_duration_months, starts_at, ends_at, certificate_enabled')
        .eq('id', id)
        .maybeSingle();

      if (courseError || !data) {
        setErr(courseError?.message || 'Course not found or you do not have access to edit it.');
        setLoading(false);
        return;
      }

      const { data: profile } = user
        ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        : { data: null };
      setCanManageTeacherAssignments(profile?.role === 'admin' || data.instructor_id === user?.id);

      setCourseTitle(data.title_en);
      setCourseSlug(data.slug ?? '');
      const nextForm: CourseForm = {
        title_en: data.title_en ?? '',
        title_lv: data.title_lv ?? '',
        short_description_en: data.short_description_en ?? '',
        short_description_lv: data.short_description_lv ?? '',
        description_en: data.description_en ?? '',
        description_lv: data.description_lv ?? '',
        learning_schedule_en: data.learning_schedule_en ?? '',
        learning_schedule_lv: data.learning_schedule_lv ?? '',
        thumbnail_url: data.thumbnail_url ?? '',
        thumbnail_url_lv: data.thumbnail_url_lv ?? '',
        promo_video_url: data.promo_video_url ?? '',
        promo_video_type: data.promo_video_type ?? 'youtube',
        level: data.level ?? 'beginner',
        language: data.language ?? 'en',
        requirements: (data.requirements ?? []).join('\n'),
        requirements_lv: (data.requirements_lv ?? []).join('\n'),
        what_you_learn: (data.what_you_learn ?? []).join('\n'),
        what_you_learn_lv: (data.what_you_learn_lv ?? []).join('\n'),
        target_audience: data.target_audience ?? '',
        target_audience_lv: data.target_audience_lv ?? '',
        delivery_mode: data.delivery_mode ?? 'online',
        price: data.price != null ? String(data.price) : '0',
        discount_price: data.discount_price != null ? String(data.discount_price) : '',
        discount_starts_at: data.discount_starts_at ? data.discount_starts_at.slice(0, 16) : '',
        discount_ends_at: data.discount_ends_at ? data.discount_ends_at.slice(0, 16) : '',
        discount_type: data.discount_price ? (data.discount_starts_at || data.discount_ends_at ? 'period' : 'permanent') : 'none',
        is_free: data.is_free ?? false,
        fake_enrollment_count: data.fake_enrollment_count != null ? String(data.fake_enrollment_count) : '0',
        access_duration_months: data.access_duration_months != null ? String(data.access_duration_months) : '',
        starts_at: data.starts_at ? data.starts_at.slice(0, 16) : '',
        ends_at: data.ends_at ? data.ends_at.slice(0, 16) : '',
        certificate_enabled: data.certificate_enabled ?? true,
      };
      setForm(nextForm);

      const [{ data: groupRows }, { data: teacherRows }, { data: instructorRows }] = await Promise.all([
      supabase.from('course_availability_groups').select('id,name_en,name_lv,language,starts_at,ends_at,capacity,sort_order').eq('course_id', id).order('sort_order'),
      supabase.from('profiles').select('id, full_name, role').in('role', ['instructor', 'admin']).order('full_name'),
      supabase.from('course_instructors').select('instructor_id, sort_order').eq('course_id', id).order('sort_order'),
      ]);

      const nextTeacherIds = (instructorRows ?? []).length > 0
        ? (instructorRows ?? []).map(row => row.instructor_id)
        : (data.instructor_id ? [data.instructor_id] : []);
      const nextGroups = ((groupRows ?? []) as any[]).map(group => ({
        id: group.id,
        name_en: group.name_en ?? '',
        name_lv: group.name_lv ?? '',
        language: group.language ?? 'both',
        starts_at: group.starts_at ? group.starts_at.slice(0, 16) : '',
        ends_at: group.ends_at ? group.ends_at.slice(0, 16) : '',
        capacity: group.capacity != null ? String(group.capacity) : '',
      }));
      setSelectedTeacherIds(nextTeacherIds);
      setTeachers((teacherRows ?? []) as Teacher[]);
      setAvailabilityGroups(nextGroups);
      setSavedSnapshot(serializeCourseEditState(nextForm, nextTeacherIds, nextGroups));
      setLoading(false);
    };
    load();
  }, [id]);

  useUnsavedChangesGuard(!saving && !loading && !!savedSnapshot && savedSnapshot !== serializeCourseEditState(form, selectedTeacherIds, availabilityGroups));

  const set = (k: keyof CourseForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));
  const openChapter = (chapterId: ChapterId) => {
    setActiveChapter(current => {
      if (current === chapterId) return null;
      window.requestAnimationFrame(() => document.getElementById(chapterId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      return chapterId;
    });
  };
  const setAvailability = (index: number, key: keyof AvailabilityGroup, value: string) => setAvailabilityGroups(groups => groups.map((group, groupIndex) => groupIndex === index ? { ...group, [key]: value } : group));
  const addAvailability = () => setAvailabilityGroups(groups => [...groups, { name_en: '', name_lv: '', language: 'both', starts_at: '', ends_at: '', capacity: '' }]);
  const removeAvailability = (index: number) => setAvailabilityGroups(groups => groups.filter((_, groupIndex) => groupIndex !== index));
  const toggleTeacher = (teacherId: string) => setSelectedTeacherIds(ids => ids.includes(teacherId) ? ids.filter(id => id !== teacherId) : [...ids, teacherId]);

  const handleThumbnailUpload = async (file: File, field: 'thumbnail_url' | 'thumbnail_url_lv') => {
    setUploading(true);
    setErr('');
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `courses/thumbnails/${id}-${field}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('images').upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('images').getPublicUrl(path);
      set(field, data.publicUrl);
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleThumbnailDrop = (event: DragEvent<HTMLLabelElement>, field: 'thumbnail_url' | 'thumbnail_url_lv') => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErr('Please drop an image file.');
      return;
    }
    handleThumbnailUpload(file, field);
  };

  const handleSave = async () => {
    if (!form.title_en.trim()) { setErr('Title is required'); return; }
    setSaving(true); setErr(''); setSaved(false);

    const coursePayload: Record<string, unknown> = {
      title_en: form.title_en.trim(),
      title_lv: form.title_lv.trim() || null,
      short_description_en: form.short_description_en.trim() || null,
      short_description_lv: form.short_description_lv.trim() || null,
      description_en: form.description_en.trim() || null,
      description_lv: form.description_lv.trim() || null,
      learning_schedule_en: form.learning_schedule_en.trim() || null,
      learning_schedule_lv: form.learning_schedule_lv.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      thumbnail_url_lv: form.thumbnail_url_lv.trim() || null,
      promo_video_url: form.promo_video_url.trim() || null,
      promo_video_type: form.promo_video_url.trim() ? form.promo_video_type : null,
      level: form.level,
      language: form.language,
      requirements: form.requirements.split('\n').map(s => s.trim()).filter(Boolean),
      requirements_lv: form.requirements_lv.split('\n').map(s => s.trim()).filter(Boolean),
      what_you_learn: form.what_you_learn.split('\n').map(s => s.trim()).filter(Boolean),
      what_you_learn_lv: form.what_you_learn_lv.split('\n').map(s => s.trim()).filter(Boolean),
      target_audience: form.target_audience.trim() || null,
      target_audience_lv: form.target_audience_lv.trim() || null,
      delivery_mode: form.delivery_mode,
      price: form.is_free ? 0 : Number(form.price) || 0,
      is_free: form.is_free,
      fake_enrollment_count: Math.max(0, Number(form.fake_enrollment_count) || 0),
      access_duration_months: form.access_duration_months ? Math.max(1, Number(form.access_duration_months) || 1) : null,
      discount_price: !form.is_free && form.discount_type !== 'none' && form.discount_price ? Number(form.discount_price) : null,
      discount_starts_at: !form.is_free && form.discount_type === 'period' ? form.discount_starts_at || null : null,
      discount_ends_at: !form.is_free && form.discount_type === 'period' ? form.discount_ends_at || null : null,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      certificate_enabled: form.certificate_enabled,
      updated_at: new Date().toISOString(),
    };
    if (canManageTeacherAssignments) coursePayload.instructor_id = selectedTeacherIds[0] || null;

    const { error } = await supabase.from('courses').update(coursePayload).eq('id', id);

    if (error) { setSaving(false); setErr(error.message); return; }

    if (canManageTeacherAssignments) {
      await supabase.from('course_instructors').delete().eq('course_id', id);
      if (selectedTeacherIds.length > 0) {
        const { error: teacherError } = await supabase.from('course_instructors').insert(selectedTeacherIds.map((teacherId, index) => ({
          course_id: id,
          instructor_id: teacherId,
          role: index === 0 ? 'lead' : 'teacher',
          sort_order: index,
        })));
        if (teacherError) { setSaving(false); setErr(teacherError.message); return; }
      }
    }

    const normalizedGroups = availabilityGroups
      .map((group, index) => ({ ...group, sort_order: index, name_en: group.name_en.trim(), name_lv: group.name_lv.trim() }))
      .filter(group => group.name_en || group.name_lv || group.starts_at || group.ends_at);
    await supabase.from('course_availability_groups').delete().eq('course_id', id);
    if (normalizedGroups.length > 0) {
      const { error: groupError } = await supabase.from('course_availability_groups').insert(normalizedGroups.map(group => ({
        course_id: id,
        name_en: group.name_en || 'Group',
        name_lv: group.name_lv || null,
        language: group.language || 'both',
        starts_at: group.starts_at || null,
        ends_at: group.ends_at || null,
        capacity: group.capacity ? Number(group.capacity) : null,
        sort_order: group.sort_order,
      })));
      if (groupError) { setSaving(false); setErr(groupError.message); return; }
    }

    setSaving(false);
    setSaved(true);
    setCourseTitle(form.title_en);
    setSavedSnapshot(serializeCourseEditState(form, selectedTeacherIds, availabilityGroups));
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>;
  }

  if (err && !courseTitle) {
    return <p className="text-red-400 text-sm">{err}</p>;
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/instructor/courses" className="p-2 rounded-xl border border-white/[0.06] text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={15} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{courseTitle || 'Edit Course'}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Link href={`/instructor/courses/${id}/curriculum`} className="text-purple-400 text-xs hover:underline">Curriculum →</Link>
            <Link href={`/instructor/courses/${id}/settings`} className="text-purple-400 text-xs hover:underline">Settings →</Link>
            {courseSlug && (
              <a href={`/courses/${courseSlug}?preview=1`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-purple-400 text-xs hover:underline">
                Preview <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {CHAPTER_TABS.map(([chapterId, label]) => (
          <button key={chapterId} type="button" onClick={() => openChapter(chapterId)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
            activeChapter === chapterId
              ? 'border-purple-500/40 bg-purple-500/15 text-white'
              : 'border-white/[0.08] text-zinc-500 hover:border-purple-500/30 hover:text-white'
          }`}>{label}</button>
        ))}
      </div>

      {err && <p className="mb-5 text-red-400 text-sm">{err}</p>}

      <div className="space-y-5">
        {/* Basic info */}
        <Chapter id="basic" title="Basic Information" subtitle="Course identity, level, and language." open={activeChapter === 'basic'} onOpen={() => openChapter('basic')}>
          <Field label="Course Title (English)">
            <Input value={form.title_en} onChange={v => set('title_en', v)} placeholder="e.g. Build AI Apps with Next.js" />
          </Field>
          <Field label="Title (Latvian)" hint="Optional — shown to Latvian users">
            <Input value={form.title_lv} onChange={v => set('title_lv', v)} placeholder="Latviešu nosaukums" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Level">
              <select value={form.level} onChange={e => set('level', e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40">
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </Field>
            <Field label="Language">
              <select value={form.language} onChange={e => set('language', e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40">
                <option value="en">Only English</option>
                <option value="lv">Only Latvian</option>
                <option value="both">English + Latvian</option>
              </select>
            </Field>
          </div>
          <Field label="Course Format">
            <div className="grid grid-cols-3 gap-2">
              {([['online', 'Online'], ['live', 'Live'], ['hybrid', 'Hybrid']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => set('delivery_mode', value)} className={`rounded-xl border px-3 py-2 text-sm transition-colors ${form.delivery_mode === value ? 'border-purple-500/40 bg-purple-500/15 text-white' : 'border-white/[0.08] text-zinc-500 hover:text-white'}`}>{label}</button>
              ))}
            </div>
          </Field>
        </Chapter>

        {/* Descriptions */}
        <Chapter id="descriptions" title="Descriptions" subtitle="Short text for cards and rich landing-page content." open={activeChapter === 'descriptions'} onOpen={() => openChapter('descriptions')}>
          <Field label="Short Description (EN)" hint="Shown in course cards — max ~160 chars">
            <Textarea value={form.short_description_en} onChange={v => set('short_description_en', v)} placeholder="Brief overview of the course…" rows={2} />
          </Field>
          <Field label="Short Description (LV)" hint="Optional">
            <Textarea value={form.short_description_lv} onChange={v => set('short_description_lv', v)} placeholder="Īss apraksts latviešu valodā…" rows={2} />
          </Field>
          <Field label="Full Description (EN)" hint="Shown on the course landing page. Supports headings, links, images, tables, embeds, and code blocks.">
            <RichTextEditor value={form.description_en} onChange={v => set('description_en', v)} placeholder="Detailed course description…" minHeight="260px" />
          </Field>
          <Field label="Full Description (LV)" hint="Optional Latvian version with the same rich content tools.">
            <RichTextEditor value={form.description_lv} onChange={v => set('description_lv', v)} placeholder="Detalizēts kursa apraksts latviešu valodā…" minHeight="220px" />
          </Field>
        </Chapter>

        {/* Schedule */}
        <Chapter id="schedule" title="Learning Dates and Format" subtitle="Explain whether the course is on demand, live, hybrid, or runs on specific dates/groups." open={activeChapter === 'schedule'} onOpen={() => openChapter('schedule')}>
          <Field label="Learning Dates / How It Happens (EN / EU)" hint="Use this for online on-demand details, live lesson dates, weekly times, groups, recordings, and timezone notes.">
            <RichTextEditor value={form.learning_schedule_en} onChange={v => set('learning_schedule_en', v)} placeholder="Example: Five live online sessions every Tuesday and Friday, 14:00-16:00 Riga time. August group: Aug 7 · Aug 11… Recordings are available." minHeight="220px" />
          </Field>
          <Field label="Mācību datumi / Kā notiek kurss (LV)" hint="Piemēram: nodarbību dienas, laiki, grupas, ieraksti, vai kurss ir skatāms pēc pieprasījuma.">
            <RichTextEditor value={form.learning_schedule_lv} onChange={v => set('learning_schedule_lv', v)} placeholder="Kurss notiek piecu tiešsaistes nodarbību formātā, katru otrdienu un piektdienu plkst. 14:00-16:00 pēc Rīgas laika…" minHeight="220px" />
          </Field>
        </Chapter>

        {/* Pricing */}
        <Chapter id="pricing" title="Pricing" subtitle="Set free access, paid price, and permanent or timed discounts." open={activeChapter === 'pricing'} onOpen={() => openChapter('pricing')}>
          <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-white/[0.06] bg-[#0b0915] p-4">
            <input type="checkbox" checked={form.is_free} onChange={e => set('is_free', e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-[#0b0915] accent-purple-500" />
            <div>
              <p className="text-white text-sm font-medium">Free Course</p>
              <p className="text-zinc-600 text-xs">Students can register and create an account by applying to this free course.</p>
            </div>
          </label>
          {!form.is_free && (
            <>
              <Field label="Price (€)">
                <Input type="number" value={form.price} onChange={v => set('price', v)} placeholder="0.00" />
              </Field>
              <Field label="Discount Setup">
                <div className="grid grid-cols-3 gap-2">
                  {([['none', 'No discount'], ['permanent', 'Permanent'], ['period', 'Specific period']] as const).map(([value, label]) => (
                    <button key={value} type="button" onClick={() => set('discount_type', value)} className={`rounded-xl border px-3 py-2 text-sm transition-colors ${form.discount_type === value ? 'border-purple-500/40 bg-purple-500/15 text-white' : 'border-white/[0.08] text-zinc-500 hover:text-white'}`}>{label}</button>
                  ))}
                </div>
              </Field>
              {form.discount_type !== 'none' && (
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Discount Price (€)">
                    <Input type="number" value={form.discount_price} onChange={v => set('discount_price', v)} placeholder="Optional" />
                  </Field>
                  {form.discount_type === 'period' && (
                    <>
                      <Field label="Discount Starts"><input type="datetime-local" value={form.discount_starts_at} onChange={e => set('discount_starts_at', e.target.value)} className={`${inputCls} [color-scheme:dark]`} /></Field>
                      <Field label="Discount Ends"><input type="datetime-local" value={form.discount_ends_at} onChange={e => set('discount_ends_at', e.target.value)} className={`${inputCls} [color-scheme:dark]`} /></Field>
                    </>
                  )}
                </div>
              )}
            </>
          )}
          <Field label="Display Students" hint="Fake/display students added to real enrolled students on public course pages. Does not reduce group spots.">
            <Input type="number" value={form.fake_enrollment_count} onChange={v => set('fake_enrollment_count', v)} placeholder="0" />
          </Field>
          <Field label="Student Access Duration" hint="Leave empty for lifetime access. Enter months to make each enrollment expire after purchase/enrollment.">
            <Input type="number" value={form.access_duration_months} onChange={v => set('access_duration_months', v)} placeholder="Lifetime" />
          </Field>
        </Chapter>

        {/* Media */}
        <Chapter id="media" title="Media" subtitle="Course thumbnail and promo video." open={activeChapter === 'media'} onOpen={() => openChapter('media')}>
          <div className="grid grid-cols-2 gap-4">
            {([
              { field: 'thumbnail_url' as const, label: 'Thumbnail URL (EN / EU)', hint: 'Upload a course picture or paste a direct image URL.', alt: 'English thumbnail preview' },
              { field: 'thumbnail_url_lv' as const, label: 'Thumbnail URL (LV)', hint: 'Optional Latvian thumbnail. Upload or paste a direct image URL.', alt: 'Latvian thumbnail preview' },
            ]).map(item => (
              <Field key={item.field} label={item.label} hint={item.hint}>
                <div className="space-y-3">
                  <label onDragEnter={event => event.preventDefault()} onDragOver={event => event.preventDefault()} onDrop={event => handleThumbnailDrop(event, item.field)} className={`flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors ${uploading ? 'pointer-events-none border-white/[0.08] opacity-50' : 'border-white/[0.10] hover:border-white/25'}`}>
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={event => { const file = event.target.files?.[0]; if (file) handleThumbnailUpload(file, item.field); }} />
                    {uploading ? (
                      <><div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" /><span className="text-xs text-zinc-500">Uploading...</span></>
                    ) : (
                      <><Upload size={20} className="text-zinc-600" /><span className="text-xs text-zinc-500">Drag image here or click to upload</span></>
                    )}
                  </label>
                  {form[item.field] && (
                    <div className="relative w-48 max-w-full">
                      <img src={form[item.field]} alt={item.alt} className="aspect-video w-48 rounded-xl border border-white/[0.06] object-cover" onError={event => { (event.target as HTMLImageElement).style.display = 'none'; }} />
                      <button type="button" onClick={() => set(item.field, '')} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-zinc-400 hover:text-white">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ImageIcon size={14} className="shrink-0 text-zinc-600" />
                    <Input value={form[item.field]} onChange={value => set(item.field, value)} placeholder="https://.../thumbnail.jpg" type="url" />
                  </div>
                </div>
              </Field>
            ))}
          </div>
          <Field label="Promo Video URL" hint="YouTube or Vimeo video URL or ID">
            <div className="flex gap-2">
              <Input value={form.promo_video_url} onChange={v => set('promo_video_url', v)} placeholder="https://youtube.com/watch?v=… or video ID" type="url" />
              <select value={form.promo_video_type} onChange={e => set('promo_video_type', e.target.value)}
                className="px-3 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40">
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
              </select>
            </div>
          </Field>
        </Chapter>

        {/* Learning outcomes */}
        <Chapter id="outcomes" title="Learning Outcomes" subtitle="What students learn and what they need before starting." open={activeChapter === 'outcomes'} onOpen={() => openChapter('outcomes')}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="What Students Will Learn (EN)" hint="One item per line">
              <Textarea value={form.what_you_learn} onChange={v => set('what_you_learn', v)} placeholder={"Build a full-stack app\nDeploy to Vercel\nIntegrate with Supabase"} rows={5} />
            </Field>
            <Field label="What Students Will Learn (LV)" hint="One item per line">
              <Textarea value={form.what_you_learn_lv} onChange={v => set('what_you_learn_lv', v)} placeholder={"Izveidot pilnu lietotni\nPublicēt Vercel"} rows={5} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Requirements / Prerequisites (EN)" hint="One item per line">
              <Textarea value={form.requirements} onChange={v => set('requirements', v)} placeholder={"Basic JavaScript knowledge\nNode.js installed"} rows={4} />
            </Field>
            <Field label="Requirements / Prerequisites (LV)" hint="One item per line">
              <Textarea value={form.requirements_lv} onChange={v => set('requirements_lv', v)} placeholder={"Pamatzināšanas JavaScript\nInstalēts Node.js"} rows={4} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Who This Course Is For (EN)" hint="One item per line">
              <Textarea value={form.target_audience} onChange={v => set('target_audience', v)} placeholder={"Entrepreneurs with business ideas\nCoaches and consultants\nSmall business owners"} rows={5} />
            </Field>
            <Field label="Kam šis kurss ir paredzēts (LV)" hint="One item per line">
              <Textarea value={form.target_audience_lv} onChange={v => set('target_audience_lv', v)} placeholder={"Uzņēmējiem ar biznesa idejām\nKonsultantiem un koučiem\nMazo uzņēmumu īpašniekiem"} rows={5} />
            </Field>
          </div>
        </Chapter>

        {/* Availability */}
        <Chapter id="availability" title="Availability and Certificate" subtitle="Add one or more groups/cohorts, for example August, September, or November." open={activeChapter === 'availability'} onOpen={() => openChapter('availability')}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Course Opens"><input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} className={`${inputCls} [color-scheme:dark]`} /></Field>
            <Field label="Course Finishes"><input type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} className={`${inputCls} [color-scheme:dark]`} /></Field>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-white text-sm font-medium">Availability Groups</p>
                <p className="text-zinc-600 text-xs">Use separate groups when the same course opens in different months.</p>
              </div>
              <button type="button" onClick={addAvailability} className="rounded-xl border border-purple-500/30 px-3 py-2 text-xs font-medium text-purple-300 hover:bg-purple-500/10 transition-colors">Add group</button>
            </div>
            {availabilityGroups.length === 0 && <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-5 text-center text-sm text-zinc-600">No groups yet. Add August, September, November, or any other intake.</p>}
            {availabilityGroups.map((group, index) => (
              <div key={group.id ?? index} className="rounded-xl border border-white/[0.06] bg-[#0b0915] p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Group Name (EN)"><Input value={group.name_en} onChange={value => setAvailability(index, 'name_en', value)} placeholder="August group" /></Field>
                  <Field label="Group Name (LV)"><Input value={group.name_lv} onChange={value => setAvailability(index, 'name_lv', value)} placeholder="Augusta grupa" /></Field>
                </div>
                <Field label="Group Language">
                  <select value={group.language} onChange={event => setAvailability(index, 'language', event.target.value)} className={inputCls}>
                    <option value="both">English + Latvian</option>
                    <option value="en">Only English</option>
                    <option value="lv">Only Latvian</option>
                  </select>
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Opens"><input type="datetime-local" value={group.starts_at} onChange={event => setAvailability(index, 'starts_at', event.target.value)} className={`${inputCls} [color-scheme:dark]`} /></Field>
                  <Field label="Closes"><input type="datetime-local" value={group.ends_at} onChange={event => setAvailability(index, 'ends_at', event.target.value)} className={`${inputCls} [color-scheme:dark]`} /></Field>
                  <Field label="Capacity"><Input type="number" value={group.capacity} onChange={value => setAvailability(index, 'capacity', value)} placeholder="Optional" /></Field>
                </div>
                <button type="button" onClick={() => removeAvailability(index)} className="text-xs text-zinc-600 hover:text-red-400 transition-colors">Remove group</button>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-white/[0.06] bg-[#0b0915] p-4">
            <input type="checkbox" checked={form.certificate_enabled} onChange={e => set('certificate_enabled', e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-[#0b0915] accent-purple-500" />
            <div>
              <p className="text-white text-sm font-medium">Issue Certificates</p>
              <p className="text-zinc-600 text-xs">Students receive a certificate when they complete this course.</p>
            </div>
          </label>
          <Field label="Lecturers / Teachers" hint={canManageTeacherAssignments ? 'Select one or several teachers. The first selected teacher is the lead instructor.' : 'Only admins and the lead instructor can change teacher assignments.'}>
            <div className="grid grid-cols-2 gap-2">
              {teachers.map(teacher => (
                <label key={teacher.id} className={`flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0b0915] px-3 py-2 text-sm text-zinc-300 ${canManageTeacherAssignments ? '' : 'opacity-70'}`}>
                  <input type="checkbox" checked={selectedTeacherIds.includes(teacher.id)} disabled={!canManageTeacherAssignments} onChange={() => toggleTeacher(teacher.id)} className="h-4 w-4 rounded accent-purple-500 disabled:opacity-50" />
                  <span className="truncate">{teacher.full_name || teacher.id}</span>
                </label>
              ))}
            </div>
          </Field>
        </Chapter>

        {err && <p className="text-red-400 text-sm">{err}</p>}

        <div className="flex items-center gap-4 pb-8">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors">
            <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {saved && <span className="text-green-400 text-sm">✓ Saved</span>}
          <Link href={`/instructor/courses/${id}/curriculum`}
            className="ml-auto text-zinc-500 hover:text-white text-sm transition-colors">
            Next: Curriculum →
          </Link>
        </div>
      </div>
    </div>
  );
}
