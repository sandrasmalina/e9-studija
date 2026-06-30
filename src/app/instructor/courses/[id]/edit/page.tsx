'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Upload } from 'lucide-react';

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

function Chapter({ id, title, subtitle, children, defaultOpen = true }: { id: string; title: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details id={id} open={defaultOpen} className="scroll-mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <summary className="cursor-pointer list-none">
        <h2 className="text-white font-semibold">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
      </summary>
      <div className="mt-5 space-y-4">{children}</div>
    </details>
  );
}

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
  thumbnail_url: string;
  promo_video_url: string;
  promo_video_type: string;
  level: string;
  language: string;
  requirements: string;    // newline-separated
  what_you_learn: string;  // newline-separated
  target_audience: string;
  price: string;
  discount_price: string;
  discount_starts_at: string;
  discount_ends_at: string;
  discount_type: 'none' | 'permanent' | 'period';
  is_free: boolean;
  starts_at: string;
  ends_at: string;
  certificate_enabled: boolean;
}

const EMPTY: CourseForm = {
  title_en: '', title_lv: '', short_description_en: '', short_description_lv: '',
  description_en: '', description_lv: '', thumbnail_url: '', promo_video_url: '', promo_video_type: 'youtube',
  level: 'beginner', language: 'en', requirements: '', what_you_learn: '', target_audience: '',
  price: '0', discount_price: '', discount_starts_at: '', discount_ends_at: '', discount_type: 'none', is_free: false,
  starts_at: '', ends_at: '', certificate_enabled: true,
};

