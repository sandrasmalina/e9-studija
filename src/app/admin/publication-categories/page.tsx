'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Pencil, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react';

interface PublicationCategory {
  id: string;
  name_en: string;
  name_lv: string;
  slug: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

const emptyForm = { name_en: '', name_lv: '', slug: '', description: '', is_active: true };
const toSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function AdminPublicationCategoriesPage() {
  const [categories, setCategories] = useState<PublicationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing?: PublicationCategory }>({ open: false });
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('publication_categories').select('*').order('display_order', { ascending: true });
    setCategories((data ?? []) as PublicationCategory[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ ...emptyForm }); setModal({ open: true }); setError(''); };
  const openEdit = (category: PublicationCategory) => {
    setForm({ name_en: category.name_en, name_lv: category.name_lv ?? '', slug: category.slug, description: category.description ?? '', is_active: category.is_active });
    setModal({ open: true, editing: category });
    setError('');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name_en.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    const payload = { ...form, slug: form.slug || toSlug(form.name_en) };
    const { error: saveError } = modal.editing
      ? await supabase.from('publication_categories').update(payload).eq('id', modal.editing.id)
      : await supabase.from('publication_categories').insert({ ...payload, display_order: categories.length });
    setSaving(false);
    if (saveError) { setError(saveError.message); return; }
    setModal({ open: false });
    load();
  };

  const handleDelete = async (category: PublicationCategory) => {
    if (!confirm(`Delete category "${category.name_en}"?`)) return;
    await supabase.from('publication_categories').delete().eq('id', category.id);
    load();
  };

  const handleReorder = async (category: PublicationCategory, direction: 'up' | 'down') => {
    const index = categories.indexOf(category);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return;
    const next = [...categories];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    const reindexed = next.map((item, idx) => ({ ...item, display_order: idx }));
    setCategories(reindexed);
    await Promise.all(reindexed.map(item => supabase.from('publication_categories').update({ display_order: item.display_order }).eq('id', item.id)));
  };

  const input = 'w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50 transition-colors';

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Publication Categories</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage filters for public publications.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-xl transition-colors"><Plus size={15} /> Add Category</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/80 border-b border-zinc-800">
              <tr>
                <th className="w-16 px-3 py-3 text-zinc-400 font-medium">Order</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Slug</th>
                <th className="text-center px-4 py-3 text-zinc-400 font-medium">Active</th>
                <th className="text-center px-4 py-3 text-zinc-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => (
                <tr key={category.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleReorder(category, 'up')} disabled={index === 0} className="p-1 text-zinc-600 hover:text-zinc-300 disabled:opacity-20"><ChevronUp size={13} /></button>
                      <button onClick={() => handleReorder(category, 'down')} disabled={index === categories.length - 1} className="p-1 text-zinc-600 hover:text-zinc-300 disabled:opacity-20"><ChevronDown size={13} /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{category.name_en}</p>
                    {category.name_lv && <p className="text-zinc-600 text-xs">{category.name_lv}</p>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell"><code className="text-xs text-accent/70 bg-accent/10 px-2 py-0.5 rounded-md">{category.slug}</code></td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-lg text-xs ${category.is_active ? 'bg-emerald-900/40 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>{category.is_active ? 'Active' : 'Hidden'}</span></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => openEdit(category)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(category)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {categories.length === 0 && <p className="text-center text-zinc-600 py-12 text-sm">No categories yet</p>}
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-white font-semibold">{modal.editing ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setModal({ open: false })} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Name (EN)</label>
                <input value={form.name_en} onChange={event => setForm(current => ({ ...current, name_en: event.target.value, slug: modal.editing ? current.slug : toSlug(event.target.value) }))} className={input} required />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Name (LV)</label>
                <input value={form.name_lv} onChange={event => setForm(current => ({ ...current, name_lv: event.target.value }))} className={input} />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Slug</label>
                <input value={form.slug} onChange={event => setForm(current => ({ ...current, slug: toSlug(event.target.value) }))} className={input} required />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Description</label>
                <textarea value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} className={`${input} resize-none`} rows={3} />
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={event => setForm(current => ({ ...current, is_active: event.target.checked }))} className="rounded accent-violet-500" /> Active
              </label>
              {error && <p className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setModal({ open: false })} className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-sm hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium transition-colors">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
