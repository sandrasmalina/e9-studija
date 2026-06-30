'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ExternalLink, Eye, EyeOff, ImageIcon, Pencil, Plus, Search, Star, Trash2, Upload, X } from 'lucide-react';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

interface Publication {
  id: string;
  title_en: string;
  title_lv: string;
  slug: string;
  short_description_en: string;
  short_description_lv: string;
  content_en: string;
  content_lv: string;
  has_lv: boolean;
  featured_media_url: string;
  featured_media_type: string;
  featured_image_alt: string;
  publication_date: string;
  author_id: string | null;
  external_source_url: string;
  is_featured: boolean;
  status: string;
  article_type: string;
  tags_ai_topics: string;
  reading_time: number;
  seo_title: string;
  seo_description: string;
  og_title: string;
  og_description: string;
  og_image: string;
  canonical_url: string;
  no_index: boolean;
  executive_summary: string;
  ai_summary: string;
  key_takeaways: string;
  faq_items: string;
  reference_sources: string;
  expertise_level: string;
  industry: string;
  last_updated: string;
  updated_at: string;
  author?: { full_name: string | null; avatar_url: string | null } | null;
}

interface PublicationCategory { id: string; name_en: string; name_lv: string; slug: string; }
interface Author { id: string; full_name: string | null; role_title: string | null; }

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = {
  title_en: '', title_lv: '', slug: '', short_description_en: '', short_description_lv: '', content_en: '', content_lv: '', has_lv: false,
  featured_media_url: '', featured_media_type: 'image', featured_image_alt: '', publication_date: today(), author_id: '', external_source_url: '',
  is_featured: false, status: 'draft', article_type: 'article', tags_ai_topics: '', reading_time: 1,
  seo_title: '', seo_description: '', og_title: '', og_description: '', og_image: '', canonical_url: '', no_index: false,
  executive_summary: '', ai_summary: '', key_takeaways: '', faq_items: '', reference_sources: '', expertise_level: '', industry: '', last_updated: today(),
};

const toSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const plainText = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const readingTimeFor = (html: string) => Math.max(1, Math.ceil(plainText(html).split(' ').filter(Boolean).length / 220));

function FormSection({ title, subtitle, children, defaultOpen = false }: { title: string; subtitle?: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <summary className="cursor-pointer list-none">
        <p className="text-sm font-semibold text-white">{title}</p>
        {subtitle && <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>}
      </summary>
      <div className="mt-5 space-y-4">{children}</div>
    </details>
  );
}

