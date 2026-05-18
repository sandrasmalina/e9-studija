'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Pencil, Trash2, Share2, Check, X } from 'lucide-react';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon_name: string;
  sort_order: number;
}

const ICON_OPTIONS = [
  { value: 'Linkedin', label: 'LinkedIn' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Twitter', label: 'Twitter / X' },
  { value: 'Youtube', label: 'YouTube' },
  { value: 'Github', label: 'GitHub' },
  { value: 'Mail', label: 'Email' },
  { value: 'Globe', label: 'Website / Other' },
];

const emptyForm = { platform: '', url: '', icon_name: 'Globe', sort_order: 0 };

export default function AdminSocialPage() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await supabase.from('social_links').select('*').order('sort_order');
    setLinks(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({ ...emptyForm, sort_order: links.length });
    setEditingId('new');
    setError('');
  };

  const openEdit = (link: SocialLink) => {
    setForm({ platform: link.platform, url: link.url, icon_name: link.icon_name, sort_order: link.sort_order });
    setEditingId(link.id);
    setError('');
  };

  const cancel = () => { setEditingId(null); setError(''); };

  const handleSave = async () => {
    if (!form.platform.trim() || !form.url.trim()) { setError('Platform and URL are required.'); return; }
    if (!form.url.startsWith('http') && !form.url.startsWith('mailto:')) {
      setError('URL must start with https:// or mailto:');
      return;
    }
    setSaving(true);
    setError('');
    if (editingId === 'new') {
      const { error: e } = await supabase.from('social_links').insert([form]);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { error: e } = await supabase.from('social_links').update(form).eq('id', editingId);
      if (e) { setError(e.message); setSaving(false); return; }
    }
    setSaving(false);
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this social link?')) return;
    await supabase.from('social_links').delete().eq('id', id);
    load();
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Social Media Links</h1>
          <p className="text-zinc-500 text-sm mt-1">Shown in the site footer</p>
        </div>
        {editingId === null && (
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors">
            <Plus size={15} /> Add Link
          </button>
        )}
      </div>

      {/* Inline form for new / edit */}
      {editingId !== null && (
        <div className="mb-6 p-5 rounded-2xl border border-accent/20 bg-accent/5 space-y-4">
          <p className="text-white text-sm font-semibold">{editingId === 'new' ? 'New Social Link' : 'Edit Social Link'}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 text-xs block mb-1">Platform name</label>
              <input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                placeholder="e.g. LinkedIn" className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-accent/50" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs block mb-1">Icon</label>
              <select value={form.icon_name} onChange={(e) => setForm({ ...form, icon_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-accent/50">
                {ICON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-zinc-400 text-xs block mb-1">URL</label>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://linkedin.com/company/..." className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-accent/50" />
          </div>
          <div className="w-24">
            <label className="text-zinc-400 text-xs block mb-1">Order</label>
            <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-accent/50" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors">
              <Check size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={cancel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
      ) : links.length === 0 ? (
        <div className="text-center py-16 text-zinc-500 rounded-2xl border border-zinc-800">
          <Share2 size={28} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No social links yet. Click "Add Link" to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                editingId === link.id ? 'border-accent/30 bg-accent/5' : 'border-zinc-800 bg-zinc-950/50'
              }`}>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-600 w-4 text-center">{link.sort_order}</span>
                <div>
                  <p className="text-white text-sm font-medium">{link.platform}</p>
                  <p className="text-zinc-500 text-xs truncate max-w-xs">{link.url}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded mr-2">{link.icon_name}</span>
                <button onClick={() => openEdit(link)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-accent hover:bg-zinc-800 transition-colors">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(link.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 rounded-xl border border-zinc-800 bg-zinc-950/30">
        <p className="text-zinc-500 text-xs font-medium mb-2 uppercase tracking-wider">Supabase table needed</p>
        <pre className="text-zinc-400 text-xs leading-relaxed overflow-x-auto">{`CREATE TABLE IF NOT EXISTS social_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_name TEXT DEFAULT 'Globe',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON social_links FOR SELECT USING (true);
CREATE POLICY "Auth write" ON social_links FOR ALL USING (auth.role() = 'authenticated');`}</pre>
      </div>
    </div>
  );
}
