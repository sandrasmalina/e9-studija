'use client';

import { useEffect, useState, type DragEvent } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useUnsavedChangesGuard } from '@/lib/useUnsavedChangesGuard';
import { ArrowLeft, Plus, ImageIcon, Upload, X } from 'lucide-react';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

interface CourseForm {
  title_en: string;
  title_lv: string;
  slug: string;
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
  delivery_mode: string;
  requirements: string;
  requirements_lv: string;
  what_you_learn: string;
  what_you_learn_lv: string;
  target_audience: string;
  target_audience_lv: string;
  price: string;
  discount_price: string;
  discount_ends_at: string;
  billing_type: 'one_time' | 'subscription';
  subscription_interval: 'month' | 'year';
  is_free: boolean;
  access_duration_months: string;
  starts_at: string;
  ends_at: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
  canonical_url: string;
  no_index: boolean;
  ai_summary: string;
  key_takeaways: string;
  faq_items: string;
  tags_ai_topics: string;
  expertise_level: string;
  industry: string;
  certificate_enabled: boolean;
  status: string;
  category_id: string;
  instructor_id: string;
}

const EMPTY: CourseForm = {
  title_en: '', title_lv: '', slug: '', short_description_en: '', short_description_lv: '',
  description_en: '', description_lv: '', learning_schedule_en: '', learning_schedule_lv: '', thumbnail_url: '', thumbnail_url_lv: '', promo_video_url: '', promo_video_type: 'youtube',
  level: 'beginner', language: 'en', delivery_mode: 'online', requirements: '', requirements_lv: '', what_you_learn: '', what_you_learn_lv: '', target_audience: '', target_audience_lv: '',
  price: '0', discount_price: '', discount_ends_at: '', billing_type: 'one_time', subscription_interval: 'month', is_free: false, access_duration_months: '', starts_at: '', ends_at: '',
  meta_title: '', meta_description: '', meta_keywords: '', og_title: '', og_description: '', og_image: '', canonical_url: '', no_index: false,
  ai_summary: '', key_takeaways: '', faq_items: '', tags_ai_topics: '', expertise_level: '', industry: '',
  certificate_enabled: true, status: 'draft',
  category_id: '', instructor_id: '',
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
  const [instructors, setInstructors] = useState<{ id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  useUnsavedChangesGuard(!saving && JSON.stringify(form) !== JSON.stringify(EMPTY));

  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('id, name_en').order('name_en'),
      supabase.from('profiles').select('id, full_name').in('role', ['instructor', 'admin']).order('full_name'),
    ]).then(([{ data: cats }, { data: ins }]) => {
      setCategories(cats ?? []);
      setInstructors((ins ?? []) as { id: string; full_name: string }[]);
    });
  }, []);

  const set = (k: keyof CourseForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleThumbnailUpload = async (file: File, field: 'thumbnail_url' | 'thumbnail_url_lv') => {
    setUploading(true); setErr('');
    try {
      const ext = file.name.split('.').pop();
      const path = `courses/thumbnails/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('images').getPublicUrl(path);
      set(field, data.publicUrl);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Upload failed'); }
    finally { setUploading(false); }
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

  const handleCreate = async () => {
    if (!form.title_en.trim()) { setErr('Title (English) is required'); return; }
    setSaving(true); setErr('');

    const slug = toSlug(form.slug || form.title_en);
    if (!slug) { setSaving(false); setErr('Course URL slug is required'); return; }

    const [{ data: existingCourse }, { data: existingRedirect }] = await Promise.all([
      supabase.from('courses').select('id').eq('slug', slug).maybeSingle(),
      supabase.from('course_slug_redirects').select('old_slug').eq('old_slug', slug).maybeSingle(),
    ]);
    if (existingCourse || existingRedirect) {
      setSaving(false);
      setErr('This course URL slug is already used. Choose a different one.');
      return;
    }

    const { data, error } = await supabase.from('courses').insert({
      title_en: form.title_en.trim(),
      title_lv: form.title_lv.trim() || null,
      slug,
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
      delivery_mode: form.delivery_mode,
      requirements: form.requirements.split('\n').map(s => s.trim()).filter(Boolean),
      requirements_lv: form.requirements_lv.split('\n').map(s => s.trim()).filter(Boolean),
      what_you_learn: form.what_you_learn.split('\n').map(s => s.trim()).filter(Boolean),
      what_you_learn_lv: form.what_you_learn_lv.split('\n').map(s => s.trim()).filter(Boolean),
      target_audience: form.target_audience.trim() || null,
      target_audience_lv: form.target_audience_lv.trim() || null,
      price: form.is_free ? 0 : Number(form.price) || 0,
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      discount_ends_at: form.discount_ends_at || null,
      billing_type: form.is_free ? 'one_time' : form.billing_type,
      subscription_interval: form.subscription_interval,
      is_free: form.is_free,
      access_duration_months: form.access_duration_months ? Math.max(1, Number(form.access_duration_months) || 1) : null,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      meta_title: form.meta_title.trim() || form.title_en.trim(),
      meta_description: form.meta_description.trim() || form.short_description_en.trim() || null,
      meta_keywords: form.meta_keywords.trim() || null,
      og_title: form.og_title.trim() || form.meta_title.trim() || form.title_en.trim(),
      og_description: form.og_description.trim() || form.meta_description.trim() || form.short_description_en.trim() || null,
      og_image: form.og_image.trim() || form.thumbnail_url.trim() || null,
      canonical_url: form.canonical_url.trim() || `/courses/${slug}`,
      no_index: form.no_index,
      ai_summary: form.ai_summary.trim() || null,
      key_takeaways: form.key_takeaways.trim() || null,
      faq_items: form.faq_items.trim() || null,
      tags_ai_topics: form.tags_ai_topics.trim() || null,
      expertise_level: form.expertise_level.trim() || null,
      industry: form.industry.trim() || null,
      certificate_enabled: form.certificate_enabled,
      status: form.status,
      category_id: form.category_id || null,
      instructor_id: form.instructor_id || null,
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
    <div className="max-w-4xl">
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
              onChange={e => setForm(current => ({
                ...current,
                title_en: e.target.value,
                slug: !current.slug || current.slug === toSlug(current.title_en) ? toSlug(e.target.value) : current.slug,
              }))}
              placeholder="e.g. Complete Web Development Bootcamp"
              className={inputCls}
            />
          </Field>
          <Field label="Course URL slug" hint="Short readable ending for the course link. Example: ai-web-app-2-weeks">
            <div className="flex overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900 focus-within:border-zinc-500">
              <span className="flex items-center border-r border-zinc-700/50 px-3 text-xs text-zinc-500">/courses/</span>
              <input
                type="text"
                value={form.slug}
                onChange={e => set('slug', toSlug(e.target.value))}
                placeholder="ai-web-app-2-weeks"
                className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none"
              />
            </div>
          </Field>
          <Field label="Title (Latvian)" hint="Optional">
            <input type="text" value={form.title_lv} onChange={e => set('title_lv', e.target.value)} placeholder="Latviešu nosaukums" className={inputCls} />
          </Field>
          <Field label="Instructor" hint="Optional — who will teach this course">
            <select value={form.instructor_id} onChange={e => set('instructor_id', e.target.value)} className={selectCls}>
              <option value="">— Unassigned —</option>
              {instructors.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
            </select>
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
                <option value="en">Only English</option>
                <option value="lv">Only Latvian</option>
                <option value="both">English + Latvian</option>
              </select>
            </Field>
          </div>
          <Field label="Course Format">
            <div className="grid grid-cols-3 gap-2">
              {([['online', 'Online'], ['live', 'Live'], ['hybrid', 'Hybrid']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => set('delivery_mode', value)} className={`rounded-xl border px-3 py-2 text-sm transition-colors ${form.delivery_mode === value ? 'border-purple-500/40 bg-purple-500/15 text-white' : 'border-zinc-700/50 text-zinc-500 hover:text-white'}`}>{label}</button>
              ))}
            </div>
          </Field>
        </div>

        {/* Descriptions */}
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-white font-semibold">Descriptions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Short Description (EN)">
              <textarea value={form.short_description_en} onChange={e => set('short_description_en', e.target.value)} rows={3} placeholder="Brief overview…" className={textareaCls} />
            </Field>
            <Field label="Short Description (LV)">
              <textarea value={form.short_description_lv} onChange={e => set('short_description_lv', e.target.value)} rows={3} placeholder="Īss apraksts latviešu valodā…" className={textareaCls} />
            </Field>
          </div>
          <Field label="Full Description">
            <RichTextEditor value={form.description_en} onChange={v => set('description_en', v)} placeholder="Detailed course description…" minHeight="280px" />
          </Field>
          <Field label="Full Description (LV)" hint="Optional — supports headings, images, tables, embeds, and code blocks">
            <RichTextEditor value={form.description_lv} onChange={v => set('description_lv', v)} placeholder="Detalizēts kursa apraksts latviešu valodā…" minHeight="240px" />
          </Field>
          <div className="rounded-xl border border-zinc-700/50 bg-zinc-950/40 p-4 space-y-4">
            <h3 className="text-white text-sm font-semibold">Learning Dates and Format</h3>
            <Field label="Learning Dates / How It Happens (EN / EU)" hint="Use this for on-demand details, live lesson dates, weekly times, groups, recordings, and timezone notes.">
              <RichTextEditor value={form.learning_schedule_en} onChange={v => set('learning_schedule_en', v)} placeholder="Five live online sessions every Tuesday and Friday, 14:00-16:00 Riga time…" minHeight="220px" />
            </Field>
            <Field label="Mācību datumi / Kā notiek kurss (LV)" hint="Piemēram: nodarbību dienas, laiki, grupas, ieraksti, vai kurss ir skatāms pēc pieprasījuma.">
              <RichTextEditor value={form.learning_schedule_lv} onChange={v => set('learning_schedule_lv', v)} placeholder="Kurss notiek piecu tiešsaistes nodarbību formātā, katru otrdienu un piektdienu…" minHeight="220px" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Target Audience (EN)" hint="One item per line">
              <textarea value={form.target_audience} onChange={e => set('target_audience', e.target.value)} rows={5} placeholder={"Entrepreneurs with business ideas\nCoaches and consultants\nSmall business owners"} className={textareaCls} />
            </Field>
            <Field label="Target Audience (LV)" hint="Optional Latvian version — one item per line">
              <textarea value={form.target_audience_lv} onChange={e => set('target_audience_lv', e.target.value)} rows={5} placeholder={"Uzņēmēji ar biznesa idejām\nKouči un konsultanti\nMazo uzņēmumu īpašnieki"} className={textareaCls} />
            </Field>
          </div>
        </div>

        {/* Media */}
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-white font-semibold">Media</h2>
          <div className="grid grid-cols-2 gap-4">
            {([
              { field: 'thumbnail_url' as const, label: 'Thumbnail (EN / EU)', alt: 'English thumbnail' },
              { field: 'thumbnail_url_lv' as const, label: 'Thumbnail (LV)', alt: 'Latvian thumbnail' },
            ]).map(item => (
              <Field key={item.field} label={item.label}>
                <div className="space-y-3">
                  <label onDragEnter={event => event.preventDefault()} onDragOver={event => event.preventDefault()} onDrop={event => handleThumbnailDrop(event, item.field)} className={`flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                    uploading ? 'border-zinc-700 opacity-50 pointer-events-none' : 'border-zinc-700 hover:border-zinc-500'
                  }`}>
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbnailUpload(f, item.field); }} />
                    {uploading ? (
                      <><div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" /><span className="text-zinc-500 text-xs">Uploading…</span></>
                    ) : (
                      <><Upload size={20} className="text-zinc-600" /><span className="text-zinc-500 text-xs">Drag image here or click to upload</span></>
                    )}
                  </label>
                  {form[item.field] && (
                    <div className="relative w-40">
                      <img src={form[item.field]} alt={item.alt} className="w-40 rounded-xl border border-zinc-700/50 object-cover aspect-video" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <button type="button" onClick={() => set(item.field, '')} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center text-zinc-400 hover:text-white">
                        <X size={10} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ImageIcon size={14} className="text-zinc-600 shrink-0" />
                    <input type="url" value={form[item.field]} onChange={e => set(item.field, e.target.value)} placeholder="Or paste image URL…" className={inputCls} />
                  </div>
                </div>
              </Field>
            ))}
          </div>
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
              <Field label="Pricing Model">
                <select value={form.billing_type} onChange={e => set('billing_type', e.target.value)} className={selectCls}>
                  <option value="one_time">Single purchase</option>
                  <option value="subscription">Subscription</option>
                </select>
              </Field>
              {form.billing_type === 'subscription' && (
                <Field label="Billing Interval">
                  <select value={form.subscription_interval} onChange={e => set('subscription_interval', e.target.value)} className={selectCls}>
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                  </select>
                </Field>
              )}
              <Field label="Price (€)">
                <input type="number" min="0" step="0.01" value={form.price} onChange={e => set('price', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Discount Price (€)">
                <input type="number" min="0" step="0.01" value={form.discount_price} onChange={e => set('discount_price', e.target.value)} placeholder="Optional" className={inputCls} />
              </Field>
              <Field label="Discount Ends">
                <input type="datetime-local" value={form.discount_ends_at} onChange={e => set('discount_ends_at', e.target.value)} className={inputCls} />
              </Field>
            </div>
          )}
        </div>

        {/* Course availability */}
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-white font-semibold">Course Availability</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Course Opens">
              <input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Course Finishes">
              <input type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Student Access Duration" hint="Leave empty for lifetime access. Enter months to expire enrollments after purchase/enrollment.">
              <input type="number" min="1" value={form.access_duration_months} onChange={e => set('access_duration_months', e.target.value)} placeholder="Lifetime" className={inputCls} />
            </Field>
          </div>
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="What Students Will Learn (EN)" hint="One item per line">
              <textarea value={form.what_you_learn} onChange={e => set('what_you_learn', e.target.value)} rows={5} placeholder={"Build a full-stack app\nDeploy to Vercel"} className={textareaCls} />
            </Field>
            <Field label="What Students Will Learn (LV)" hint="One item per line">
              <textarea value={form.what_you_learn_lv} onChange={e => set('what_you_learn_lv', e.target.value)} rows={5} placeholder={"Izveidot pilnu web aplikāciju\nPublicēt projektu Vercel"} className={textareaCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Requirements (EN)" hint="One item per line">
              <textarea value={form.requirements} onChange={e => set('requirements', e.target.value)} rows={4} placeholder={"Basic JavaScript\nNode.js installed"} className={textareaCls} />
            </Field>
            <Field label="Requirements (LV)" hint="One item per line">
              <textarea value={form.requirements_lv} onChange={e => set('requirements_lv', e.target.value)} rows={4} placeholder={"Pamata JavaScript zināšanas\nUzstādīts Node.js"} className={textareaCls} />
            </Field>
          </div>
        </div>

        {/* SEO and AI search */}
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-white font-semibold">SEO and AI Search</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SEO Title"><input value={form.meta_title} onChange={e => set('meta_title', e.target.value)} placeholder="Defaults to course title" className={inputCls} /></Field>
            <Field label="Canonical URL"><input value={form.canonical_url} onChange={e => set('canonical_url', e.target.value)} placeholder="/courses/course-slug" className={inputCls} /></Field>
          </div>
          <Field label="SEO Description"><textarea value={form.meta_description} onChange={e => set('meta_description', e.target.value)} rows={3} placeholder="Search result description" className={textareaCls} /></Field>
          <Field label="SEO / AI Keywords"><input value={form.meta_keywords} onChange={e => set('meta_keywords', e.target.value)} placeholder="automation, education, AI workflows" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Open Graph Title"><input value={form.og_title} onChange={e => set('og_title', e.target.value)} placeholder="Social preview title" className={inputCls} /></Field>
            <Field label="Open Graph Image"><input value={form.og_image} onChange={e => set('og_image', e.target.value)} placeholder="Defaults to thumbnail" className={inputCls} /></Field>
          </div>
          <Field label="Open Graph Description"><textarea value={form.og_description} onChange={e => set('og_description', e.target.value)} rows={3} placeholder="Social preview description" className={textareaCls} /></Field>
          <Field label="AI Summary"><textarea value={form.ai_summary} onChange={e => set('ai_summary', e.target.value)} rows={3} placeholder="Short answer-style summary for AI search" className={textareaCls} /></Field>
          <Field label="Key Takeaways" hint="One item per line"><textarea value={form.key_takeaways} onChange={e => set('key_takeaways', e.target.value)} rows={4} placeholder={"Learn practical automation\nBuild reusable workflows"} className={textareaCls} /></Field>
          <Field label="FAQ Items" hint="Question and answer text for AI/search snippets"><textarea value={form.faq_items} onChange={e => set('faq_items', e.target.value)} rows={4} placeholder={"Who is this course for?\nBeginners and professionals…"} className={textareaCls} /></Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="AI Topics"><input value={form.tags_ai_topics} onChange={e => set('tags_ai_topics', e.target.value)} placeholder="topics, separated, by commas" className={inputCls} /></Field>
            <Field label="Expertise Level"><input value={form.expertise_level} onChange={e => set('expertise_level', e.target.value)} placeholder="Beginner / Professional" className={inputCls} /></Field>
            <Field label="Industry"><input value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="Creative, SaaS, Education" className={inputCls} /></Field>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.no_index} onChange={e => set('no_index', e.target.checked)} className="w-4 h-4 rounded accent-purple-500" />
            <span className="text-zinc-300 text-sm font-medium">Hide this course from search engines</span>
          </label>
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
