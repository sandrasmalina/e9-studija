'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Pencil, Trash2, Star, Eye, EyeOff, X } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  category: string;
  short_description: string;
  thumbnail_url: string;
  is_featured: boolean;
  published: boolean;
  created_at: string;
}

const emptyForm = {
  title: '',
  category: '',
  short_description: '',
  thumbnail_url: '',
  is_featured: false,
  published: true,
};

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing?: Project }>({ open: false });
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id,title,category,short_description,thumbnail_url,is_featured,published,created_at')
      .order('created_at', { ascending: false });
    setProjects(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm({ ...emptyForm });
    setModal({ open: true });
    setFormError('');
  };

  const openEdit = (p: Project) => {
    setForm({
      title: p.title,
      category: p.category,
      short_description: p.short_description,
      thumbnail_url: p.thumbnail_url,
      is_featured: p.is_featured,
      published: p.published,
    });
    setModal({ open: true, editing: p });
    setFormError('');
  };

  const closeModal = () => setModal({ open: false });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const { error } = modal.editing
      ? await supabase.from('projects').update(form).eq('id', modal.editing.id)
      : await supabase.from('projects').insert([form]);
    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    closeModal();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    await supabase.from('projects').delete().eq('id', id);
    load();
  };

  const toggleFeatured = async (p: Project) => {
    await supabase.from('projects').update({ is_featured: !p.is_featured }).eq('id', p.id);
    load();
  };

  const togglePublished = async (p: Project) => {
    await supabase.from('projects').update({ published: !p.published }).eq('id', p.id);
    load();
  };

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-zinc-500 text-sm mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={15} /> Add Project
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
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
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">Project</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium text-center">Featured</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium text-center">Live</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt="" className="w-10 h-7 rounded-lg object-cover bg-zinc-800 shrink-0" />
                        ) : (
                          <div className="w-10 h-7 rounded-lg bg-zinc-800 shrink-0" />
                        )}
                        <span className="text-white font-medium truncate max-w-[180px]">{p.title || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400 hidden md:table-cell">
                      {p.category || <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => toggleFeatured(p)}
                        title={p.is_featured ? 'Remove from homepage' : 'Feature on homepage'}
                        className={`inline-flex p-1.5 rounded-lg transition-colors ${
                          p.is_featured ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-600 hover:text-amber-400'
                        }`}
                      >
                        <Star size={13} fill={p.is_featured ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => togglePublished(p)}
                        title={p.published ? 'Unpublish' : 'Publish'}
                        className={`inline-flex p-1.5 rounded-lg transition-colors ${
                          p.published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600 hover:text-emerald-400'
                        }`}
                      >
                        {p.published ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                          title="Delete"
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

      {/* Add / Edit Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h2 className="text-white font-semibold">{modal.editing ? 'Edit Project' : 'Add Project'}</h2>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Title <span className="text-red-500">*</span></label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50 transition-colors"
                  placeholder="Project title"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Category</label>
                <input
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50 transition-colors"
                  placeholder="e.g. AI, Design, Education"
                />
              </div>

              {/* Short description */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Short Description</label>
                <textarea
                  value={form.short_description}
                  onChange={e => setForm({ ...form, short_description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50 transition-colors resize-none"
                  placeholder="Brief summary shown on cards"
                />
              </div>

              {/* Thumbnail URL */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Thumbnail URL</label>
                <input
                  value={form.thumbnail_url}
                  onChange={e => setForm({ ...form, thumbnail_url: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50 transition-colors"
                  placeholder="https://..."
                />
                {form.thumbnail_url && (
                  <img src={form.thumbnail_url} alt="preview" className="mt-2 h-20 rounded-lg object-cover border border-zinc-800" />
                )}
              </div>

              {/* Checkboxes */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={e => setForm({ ...form, is_featured: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 accent-violet-500"
                  />
                  <span className="text-sm text-zinc-300">Feature on homepage</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={e => setForm({ ...form, published: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-900 accent-violet-500"
                  />
                  <span className="text-sm text-zinc-300">Published</span>
                </label>
              </div>

              {formError && (
                <p className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{formError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-sm hover:text-white hover:border-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
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
