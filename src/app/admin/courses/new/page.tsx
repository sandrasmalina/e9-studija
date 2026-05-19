'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Plus } from 'lucide-react';

interface CourseForm {
  title_en: string;
  title_lv: string;
  short_description_en: string;
  short_description_lv: string;
  description_en: string;
  thumbnail_url: string;
  promo_video_url: string;
  promo_video_type: string;
  level: string;
  language: string;
  requirements: string;
  what_you_learn: string;
  target_audience: string;
  price: string;
  discount_price: string;
  is_free: boolean;
  certificate_enabled: boolean;
  status: string;
  category_id: string;
}

const EMPTY: CourseForm = {
  title_en: '', title_lv: '', short_description_en: '', short_description_lv: '',
  description_en: '', thumbnail_url: '', promo_video_url: '', promo_video_type: 'youtube',
  level: 'beginner', language: 'en', requirements: '', what_you_learn: '', target_audience: '',
  price: '0', discount_price: '', is_free: false, certificate_enabled: true, status: 'draft',
  category_id: '',
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-zinc-300 text-sm font-medium mb-1.5">{label}</label>
      {hint && <p className="text-zinc-600 text-xs mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminCourseNewPage() {
  const router = useRouter();
  const [form, setForm] = useState<CourseForm>(EMPTY);
  const [categories, setCategories] = useState<{ id: string; name_en: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase.from('categories').select('id, name_en').order('name_en').then(({ data }) => {
      setCategories(data ?? []);
    });
  }, []);

  const set = (k: keyof CourseForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.title_en.trim()) { setErr('Title (English) is required'); return; }
    setSaving(true); setErr('');

    // Generate a unique slug
    const baseSlug = toSlug(form.title_en);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const { data, error } = await supabase.from('courses').insert({
      title_en: form.title_en.trim(),
      title_lv: form.title_lv.trim() || null,
      slug,
      short_description_en: form.short_description_en.trim() || null,
      short_description_lv: form.short_description_lv.trim() || null,
      description_en: form.description_en.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      promo_video_url: form.promo_video_url.trim() || null,
      promo_video_type: form.promo_video_url.trim() ? form.promo_video_type : null,
      level: form.level,
      language: form.language,
      requirements: form.requirements.split('\n').map(s => s.trim()).filter(Boolean),
      what_you_learn: form.what_you_learn.split('\n').map(s => s.trim()).filter(Boolean),
      target_audience: form.target_audience.trim() || null,
      price: form.is_free ? 0 : Number(form.price) || 0,
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      is_free: form.is_free,
      certificate_enabled: form.certificate_enabled,
      status: form.status,
      category_id: form.category_id || null,
      ...(form.status === 'published' ? { published_at: new Date().toISOString() } : {}),
    }).select('id').single();

    setSaving(false);
    if (error) { setErr(error.message); return; }
    router.push(`/admin/courses/${data.id}/edit`);
  };

  const inputCls = 'w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-zinc-500 placeholder-zinc-600';
  const textareaCls = `${inputCls} resize-none`;
  const selectCls = inputCls;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/courses" className="p-2 rounded-xl border border-zinc-700/50 text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">New Course</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Fill in the basics — you can edit everything later</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Status */}
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-white font-semibold">Status</h2>
          <Field label="Publication Status">
            <select value={form.status} onChange={e => set('status', e.target.value)} className={selectCls}>
              <option value="draft">Draft</option>
              <option value="review">In Review</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
          </Field>
        </div>

        {/* Basic info */}
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-white font-semibold">Basic Information</h2>
          <Field label="Course Title (English)">
            <input
              type="text"
              value={form.title_en}
              onChange={e => set('title_en', e.target.value)}
              placeholder="e.g. Complete Web Development Bootcamp"
              className={inputCls}
            />
          </Field>
          <Field label="Title (Latvian)" hint="Optional">
            <input type="text" value={form.title_lv} onChange={e => set('title_lv', e.target.value)} placeholder="Latviešu nosaukums" className={inputCls} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Category">
              <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className={selectCls}>
                <option value="">— None —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
              </select>
            </Field>
            <Field label="Level">
              <select value={form.level} onChange={e => set('level', e.target.value)} className={selectCls}>
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </Field>
            <Field label="Language">
              <select value={form.language} onChange={e => set('language', e.target.value)} className={selectCls}>
                <option value="en">English</option>
                <option value="lv">Latvian</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Descriptions */}
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-white font-semibold">Descriptions</h2>
          <Field label="Short Description (EN)">
            <textarea value={form.short_description_en} onChange={e => set('short_description_en', e.target.value)} rows={2} placeholder="Brief overview…" className={textareaCls} />
          </Field>
          <Field label="Short Description (LV)">
            <textarea value={form.short_description_lv} onChange={e => set('short_description_lv', e.target.value)} rows={2} placeholder="Īss apraksts latviešu valodā…" className={textareaCls} />
          </Field>
          <Field label="Full Description">
            <textarea value={form.description_en} onChange={e => set('description_en', e.target.value)} rows={6} placeholder="Detailed course description…" className={textareaCls} />
          </Field>
          <Field label="Target Audience">
            <input type="text" value={form.target_audience} onChange={e => set('target_audience', e.target.value)} placeholder="Who is this course for?" className={inputCls} />
          </Field>
        </div>

        {/* Media */}
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-white font-semibold">Media</h2>
          <Field label="Thumbnail URL">
            <input type="url" value={form.thumbnail_url} onChange={e => set('thumbnail_url', e.target.value)} placeholder="https://…" className={inputCls} />
          </Field>
          {form.thumbnail_url && (
            <img src={form.thumbnail_url} alt="Thumbnail" className="w-40 rounded-xl border border-zinc-700/50 object-cover aspect-video" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <Field label="Promo Video URL">
            <div className="flex gap-2">
              <input type="url" value={form.promo_video_url} onChange={e => set('promo_video_url', e.target.value)} placeholder="YouTube / Vimeo URL" className={inputCls} />
              <select value={form.promo_video_type} onChange={e => set('promo_video_type', e.target.value)} className="px-3 py-2.5 bg-zinc-900 border border-zinc-700/50 rounded-xl text-white text-sm focus:outline-none focus:border-zinc-500 shrink-0">
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
              </select>
            </div>
          </Field>
        </div>

        {/* Pricing */}
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-white font-semibold">Pricing</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_free} onChange={e => set('is_free', e.target.checked)} className="w-4 h-4 rounded accent-purple-500" />
            <span className="text-zinc-300 text-sm font-medium">Free Course</span>
          </label>
          {!form.is_free && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Price (€)">
                <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Discount Price (€)">
                <input type="number" min="0" step="0.01" value={form.discount_price} onChange={e => set('discount_price', e.target.value)} placeholder="Optional" className={inputCls} />
              </Field>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6">
          <h2 className="text-white font-semibold mb-4">Options</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.certificate_enabled} onChange={e => set('certificate_enabled', e.target.checked)} className="w-4 h-4 rounded accent-purple-500" />
            <span className="text-zinc-300 text-sm font-medium">Issue Certificates</span>
          </label>
        </div>

        {/* Learning outcomes */}
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-white font-semibold">Learning Outcomes</h2>
          <Field label="What Students Will Learn" hint="One item per line">
            <textarea value={form.what_you_learn} onChange={e => set('what_you_learn', e.target.value)} rows={5} placeholder={"Build a full-stack app\nDeploy to Vercel"} className={textareaCls} />
          </Field>
          <Field label="Requirements" hint="One item per line">
            <textarea value={form.requirements} onChange={e => set('requirements', e.target.value)} rows={4} placeholder={"Basic JavaScript\nNode.js installed"} className={textareaCls} />
          </Field>
        </div>

        {err && <p className="text-red-400 text-sm">{err}</p>}

        <div className="flex items-center gap-4 pb-8">
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            <Plus size={14} /> {saving ? 'Creating…' : 'Create Course'}
          </button>
          <Link href="/admin/courses" className="ml-auto text-zinc-600 hover:text-white text-sm transition-colors">
            ← Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
