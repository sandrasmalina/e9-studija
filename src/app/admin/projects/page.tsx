'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Pencil, Trash2, Star, Eye, EyeOff, X, Upload, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';

interface Project {
  id: string;
  title: string; title_lv: string;
  category: string; client_name: string;
  short_description: string; short_description_lv: string;
  overview_en: string; overview_lv: string;
  goals_en: string; goals_lv: string;
  process_en: string; process_lv: string;
  results_en: string; results_lv: string;
  thumbnail_url: string; project_url: string;
  is_featured: boolean; published: boolean;
  sort_order: number;
  created_at: string;
}

const emptyForm = { title: '', title_lv: '', category: '', client_name: '', short_description: '', short_description_lv: '', overview_en: '', overview_lv: '', goals_en: '', goals_lv: '', process_en: '', process_lv: '', results_en: '', results_lv: '', thumbnail_url: '', project_url: '', is_featured: false, published: true, sort_order: 0 };

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<{ id: string; name_en: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing?: Project }>({ open: false });
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const cols = 'id,title,title_lv,category,client_name,short_description,short_description_lv,overview_en,overview_lv,goals_en,goals_lv,process_en,process_lv,results_en,results_lv,thumbnail_url,project_url,is_featured,published,sort_order,created_at';
    // eslint-disable-next-line prefer-const
    let { data, error } = await supabase.from('projects').select(cols).order('sort_order', { ascending: true });
    if (error) {
      const fallback = await supabase.from('projects').select('id,title,title_lv,category,short_description,short_description_lv,thumbnail_url,project_url,is_featured,published,created_at').order('created_at', { ascending: false });
      data = fallback.data as unknown as typeof data;
    }
    setProjects((data ?? []) as Project[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('project_categories').select('id,name_en').order('sort_order', { ascending: true })
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  const openAdd = () => { setForm({ ...emptyForm }); setModal({ open: true }); setFormError(''); };
  const openEdit = (p: Project) => {
    setForm({ title: p.title||'', title_lv: p.title_lv||'', category: p.category||'', client_name: p.client_name||'', short_description: p.short_description||'', short_description_lv: p.short_description_lv||'', overview_en: p.overview_en||'', overview_lv: p.overview_lv||'', goals_en: p.goals_en||'', goals_lv: p.goals_lv||'', process_en: p.process_en||'', process_lv: p.process_lv||'', results_en: p.results_en||'', results_lv: p.results_lv||'', thumbnail_url: p.thumbnail_url||'', project_url: p.project_url||'', is_featured: p.is_featured, published: p.published, sort_order: p.sort_order ?? 0 });
    setModal({ open: true, editing: p }); setFormError('');
  };

  const handleReorder = async (p: Project, dir: 'up' | 'down') => {
    const idx = projects.indexOf(p);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= projects.length) return;
    // Swap in array and assign positions 0,1,2,...
    const next = [...projects];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    const reindexed = next.map((proj, i) => ({ ...proj, sort_order: i }));
    setProjects(reindexed); // optimistic UI update
    // Persist — silent if sort_order column not yet in DB
    await Promise.all(
      reindexed.map(proj =>
        supabase.from('projects').update({ sort_order: proj.sort_order }).eq('id', proj.id)
      )
    );
  };
  const closeModal = () => setModal({ open: false });

  const handleImageUpload = async (file: File) => {
    setUploading(true); setFormError('');
    try {
      const ext = file.name.split('.').pop();
      const path = `projects/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('images').getPublicUrl(path);
      setForm(f => ({ ...f, thumbnail_url: data.publicUrl }));
    } catch (err: unknown) { setFormError(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFormError('');
    let { error } = modal.editing
      ? await supabase.from('projects').update(form).eq('id', modal.editing.id)
      : await supabase.from('projects').insert([form]);
    if (error && error.message.toLowerCase().includes('column')) {
      // Some new columns not yet in DB — save only known-safe fields
      const safe = { title: form.title, title_lv: form.title_lv, category: form.category, short_description: form.short_description, short_description_lv: form.short_description_lv, thumbnail_url: form.thumbnail_url, project_url: form.project_url, is_featured: form.is_featured, published: form.published };
      ({ error } = modal.editing
        ? await supabase.from('projects').update(safe).eq('id', modal.editing.id)
        : await supabase.from('projects').insert([safe]));
    }
    if (error) { setFormError(error.message); setSaving(false); return; }
    setSaving(false); closeModal(); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    await supabase.from('projects').delete().eq('id', id); load();
  };
  const toggleFeatured = async (p: Project) => { await supabase.from('projects').update({ is_featured: !p.is_featured }).eq('id', p.id); load(); };
  const togglePublished = async (p: Project) => { await supabase.from('projects').update({ published: !p.published }).eq('id', p.id); load(); };

  const inp = 'w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50 transition-colors';

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-zinc-500 text-sm mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-xl transition-colors">
          <Plus size={15} /> Add Project
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          {projects.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              <p className="mb-3">No projects yet</p>
              <button onClick={openAdd} className="text-accent text-sm hover:underline">Add your first project →</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/80 border-b border-zinc-800">
                <tr>
                  <th className="text-center px-3 py-3 text-zinc-400 font-medium w-10">Order</th>
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">Project</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium text-center">Featured</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium text-center">Live</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, idx) => (
                  <tr key={p.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <button onClick={() => handleReorder(p, 'up')} disabled={idx === 0} className="p-0.5 rounded text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"><ChevronUp size={13} /></button>
                        <span className="text-xs text-zinc-500 w-5 text-center">{p.sort_order}</span>
                        <button onClick={() => handleReorder(p, 'down')} disabled={idx === projects.length - 1} className="p-0.5 rounded text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"><ChevronDown size={13} /></button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {p.thumbnail_url ? <img src={p.thumbnail_url} alt="" className="w-10 h-7 rounded-lg object-cover bg-zinc-800 shrink-0" /> : <div className="w-10 h-7 rounded-lg bg-zinc-800 shrink-0" />}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-white font-medium truncate max-w-[150px]">{p.title || '—'}</p>
                            {p.project_url && <a href={p.project_url} target="_blank" rel="noopener noreferrer" title="View live" className="text-zinc-600 hover:text-accent transition-colors shrink-0" onClick={e => e.stopPropagation()}><ExternalLink size={11} /></a>}
                          </div>
                          {p.title_lv && <p className="text-zinc-600 text-xs truncate max-w-[160px]">{p.title_lv}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400 hidden md:table-cell">{p.category || <span className="text-zinc-600">—</span>}</td>
                    <td className="px-4 py-3.5 text-center">
                      <button onClick={() => toggleFeatured(p)} className={`inline-flex p-1.5 rounded-lg transition-colors ${p.is_featured ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-600 hover:text-amber-400'}`}>
                        <Star size={13} fill={p.is_featured ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button onClick={() => togglePublished(p)} className={`inline-flex p-1.5 rounded-lg transition-colors ${p.published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600 hover:text-emerald-400'}`}>
                        {p.published ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-white font-semibold">{modal.editing ? 'Edit Project' : 'Add Project'}</h2>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Title (EN) <span className="text-red-500">*</span></label>
                  <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className={inp} placeholder="English title" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Nosaukums (LV)</label>
                  <input value={form.title_lv} onChange={e => setForm({...form, title_lv: e.target.value})} className={inp} placeholder="Latvian title" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inp}>
                  <option value="">— Select category —</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name_en}>{c.name_en}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Client Name <span className="text-zinc-600 font-normal">(optional)</span></label>
                <input value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} className={inp} placeholder="Client or company name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Description (EN)</label>
                  <textarea value={form.short_description} onChange={e => setForm({...form, short_description: e.target.value})} rows={3} className={`${inp} resize-none`} placeholder="English description" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Apraksts (LV)</label>
                  <textarea value={form.short_description_lv} onChange={e => setForm({...form, short_description_lv: e.target.value})} rows={3} className={`${inp} resize-none`} placeholder="Latvian description" />
                </div>
              </div>

              {/* Rich content */}
              <div className="pt-2 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-3 uppercase tracking-widest">Detail Page Content</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Overview (EN)</label>
                    <textarea value={form.overview_en} onChange={e => setForm({...form, overview_en: e.target.value})} rows={3} className={`${inp} resize-none`} placeholder="Project overview in English" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Pārskats (LV)</label>
                    <textarea value={form.overview_lv} onChange={e => setForm({...form, overview_lv: e.target.value})} rows={3} className={`${inp} resize-none`} placeholder="Projekta pārskats latviski" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Goals (EN)</label>
                    <textarea value={form.goals_en} onChange={e => setForm({...form, goals_en: e.target.value})} rows={3} className={`${inp} resize-none`} placeholder="Project goals in English" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Mērķi (LV)</label>
                    <textarea value={form.goals_lv} onChange={e => setForm({...form, goals_lv: e.target.value})} rows={3} className={`${inp} resize-none`} placeholder="Projekta mērķi latviski" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Process (EN)</label>
                    <textarea value={form.process_en} onChange={e => setForm({...form, process_en: e.target.value})} rows={3} className={`${inp} resize-none`} placeholder="How it was built in English" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Process (LV)</label>
                    <textarea value={form.process_lv} onChange={e => setForm({...form, process_lv: e.target.value})} rows={3} className={`${inp} resize-none`} placeholder="Kā tika veidots latviski" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Results (EN)</label>
                    <textarea value={form.results_en} onChange={e => setForm({...form, results_en: e.target.value})} rows={3} className={`${inp} resize-none`} placeholder="Project results in English" />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Rezultāti (LV)</label>
                    <textarea value={form.results_lv} onChange={e => setForm({...form, results_lv: e.target.value})} rows={3} className={`${inp} resize-none`} placeholder="Projekta rezultāti latviski" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Live Project URL <span className="text-zinc-600 font-normal">(optional)</span></label>
                <input value={form.project_url} onChange={e => setForm({...form, project_url: e.target.value})} className={inp} placeholder="https://your-project.com" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Project Image</label>
                <div className="flex gap-2">
                  <input value={form.thumbnail_url} onChange={e => setForm({...form, thumbnail_url: e.target.value})} className={inp} placeholder="https://... or upload →" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 text-sm transition-colors disabled:opacity-50 whitespace-nowrap">
                    <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                {form.thumbnail_url && <img src={form.thumbnail_url} alt="preview" className="mt-2 h-24 rounded-xl object-cover border border-zinc-800" />}
              </div>
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})} className="rounded accent-violet-500" />
                  <span className="text-sm text-zinc-300">Feature on homepage</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={form.published} onChange={e => setForm({...form, published: e.target.checked})} className="rounded accent-violet-500" />
                  <span className="text-sm text-zinc-300">Published</span>
                </label>
              </div>
              {formError && <p className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{formError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-sm hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving||uploading} className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                  {saving ? 'Saving…' : modal.editing ? 'Save Changes' : 'Add Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