export default function AdminPublicationsPage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [categories, setCategories] = useState<PublicationCategory[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [publicationCategoryMap, setPublicationCategoryMap] = useState<Record<string, string[]>>({});
  const [modal, setModal] = useState<{ open: boolean; editing?: Publication }>({ open: false });
  const [form, setForm] = useState({ ...emptyForm });
  const [currentUserId, setCurrentUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id ?? '';
    setCurrentUserId(userId);

    const [{ data: roleRows }, { data: profile }, { data: categoryRows }, { data: publicationRows }, { data: linkRows }, { data: authorRows }] = await Promise.all([
      userId ? supabase.from('user_roles').select('roles(name)').eq('user_id', userId) : Promise.resolve({ data: [] as any[] }),
      userId ? supabase.from('profiles').select('role').eq('id', userId).single() : Promise.resolve({ data: null as any }),
      supabase.from('publication_categories').select('id,name_en,name_lv,slug').order('display_order', { ascending: true }),
      supabase.from('publications').select('*,author:profiles(full_name,avatar_url)').order('publication_date', { ascending: false }),
      supabase.from('publication_category_links').select('publication_id,category_id'),
      supabase.from('profiles').select('id,full_name,role_title').order('full_name', { ascending: true }),
    ]);

    const roleNames = new Set<string>();
    if (profile?.role) roleNames.add(profile.role);
    (roleRows ?? []).forEach((row: any) => row.roles?.name && roleNames.add(row.roles.name));
    const admin = roleNames.has('admin');
    setIsAdmin(admin);
    setCategories((categoryRows ?? []) as PublicationCategory[]);
    setPublications((publicationRows ?? []) as unknown as Publication[]);
    setAuthors(((authorRows ?? []) as Author[]).filter(author => admin || author.id === userId));
    const nextMap: Record<string, string[]> = {};
    (linkRows ?? []).forEach((row: any) => {
      nextMap[row.publication_id] = [...(nextMap[row.publication_id] ?? []), row.category_id];
    });
    setPublicationCategoryMap(nextMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...emptyForm, author_id: currentUserId });
    setSelectedCategoryIds([]);
    setModal({ open: true });
    setError('');
  };

  const openEdit = (publication: Publication) => {
    setForm({
      title_en: publication.title_en ?? '', title_lv: publication.title_lv ?? '', slug: publication.slug ?? '', short_description_en: publication.short_description_en ?? '', short_description_lv: publication.short_description_lv ?? '', content_en: publication.content_en ?? '', content_lv: publication.content_lv ?? '', has_lv: !!publication.has_lv,
      featured_media_url: publication.featured_media_url ?? '', featured_media_type: publication.featured_media_type ?? 'image', featured_image_alt: publication.featured_image_alt ?? '', publication_date: publication.publication_date ?? today(), author_id: publication.author_id ?? currentUserId, external_source_url: publication.external_source_url ?? '',
      is_featured: !!publication.is_featured, status: publication.status ?? 'draft', article_type: publication.article_type ?? 'article', tags_ai_topics: publication.tags_ai_topics ?? '', reading_time: publication.reading_time ?? readingTimeFor(publication.content_en ?? ''),
      seo_title: publication.seo_title ?? '', seo_description: publication.seo_description ?? '', og_title: publication.og_title ?? '', og_description: publication.og_description ?? '', og_image: publication.og_image ?? '', canonical_url: publication.canonical_url ?? '', no_index: !!publication.no_index,
      executive_summary: publication.executive_summary ?? '', ai_summary: publication.ai_summary ?? '', key_takeaways: publication.key_takeaways ?? '', faq_items: publication.faq_items ?? '', reference_sources: publication.reference_sources ?? '', expertise_level: publication.expertise_level ?? '', industry: publication.industry ?? '', last_updated: publication.last_updated ?? today(),
    });
    setSelectedCategoryIds(publicationCategoryMap[publication.id] ?? []);
    setModal({ open: true, editing: publication });
    setError('');
  };

  const handleUpload = async (file: File) => {
    setUploading(true); setError('');
    try {
      const ext = file.name.split('.').pop();
      const path = `publications/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('images').getPublicUrl(path);
      setForm(current => ({ ...current, featured_media_url: data.publicUrl, featured_media_type: 'image' }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const { data, error: categoryError } = await supabase.from('publication_categories').insert({ name_en: name, slug: toSlug(name), display_order: categories.length }).select('id,name_en,name_lv,slug').single();
    if (categoryError) { setError(categoryError.message); return; }
    setCategories(current => [...current, data as PublicationCategory]);
    setSelectedCategoryIds(current => [...current, data!.id]);
    setNewCategoryName('');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title_en.trim()) { setError('English title is required'); return; }
    if (!form.slug.trim()) { setError('Slug is required'); return; }
    if (!form.author_id) { setError('Author is required'); return; }
    setSaving(true); setError('');
    const contentReadingTime = readingTimeFor(form.content_en);
    const canonicalPath = `/publications/${toSlug(form.slug)}`;
    const payload = {
      ...form,
      slug: toSlug(form.slug),
      title_en: form.title_en.trim(),
      author_id: form.author_id || currentUserId,
      reading_time: contentReadingTime,
      seo_title: form.seo_title.trim() || form.title_en.trim(),
      seo_description: form.seo_description.trim() || form.short_description_en.trim(),
      og_title: form.og_title.trim() || form.seo_title.trim() || form.title_en.trim(),
      og_description: form.og_description.trim() || form.seo_description.trim() || form.short_description_en.trim(),
      og_image: form.og_image.trim() || form.featured_media_url.trim(),
      canonical_url: form.canonical_url.trim() || canonicalPath,
      last_updated: today(),
    };
    const { data, error: saveError } = modal.editing
      ? await supabase.from('publications').update(payload).eq('id', modal.editing.id).select('id').single()
      : await supabase.from('publications').insert(payload).select('id').single();
    if (saveError) { setSaving(false); setError(saveError.message); return; }
    const publicationId = modal.editing?.id ?? data?.id;
    if (publicationId) {
      await supabase.from('publication_category_links').delete().eq('publication_id', publicationId);
      if (selectedCategoryIds.length > 0) {
        await supabase.from('publication_category_links').insert(selectedCategoryIds.map(category_id => ({ publication_id: publicationId, category_id })));
      }
    }
    setSaving(false);
    setModal({ open: false });
    load();
  };

  const handleDelete = async (publication: Publication) => {
    if (!confirm('Are you sure you want to delete this publication? This action cannot be undone.')) return;
    await supabase.from('publications').delete().eq('id', publication.id);
    load();
  };

  const toggleStatus = async (publication: Publication) => {
    await supabase.from('publications').update({ status: publication.status === 'published' ? 'draft' : 'published' }).eq('id', publication.id);
    load();
  };

  const toggleFeatured = async (publication: Publication) => {
    await supabase.from('publications').update({ is_featured: !publication.is_featured }).eq('id', publication.id);
    load();
  };

  const filtered = publications.filter(publication => {
    const query = search.toLowerCase();
    const matchesSearch = !query || publication.title_en.toLowerCase().includes(query) || (publication.title_lv ?? '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || publication.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || (publicationCategoryMap[publication.id] ?? []).includes(categoryFilter);
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const input = 'w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50 transition-colors';
  const textarea = `${input} min-h-[110px] resize-y`;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Publications</h1>
          <p className="text-zinc-500 text-sm mt-1">Create, publish, and manage articles, interviews, press, and insights.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-xl transition-colors"><Plus size={15} /> Add Publication</button>
      </div>

      <div className="grid md:grid-cols-[1fr_auto_auto] gap-3 mb-6">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search publications…" className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-accent/50" />
        </div>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className={input}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className={input}>
          <option value="all">All categories</option>
          {categories.map(category => <option key={category.id} value={category.id}>{category.name_en}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 border-b border-zinc-800">
              <tr>
                <th className="text-left px-5 py-3 text-zinc-400 font-medium">Publication</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Categories</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden lg:table-cell">Date</th>
                <th className="text-center px-4 py-3 text-zinc-400 font-medium">Featured</th>
                <th className="text-center px-4 py-3 text-zinc-400 font-medium">Status</th>
                <th className="text-center px-4 py-3 text-zinc-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(publication => (
                <tr key={publication.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {publication.featured_media_url ? <img src={publication.featured_media_url} alt="" className="w-12 h-8 rounded-lg object-cover bg-zinc-800 shrink-0" /> : <div className="w-12 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0"><ImageIcon size={15} className="text-zinc-600" /></div>}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-white font-medium truncate max-w-[220px]">{publication.title_en}</p>
                          <Link href={`/publications/${publication.slug}`} target="_blank" className="text-zinc-600 hover:text-accent"><ExternalLink size={11} /></Link>
                        </div>
                        <p className="text-zinc-600 text-xs">{publication.author?.full_name ?? 'No author'}{publication.has_lv ? ' · LV' : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1.5">
                      {(publicationCategoryMap[publication.id] ?? []).map(categoryId => {
                        const category = categories.find(item => item.id === categoryId);
                        return category ? <span key={category.id} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{category.name_en}</span> : null;
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell">{new Date(publication.publication_date).toLocaleDateString('en-GB')}</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => toggleFeatured(publication)} className={`inline-flex p-1.5 rounded-lg transition-colors ${publication.is_featured ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-600 hover:text-amber-400'}`}><Star size={13} fill={publication.is_featured ? 'currentColor' : 'none'} /></button></td>
                  <td className="px-4 py-3 text-center"><button onClick={() => toggleStatus(publication)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs capitalize ${publication.status === 'published' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>{publication.status === 'published' ? <Eye size={12} /> : <EyeOff size={12} />} {publication.status}</button></td>
                  <td className="px-4 py-3 text-center"><div className="flex items-center justify-center gap-1.5"><button onClick={() => openEdit(publication)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"><Pencil size={13} /></button><button onClick={() => handleDelete(publication)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"><Trash2 size={13} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-zinc-600 py-12 text-sm">No publications found</p>}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-white font-semibold">{modal.editing ? 'Edit Publication' : 'Add Publication'}</h2>
              <button onClick={() => setModal({ open: false })} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              <FormSection title="1. Basic Information" subtitle="Title, language, status, author, and publication metadata." defaultOpen>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Title (EN)</label>
                    <input value={form.title_en} onChange={event => setForm(current => ({ ...current, title_en: event.target.value, slug: modal.editing ? current.slug : toSlug(event.target.value) }))} className={input} required />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Slug</label>
                    <input value={form.slug} onChange={event => setForm(current => ({ ...current, slug: toSlug(event.target.value) }))} className={input} required />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer w-fit">
                  <input type="checkbox" checked={form.has_lv} onChange={event => setForm(current => ({ ...current, has_lv: event.target.checked }))} className="rounded accent-violet-500" /> Add Latvian version
                </label>
                {form.has_lv && <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Title (LV)</label><input value={form.title_lv} onChange={event => setForm(current => ({ ...current, title_lv: event.target.value }))} className={input} /></div>}
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Short Description (EN)</label><textarea value={form.short_description_en} onChange={event => setForm(current => ({ ...current, short_description_en: event.target.value }))} className={textarea} rows={4} /></div>
                  {form.has_lv && <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Short Description (LV)</label><textarea value={form.short_description_lv} onChange={event => setForm(current => ({ ...current, short_description_lv: event.target.value }))} className={textarea} rows={4} /></div>}
                </div>
                <div className="grid md:grid-cols-4 gap-4">
                  <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Publication Date</label><input type="date" value={form.publication_date} onChange={event => setForm(current => ({ ...current, publication_date: event.target.value }))} className={input} /></div>
                  <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Status</label><select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value }))} className={input}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
                  <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Article Type</label><select value={form.article_type} onChange={event => setForm(current => ({ ...current, article_type: event.target.value }))} className={input}><option value="article">Article</option><option value="guide">Guide</option><option value="opinion">Opinion</option><option value="case_study">Case Study</option><option value="interview">Interview</option><option value="research_note">Research Note</option><option value="framework">Framework</option><option value="news">News</option><option value="tutorial">Tutorial</option><option value="whitepaper">Whitepaper</option></select></div>
                  <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Author</label><select value={form.author_id} onChange={event => setForm(current => ({ ...current, author_id: event.target.value }))} disabled={!isAdmin} className={input}>{authors.map(author => <option key={author.id} value={author.id}>{author.full_name || 'Unnamed user'}</option>)}</select></div>
                </div>
                <div className="flex items-center gap-6 pt-1"><label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={form.is_featured} onChange={event => setForm(current => ({ ...current, is_featured: event.target.checked }))} className="rounded accent-violet-500" /><span className="text-sm text-zinc-300">Featured publication</span></label><span className="text-xs text-zinc-600">Reading time saves automatically: {readingTimeFor(form.content_en)} min</span></div>
              </FormSection>

              <FormSection title="2. Categories and Content Type" subtitle="Multi-select categories and AI topic tags replacing old SEO keywords." defaultOpen>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Categories</label>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                  {categories.map(category => {
                    const checked = selectedCategoryIds.includes(category.id);
                    return <label key={category.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${checked ? 'border-accent/50 bg-accent/10 text-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}><input type="checkbox" checked={checked} onChange={() => setSelectedCategoryIds(current => checked ? current.filter(id => id !== category.id) : [...current, category.id])} className="rounded accent-violet-500" /> {category.name_en}</label>;
                  })}
                  <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                    <input value={newCategoryName} onChange={event => setNewCategoryName(event.target.value)} className={input} placeholder="Add new category if needed" />
                    <button type="button" onClick={handleAddCategory} className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors whitespace-nowrap">Add</button>
                  </div>
                </div>
                <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Tags / AI Topics</label><textarea value={form.tags_ai_topics} onChange={event => setForm(current => ({ ...current, tags_ai_topics: event.target.value }))} className={textarea} rows={3} placeholder="AI agents, automation, SaaS, education technology" /></div>
              </FormSection>

              <FormSection title="3. Media" subtitle="Cover media, upload, and accessibility text.">
              <div className="grid md:grid-cols-[160px_1fr_auto] gap-3">
                <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Media Type</label><select value={form.featured_media_type} onChange={event => setForm(current => ({ ...current, featured_media_type: event.target.value }))} className={input}><option value="image">Image</option><option value="youtube">YouTube</option><option value="vimeo">Vimeo</option></select></div>
                <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Media URL</label><input value={form.featured_media_url} onChange={event => setForm(current => ({ ...current, featured_media_url: event.target.value }))} className={input} placeholder="Image, YouTube, or Vimeo URL" /></div>
                <div className="flex items-end"><button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 text-sm transition-colors disabled:opacity-50 whitespace-nowrap"><Upload size={13} /> {uploading ? 'Uploading…' : 'Upload'}</button><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) handleUpload(file); }} /></div>
              </div>
              <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Image Alt Text</label><input value={form.featured_image_alt} onChange={event => setForm(current => ({ ...current, featured_image_alt: event.target.value }))} className={input} /></div>
              <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">External Source URL</label><input value={form.external_source_url} onChange={event => setForm(current => ({ ...current, external_source_url: event.target.value }))} className={input} placeholder="If originally published elsewhere" /></div>
              </FormSection>

              <FormSection title="4. Main Content" subtitle="Use H2/H3/H4 inside the article. The page H1 is generated from the title." defaultOpen>
                <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Content (EN)</label><RichTextEditor value={form.content_en} onChange={html => setForm(current => ({ ...current, content_en: html, reading_time: readingTimeFor(html) }))} minHeight="380px" placeholder="Write the publication content…" /></div>
                {form.has_lv && <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Content (LV)</label><RichTextEditor value={form.content_lv} onChange={html => setForm(current => ({ ...current, content_lv: html }))} minHeight="380px" placeholder="Raksta saturs latviski…" /></div>}
              </FormSection>

              <FormSection title="5. SEO and Sharing" subtitle="Keywords were removed here. Use Tags / AI Topics in the classification section.">
                <div className="grid md:grid-cols-2 gap-4"><input value={form.seo_title} onChange={event => setForm(current => ({ ...current, seo_title: event.target.value }))} className={input} placeholder="SEO title" /><input value={form.seo_description} onChange={event => setForm(current => ({ ...current, seo_description: event.target.value }))} className={input} placeholder="SEO description" /></div>
                <div className="grid md:grid-cols-2 gap-4"><input value={form.og_title} onChange={event => setForm(current => ({ ...current, og_title: event.target.value }))} className={input} placeholder="Open Graph title" /><input value={form.og_description} onChange={event => setForm(current => ({ ...current, og_description: event.target.value }))} className={input} placeholder="Open Graph description" /></div>
                <div className="grid md:grid-cols-2 gap-4"><input value={form.og_image} onChange={event => setForm(current => ({ ...current, og_image: event.target.value }))} className={input} placeholder="OG image URL" /><input value={form.canonical_url} onChange={event => setForm(current => ({ ...current, canonical_url: event.target.value }))} className={input} placeholder="Canonical URL override, optional" /></div>
                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer w-fit"><input type="checkbox" checked={form.no_index} onChange={event => setForm(current => ({ ...current, no_index: event.target.checked }))} className="rounded accent-violet-500" /> No-index this publication</label>
              </FormSection>

              <FormSection title="6. AI Search Optimization" subtitle="Structured article notes for AI search, Google AI Overviews, and fast reader scanning.">
                <div className="grid md:grid-cols-2 gap-4"><div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Expertise Level</label><select value={form.expertise_level} onChange={event => setForm(current => ({ ...current, expertise_level: event.target.value }))} className={input}><option value="">Not selected</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div><div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Industry</label><input value={form.industry} onChange={event => setForm(current => ({ ...current, industry: event.target.value }))} className={input} placeholder="AI & Automation, Education, SaaS…" /></div></div>
                <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Executive Summary</label><textarea value={form.executive_summary} onChange={event => setForm(current => ({ ...current, executive_summary: event.target.value }))} className={textarea} rows={4} placeholder="2–4 sentence reader-facing summary" /></div>
                <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">AI Summary</label><textarea value={form.ai_summary} onChange={event => setForm(current => ({ ...current, ai_summary: event.target.value }))} className={textarea} rows={4} placeholder="Concise summary for AI/search systems" /></div>
                <div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">Key Takeaways</label><textarea value={form.key_takeaways} onChange={event => setForm(current => ({ ...current, key_takeaways: event.target.value }))} className={textarea} rows={5} placeholder="One takeaway per line" /></div>
                <div className="grid md:grid-cols-2 gap-4"><div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">FAQ</label><textarea value={form.faq_items} onChange={event => setForm(current => ({ ...current, faq_items: event.target.value }))} className={textarea} rows={6} placeholder="Q: ...\nA: ..." /></div><div><label className="block text-xs text-zinc-400 mb-1.5 font-medium">References / Sources</label><textarea value={form.reference_sources} onChange={event => setForm(current => ({ ...current, reference_sources: event.target.value }))} className={textarea} rows={6} placeholder="Source title - URL" /></div></div>
              </FormSection>
              {error && <p className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3 pt-1"><button type="button" onClick={() => setModal({ open: false })} className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-sm hover:text-white transition-colors">Cancel</button><button type="submit" disabled={saving || uploading} className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium transition-colors">{saving ? 'Saving…' : 'Save Publication'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
