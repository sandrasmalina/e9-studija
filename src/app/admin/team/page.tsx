'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Pencil, Trash2, X, Upload } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image_url: string;
  language: string;
  position_en: string;
  position_lv: string;
  bio_en: string;
  bio_lv: string;
  photo_url: string;
  sort_order: number;
}

const emptyForm = { name: '', role: '', bio: '', image_url: '', language: 'en', position_en: '', position_lv: '', bio_en: '', bio_lv: '', photo_url: '', sort_order: 0 };

export default function AdminTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; editing?: TeamMember }>({ open: false });
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from('team_members').select('*').order('sort_order', { ascending: true });
    setMembers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm({ ...emptyForm }); setModal({ open: true }); setFormError(''); };
  const openEdit = (m: TeamMember) => {
    setForm({ name: m.name, role: m.role||'', bio: m.bio||'', image_url: m.image_url||'', language: m.language||'en', position_en: m.position_en||'', position_lv: m.position_lv||'', bio_en: m.bio_en||'', bio_lv: m.bio_lv||'', photo_url: m.photo_url||'', sort_order: m.sort_order||0 });
    setModal({ open: true, editing: m }); setFormError('');
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true); setFormError('');
    try {
      const ext = file.name.split('.').pop();
      const path = `team/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('images').getPublicUrl(path);
      setForm(f => ({ ...f, photo_url: data.publicUrl }));
    } catch (err: unknown) { setFormError(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFormError('');
    const { error } = modal.editing
      ? await supabase.from('team_members').update(form).eq('id', modal.editing.id)
      : await supabase.from('team_members').insert([form]);
    if (error) { setFormError(error.message); setSaving(false); return; }
    setSaving(false); setModal({ open: false }); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this team member?')) return;
    await supabase.from('team_members').delete().eq('id', id); load();
  };

  const inp = 'w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-accent/50 transition-colors';

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Members</h1>
          <p className="text-zinc-500 text-sm mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-xl transition-colors">
          <Plus size={15} /> Add Member
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          {members.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              <p className="mb-3">No team members yet</p>
              <button onClick={openAdd} className="text-accent text-sm hover:underline">Add first member →</button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/80 border-b border-zinc-800">
                <tr>
                  <th className="text-left px-5 py-3 text-zinc-400 font-medium">Member</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Position (EN)</th>
                  <th className="text-left px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Amats (LV)</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium text-center">Order</th>
                  <th className="px-4 py-3 text-zinc-400 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {m.photo_url ? (
                          <img src={m.photo_url} alt="" className="w-9 h-9 rounded-full object-cover bg-zinc-800 shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center text-zinc-500 text-xs font-bold">
                            {m.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <span className="text-white font-medium">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-400 hidden md:table-cell">{m.position_en || '—'}</td>
                    <td className="px-4 py-3.5 text-zinc-400 hidden md:table-cell">{m.position_lv || '—'}</td>
                    <td className="px-4 py-3.5 text-center text-zinc-500">{m.sort_order}</td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
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
              <h2 className="text-white font-semibold">{modal.editing ? 'Edit Member' : 'Add Team Member'}</h2>
              <button onClick={() => setModal({ open: false })} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Name <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className={inp} placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Sort order</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: Number(e.target.value)})} className={inp} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Position (EN)</label>
                  <input value={form.position_en} onChange={e => setForm({...form, position_en: e.target.value})} className={inp} placeholder="e.g. CEO" />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Amats (LV)</label>
                  <input value={form.position_lv} onChange={e => setForm({...form, position_lv: e.target.value})} className={inp} placeholder="piem. Izpilddirektors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Bio (EN)</label>
                  <textarea value={form.bio_en} onChange={e => setForm({...form, bio_en: e.target.value})} rows={3} className={`${inp} resize-none`} placeholder="Short biography..." />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Biogrāfija (LV)</label>
                  <textarea value={form.bio_lv} onChange={e => setForm({...form, bio_lv: e.target.value})} rows={3} className={`${inp} resize-none`} placeholder="Īsa biogrāfija..." />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Photo</label>
                <div className="flex gap-2">
                  <input value={form.photo_url} onChange={e => setForm({...form, photo_url: e.target.value})} className={inp} placeholder="https://... or upload →" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 text-sm transition-colors disabled:opacity-50 whitespace-nowrap">
                    <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                {form.photo_url && <img src={form.photo_url} alt="preview" className="mt-2 w-16 h-16 rounded-full object-cover border border-zinc-800" />}
              </div>
              {formError && <p className="text-red-400 text-xs bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{formError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal({ open: false })} className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-sm hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving||uploading} className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                  {saving ? 'Saving…' : modal.editing ? 'Save Changes' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
