'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

interface Testimonial {
  id: string;
  client_name: string;
  client_role: string;
  content_en: string;
  content_lv: string;
  is_published: boolean;
  sort_order: number;
}

const emptyForm = {
  client_name: '',
  client_role: '',
  content_en: '',
  content_lv: '',
  is_published: true,
  sort_order: 0,
};

export default function AdminTestimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing?: Testimonial }>({ open: false });
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .order('sort_order', { ascending: true });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...emptyForm, sort_order: items.length });
    setModal({ open: true });
    setFormError('');
  };

  const openEdit = (t: Testimonial) => {
    setForm({
      client_name: t.client_name,
      client_role: t.client_role || '',
      content_en: t.content_en,
      content_lv: t.content_lv || '',
      is_published: t.is_published ?? true,
      sort_order: t.sort_order ?? 0,
    });
    setModal({ open: true, editing: t });
    setFormError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const { error } = modal.editing
      ? await supabase.from('testimonials').update(form).eq('id', modal.editing.id)
      : await supabase.from('testimonials').insert([form]);
    if (error) { setFormError(error.message); setSaving(false); return; }
    setSaving(false);
    setModal({ open: false });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return;
    await supabase.from('testimonials').delete().eq('id', id);
    load();
  };

  const inp = 'w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50 transition-colors';

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Testimonials</h1>
          <p className="text-zinc-500 text-sm mt-1">{items.length} testimonial{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={15} /> Add Testimonial
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          {items.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              <p className="mb-3">No testimonials yet</p>
              <button onClick={openAdd} className="text-accent text-sm hover:underline">
                Add first testimonial →
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/80 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">Client</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Content (EN)</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium">Status</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-white font-medium">{item.client_name}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{item.client_role}</p>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-zinc-400 text-xs line-clamp-2 max-w-xs">{item.content_en}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.is_published ? 'bg-green-500/15 text-green-400' : 'bg-zinc-700/40 text-zinc-500'
                      }`}>
                        {item.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
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

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
              <h2 className="text-white font-semibold">{modal.editing ? 'Edit Testimonial' : 'Add Testimonial'}</h2>
              <button onClick={() => setModal({ open: false })} className="p-2 text-zinc-500 hover:text-white rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Client Name *</label>
                  <input
                    className={inp}
                    value={form.client_name}
                    onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
                    required
                    placeholder="e.g. Anna Bērziņa"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Role / Company</label>
                  <input
                    className={inp}
                    value={form.client_role}
                    onChange={(e) => setForm((f) => ({ ...f, client_role: e.target.value }))}
                    placeholder="e.g. CEO, TechCorp"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Testimonial (English) *</label>
                <textarea
                  className={`${inp} resize-none`}
                  rows={4}
                  value={form.content_en}
                  onChange={(e) => setForm((f) => ({ ...f, content_en: e.target.value }))}
                  required
                  placeholder="What did the client say..."
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Testimonial (Latvian)</label>
                <textarea
                  className={`${inp} resize-none`}
                  rows={4}
                  value={form.content_lv}
                  onChange={(e) => setForm((f) => ({ ...f, content_lv: e.target.value }))}
                  placeholder="Klienta atsauksme latviski..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-xs mb-1.5 font-medium">Sort Order</label>
                  <input
                    type="number"
                    className={inp}
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <div
                      onClick={() => setForm((f) => ({ ...f, is_published: !f.is_published }))}
                      className={`w-10 h-5.5 rounded-full transition-colors cursor-pointer relative ${form.is_published ? 'bg-accent' : 'bg-zinc-700'}`}
                      style={{ height: '22px' }}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_published ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-zinc-300 text-sm">Published</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {modal.editing ? 'Save Changes' : 'Add Testimonial'}
                </button>
                <button
                  type="button"
                  onClick={() => setModal({ open: false })}
                  className="px-4 py-2.5 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