export default function CourseEditPage() {
  const { id } = useParams() as { id: string };
  const [form, setForm] = useState<CourseForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const [courseTitle, setCourseTitle] = useState('');

  useEffect(() => {
    supabase.from('courses')
      .select('title_en, title_lv, short_description_en, short_description_lv, description_en, description_lv, thumbnail_url, promo_video_url, promo_video_type, level, language, requirements, what_you_learn, target_audience, price, discount_price, discount_starts_at, discount_ends_at, is_free, starts_at, ends_at, certificate_enabled')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCourseTitle(data.title_en);
          setForm({
            title_en: data.title_en ?? '',
            title_lv: data.title_lv ?? '',
            short_description_en: data.short_description_en ?? '',
            short_description_lv: data.short_description_lv ?? '',
            description_en: data.description_en ?? '',
            description_lv: data.description_lv ?? '',
            thumbnail_url: data.thumbnail_url ?? '',
            promo_video_url: data.promo_video_url ?? '',
            promo_video_type: data.promo_video_type ?? 'youtube',
            level: data.level ?? 'beginner',
            language: data.language ?? 'en',
            requirements: (data.requirements ?? []).join('\n'),
            what_you_learn: (data.what_you_learn ?? []).join('\n'),
            target_audience: data.target_audience ?? '',
            price: data.price != null ? String(data.price) : '0',
            discount_price: data.discount_price != null ? String(data.discount_price) : '',
            discount_starts_at: data.discount_starts_at ? data.discount_starts_at.slice(0, 16) : '',
            discount_ends_at: data.discount_ends_at ? data.discount_ends_at.slice(0, 16) : '',
            discount_type: data.discount_price ? (data.discount_starts_at || data.discount_ends_at ? 'period' : 'permanent') : 'none',
            is_free: data.is_free ?? false,
            starts_at: data.starts_at ? data.starts_at.slice(0, 16) : '',
            ends_at: data.ends_at ? data.ends_at.slice(0, 16) : '',
            certificate_enabled: data.certificate_enabled ?? true,
          });
        }
        setLoading(false);
      });
  }, [id]);

  const set = (k: keyof CourseForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title_en.trim()) { setErr('Title is required'); return; }
    setSaving(true); setErr(''); setSaved(false);

    const { error } = await supabase.from('courses').update({
      title_en: form.title_en.trim(),
      title_lv: form.title_lv.trim() || null,
      short_description_en: form.short_description_en.trim() || null,
      short_description_lv: form.short_description_lv.trim() || null,
      description_en: form.description_en.trim() || null,
      description_lv: form.description_lv.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      promo_video_url: form.promo_video_url.trim() || null,
      promo_video_type: form.promo_video_url.trim() ? form.promo_video_type : null,
      level: form.level,
      language: form.language,
      requirements: form.requirements.split('\n').map(s => s.trim()).filter(Boolean),
      what_you_learn: form.what_you_learn.split('\n').map(s => s.trim()).filter(Boolean),
      target_audience: form.target_audience.trim() || null,
      price: form.is_free ? 0 : Number(form.price) || 0,
      is_free: form.is_free,
      discount_price: !form.is_free && form.discount_type !== 'none' && form.discount_price ? Number(form.discount_price) : null,
      discount_starts_at: !form.is_free && form.discount_type === 'period' ? form.discount_starts_at || null : null,
      discount_ends_at: !form.is_free && form.discount_type === 'period' ? form.discount_ends_at || null : null,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
      certificate_enabled: form.certificate_enabled,
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    setSaving(false);
    if (error) { setErr(error.message); return; }
    setSaved(true);
    setCourseTitle(form.title_en);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>;
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
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          ['#basic', 'Basic'], ['#descriptions', 'Descriptions'], ['#pricing', 'Pricing'], ['#media', 'Media'], ['#outcomes', 'Outcomes'], ['#availability', 'Availability'],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-500 hover:border-purple-500/30 hover:text-white transition-colors">{label}</a>
        ))}
      </div>

      <div className="space-y-5">
        {/* Basic info */}
        <Chapter id="basic" title="Basic Information" subtitle="Course identity, level, and language.">
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
                <option value="en">English</option>
                <option value="lv">Latvian</option>
              </select>
            </Field>
          </div>
        </Chapter>

        {/* Descriptions */}
        <Chapter id="descriptions" title="Descriptions" subtitle="Short text for cards and rich landing-page content.">
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
          <Field label="Target Audience" hint="Who is this course for?">
            <Input value={form.target_audience} onChange={v => set('target_audience', v)} placeholder="e.g. Developers who want to build SaaS products" />
          </Field>
        </Chapter>

        {/* Pricing */}
        <Chapter id="pricing" title="Pricing" subtitle="Set free access, paid price, and permanent or timed discounts.">
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
        </Chapter>

        {/* Media */}
        <Chapter id="media" title="Media" subtitle="Course thumbnail and promo video.">
          <Field label="Thumbnail URL" hint="Paste a direct image URL (e.g. from Supabase storage)">
            <Input value={form.thumbnail_url} onChange={v => set('thumbnail_url', v)} placeholder="https://…/thumbnail.jpg" type="url" />
          </Field>
          {form.thumbnail_url && (
            <img src={form.thumbnail_url} alt="Thumbnail preview" className="w-48 rounded-xl border border-white/[0.06] object-cover aspect-video" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
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
        <Chapter id="outcomes" title="Learning Outcomes" subtitle="What students learn and what they need before starting.">
          <Field label="What Students Will Learn" hint="One item per line — shown as bullet list on landing page">
            <Textarea value={form.what_you_learn} onChange={v => set('what_you_learn', v)} placeholder={"Build a full-stack app\nDeploy to Vercel\nIntegrate with Supabase"} rows={5} />
          </Field>
          <Field label="Requirements / Prerequisites" hint="One item per line">
            <Textarea value={form.requirements} onChange={v => set('requirements', v)} placeholder={"Basic JavaScript knowledge\nNode.js installed"} rows={4} />
          </Field>
        </Chapter>

        {/* Availability */}
        <Chapter id="availability" title="Availability and Certificate" subtitle="When the course opens, finishes, and whether students receive certificates." defaultOpen={false}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Course Opens"><input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} className={`${inputCls} [color-scheme:dark]`} /></Field>
            <Field label="Course Finishes"><input type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} className={`${inputCls} [color-scheme:dark]`} /></Field>
          </div>
          <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-white/[0.06] bg-[#0b0915] p-4">
            <input type="checkbox" checked={form.certificate_enabled} onChange={e => set('certificate_enabled', e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-[#0b0915] accent-purple-500" />
            <div>
              <p className="text-white text-sm font-medium">Issue Certificates</p>
              <p className="text-zinc-600 text-xs">Students receive a certificate when they complete this course.</p>
            </div>
          </label>
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
