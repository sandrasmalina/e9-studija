'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Pencil, Trash2, X, GripVertical } from 'lucide-react';

interface ProjectCategory {
  id: string;
  name_en: string;
  name_lv: string;
  slug: string;
  sort_order: number;
}

const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const emptyForm = { name_en: '', name_lv: '', slug: '' };

export default function AdminProjectCategories() {
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing?: ProjectCategory }>({ open: false });
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('project_categories')
      .select('*')
      .order('sort_order', { ascending: true });
    setCategories(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...emptyForm });
    setModal({ open: true });
    setFormError('');
  };

  const openEdit = (c: ProjectCategory) => {
    setForm({ name_en: c.name_en, name_lv: c.name_lv || '', slug: c.slug });
    setModal({ open: true, editing: c });
    setFormError('');
  };

  const handleNameChange = (val: string) => {
    setForm(f => ({
      ...f,
      name_en: val,
      slug: modal.editing ? f.slug : toSlug(val),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.slug) { setFormError('Slug is required'); return; }
    setSaving(true); setFormError('');
    const payload = {
      name_en: form.name_en,
      name_lv: form.name_lv,
      slug: form.slug,
    };
    const { error } = modal.editing
      ? await supabase.from('project_categories').update(payload).eq('id', modal.editing.id)
      : await supabase.from('project_categories').insert([{ ...payload, sort_order: categories.length }]);
    if (error) { setFormError(error.message); setSaving(false); return; }
    setSaving(false);
    setModal({ open: false });
    load();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Projects using it will keep the category text.`)) return;
    await supabase.from('project_categories').delete().eq('id', id);
    load();
  };

  const handleReorder = async (cat: ProjectCategory, dir: 'up' | 'down') => {
    const idx = categories.indexOf(cat);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const next = [...categories];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    const reindexed = next.map((c, i) => ({ ...c, sort_order: i }));
    setCategories(reindexed);
    await Promise.all(
      reindexed.map(c =>
        supabase.from('project_categories').update({ sort_order: c.sort_order }).eq('id', c.id)
      )
    );
  };

  const inp = 'w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50 transition-colors';

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Project Categories</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'} — used as filters on the Projects page
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={15} /> Add Category
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          {categories.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              <p className="mb-3">No categories yet</p>
              <button onClick={openAdd} className="text-accent text-sm hover:underline">Add first category →</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/80 border-b border-zinc-800">
                <tr>
                  <th className="w-10 px-3 py-3" />
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Name (EN)</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Nosaukums (LV)</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Slug</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c, idx) => (
                  <tr key={c.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={() => handleReorder(c, 'up')}
                          disabled={idx === 0}
                          className="p-0.5 rounded text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                        >
                          <GripVertical size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-white font-medium">{c.name_en}</span>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400 hidden md:table-cell">{c.name_lv || '—'}</td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <code className="text-xs text-accent/70 bg-accent/10 px-2 py-0.5 rounded-md">{c.slug}</code>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name_en)}
                          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
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
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-white font-semibold">
                {modal.editing ? 'Edit Category' : 'Add Category'}
              </h2>
              <button onClick={() => setModal({ open: false })} className="text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                  Name (EN) <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.name_en}
                  onChange={e => handleNameChange(e.target.value)}
                  required
                  className={inp}
                  placeholder="e.g. Web Pages"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Nosaukums (LV)</label>
                <input
                  value={form.name_lv}
                  onChange={e => setForm(f => ({ ...f, name_lv: e.target.value }))}
                  className={inp}
                  placeholder="piem. Tīmekļa lapas"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: toSlug(e.target.value) }))}
                  required
                  className={inp}
                  placeholder="web-pages"
                />
                <p className="text-xs text-zinc-600 mt-1">Auto-generated from name, letters/numbers/hyphens only</p>
              </div>
              {formError && (
                <p className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setModal({ open: false })}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-sm hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {saving ? 'Saving…' : modal.editing ? 'Save Changes' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
