'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Pencil, Trash2, Check, X, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';

interface Category {
  id: string;
  name_en: string;
  name_lv: string;
  slug: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

const emptyForm = { name_en: '', name_lv: '', slug: '', icon: '📚', is_active: true };

function toSlug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export default function AdminCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing?: Category }>({ open: false });
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    setCats((data ?? []) as Category[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ ...emptyForm }); setErr(''); setModal({ open: true }); };
  const openEdit = (c: Category) => { setForm({ name_en: c.name_en, name_lv: c.name_lv || '', slug: c.slug, icon: c.icon || '📚', is_active: c.is_active }); setErr(''); setModal({ open: true, editing: c }); };

  const handleSave = async () => {
    if (!form.name_en.trim()) { setErr('English name is required'); return; }
    setSaving(true);
    const slug = form.slug || toSlug(form.name_en);
    const payload = { name_en: form.name_en.trim(), name_lv: form.name_lv.trim(), slug, icon: form.icon, is_active: form.is_active };
    if (modal.editing) {
      const { error } = await supabase.from('categories').update(payload).eq('id', modal.editing.id);
      if (error) { setErr(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('categories').insert({ ...payload, sort_order: cats.length });
      if (error) { setErr(error.message); setSaving(false); return; }
    }
    setSaving(false);
    setModal({ open: false });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    await supabase.from('categories').delete().eq('id', id);
    setCats(c => c.filter(x => x.id !== id));
  };

  const handleToggle = async (cat: Category) => {
    await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    setCats(c => c.map(x => x.id === cat.id ? { ...x, is_active: !x.is_active } : x));
  };

  const handleReorder = async (cat: Category, dir: 'up' | 'down') => {
    const idx = cats.indexOf(cat);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= cats.length) return;
    const next = [...cats];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    next.forEach((c, i) => { c.sort_order = i; });
    setCats([...next]);
    await Promise.all(next.map((c, i) => supabase.from('categories').update({ sort_order: i }).eq('id', c.id)));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-zinc-500 text-sm mt-1">{cats.length} categories</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white transition-colors"><RefreshCw size={15} /></button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"><Plus size={16} /> Add Category</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-zinc-900/60 animate-pulse" />)}</div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-zinc-800 bg-zinc-900/60">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Icon</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium">Name EN</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden md:table-cell">Name LV</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 font-medium hidden lg:table-cell">Slug</th>
              <th className="text-center px-4 py-3 text-xs text-zinc-500 font-medium">Active</th>
              <th className="text-center px-4 py-3 text-xs text-zinc-500 font-medium">Order</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 font-medium">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-zinc-800/60">
              {cats.map((cat, idx) => (
                <tr key={cat.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="px-4 py-3 text-xl">{cat.icon}</td>
                  <td className="px-4 py-3 text-white text-sm font-medium">{cat.name_en}</td>
                  <td className="px-4 py-3 text-zinc-500 text-sm hidden md:table-cell">{cat.name_lv || '—'}</td>
                  <td className="px-4 py-3 text-zinc-600 text-xs font-mono hidden lg:table-cell">{cat.slug}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggle(cat)} className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all ${cat.is_active ? 'bg-green-900/40 text-green-400' : 'bg-zinc-800 text-zinc-600'}`}>
                      {cat.is_active ? <Check size={13} /> : <X size={13} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleReorder(cat, 'up')} disabled={idx === 0} className="p-1 rounded text-zinc-600 hover:text-zinc-300 disabled:opacity-25 transition-colors"><ChevronUp size={14} /></button>
                      <button onClick={() => handleReorder(cat, 'down')} disabled={idx === cats.length - 1} className="p-1 rounded text-zinc-600 hover:text-zinc-300 disabled:opacity-25 transition-colors"><ChevronDown size={14} /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-zinc-600 hover:text-accent hover:bg-accent/10 transition-all"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-900/20 transition-all"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-white font-semibold text-lg mb-6">{modal.editing ? 'Edit Category' : 'New Category'}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1.5 block">Icon</label>
                  <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-lg text-center focus:outline-none focus:border-accent/50" />
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-zinc-500 mb-1.5 block">Name (EN) *</label>
                  <input value={form.name_en} onChange={e => { setForm(f => ({ ...f, name_en: e.target.value, slug: f.slug || toSlug(e.target.value) })); }} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50" placeholder="AI Skills" />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Name (LV)</label>
                <input value={form.name_lv} onChange={e => setForm(f => ({ ...f, name_lv: e.target.value }))} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50" placeholder="AI Prasmes" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Slug</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: toSlug(e.target.value) }))} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-accent/50" placeholder="ai-skills" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-violet-500" />
                <span className="text-zinc-300 text-sm">Active (visible on site)</span>
              </label>
              {err && <p className="text-red-400 text-sm">{err}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal({ open: false })} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
