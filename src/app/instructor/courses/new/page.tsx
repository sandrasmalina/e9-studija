'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Category { id: string; name_en: string; }

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function NewCoursePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ title_en: '', title_lv: '', category_id: '', level: 'beginner', language: 'en' });
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase.from('categories').select('id, name_en').eq('is_active', true).order('sort_order')
      .then(({ data }) => setCategories((data ?? []) as Category[]));
  }, []);

  // Auto-generate slug from title unless user has manually edited it
  useEffect(() => {
    if (!slugEdited) setSlug(toSlug(form.title_en));
  }, [form.title_en, slugEdited]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title_en.trim()) { setErr('Title is required'); return; }
    if (!slug.trim()) { setErr('Slug is required'); return; }
    setSaving(true); setErr('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErr('Not authenticated'); setSaving(false); return; }

    const { data, error } = await supabase.from('courses').insert({
      title_en: form.title_en.trim(),
      title_lv: form.title_lv.trim() || null,
      slug: slug.trim(),
      category_id: form.category_id || null,
      level: form.level,
      language: form.language,
      instructor_id: user.id,
      status: 'draft',
    }).select('id').single();

    if (error) { setErr(error.message); setSaving(false); return; }
    await supabase.from('course_instructors').insert({ course_id: data.id, instructor_id: user.id, role: 'lead', sort_order: 0 });
    router.push(`/instructor/courses/${data.id}/edit`);
  };

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/instructor/courses" className="p-2 rounded-xl border border-white/[0.06] text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={15} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">New Course</h1>
          <p className="text-zinc-500 text-sm">Set up the basics — you can fill in details after</p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
          {/* Title EN */}
          <div>
            <label className="block text-white text-sm font-medium mb-1.5">Course Title (English) <span className="text-red-400">*</span></label>
            <input value={form.title_en} onChange={e => set('title_en', e.target.value)}
              placeholder="e.g. Build AI Apps with Next.js"
              className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
          </div>

          {/* Title LV */}
          <div>
            <label className="block text-white text-sm font-medium mb-1.5">Title (Latvian) <span className="text-zinc-600 font-normal">optional</span></label>
            <input value={form.title_lv} onChange={e => set('title_lv', e.target.value)}
              placeholder="Latviešu nosaukums"
              className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-white text-sm font-medium mb-1.5">URL Slug <span className="text-red-400">*</span></label>
            <input value={slug} onChange={e => { setSlug(e.target.value); setSlugEdited(true); }}
              className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm font-mono focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
            <p className="text-zinc-600 text-xs mt-1">e9studija.com/courses/{slug || '…'}</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-white text-sm font-medium mb-1.5">Category</label>
            <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40">
              <option value="">— Select category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
            </select>
          </div>

          {/* Level + Language */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-1.5">Level</label>
              <select value={form.level} onChange={e => set('level', e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40">
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-1.5">Language</label>
              <select value={form.language} onChange={e => set('language', e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40">
                <option value="en">Only English</option>
                <option value="lv">Only Latvian</option>
                <option value="both">English + Latvian</option>
              </select>
            </div>
          </div>
        </div>

        {err && <p className="text-red-400 text-sm">{err}</p>}

        <button onClick={handleSubmit} disabled={saving}
          className="w-full py-3 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors">
          {saving ? 'Creating…' : 'Create Course & Continue →'}
        </button>
      </div>
    </div>
  );
}
