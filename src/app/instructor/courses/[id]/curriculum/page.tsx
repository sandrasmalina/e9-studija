'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown,
  Edit2, Check, X, Play, FileText, Save, ChevronRight, ChevronDown as Expand
} from 'lucide-react';

interface Lecture {
  id: string;
  title_en: string;
  content_type: string;
  video_type: string | null;
  video_url: string | null;
  video_duration_seconds: number;
  is_preview: boolean;
  description_en: string | null;
  text_content: string | null;
  sort_order: number;
}

interface Section {
  id: string;
  title_en: string;
  sort_order: number;
  lectures: Lecture[];
  open: boolean;
}

const EMPTY_LECTURE_FORM = {
  title_en: '', content_type: 'video', video_type: 'youtube',
  video_url: '', video_duration_seconds: '', is_preview: false,
  description_en: '', text_content: '',
};

function fmtSec(s: number) {
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

export default function CurriculumPage() {
  const { id: courseId } = useParams() as { id: string };
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseTitle, setCourseTitle] = useState('');

  // Section editing
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  // Lecture modal
  const [lectureModal, setLectureModal] = useState<{ sectionId: string; lectureId?: string } | null>(null);
  const [lectureForm, setLectureForm] = useState({ ...EMPTY_LECTURE_FORM });
  const [lectureSaving, setLectureSaving] = useState(false);
  const [lectureErr, setLectureErr] = useState('');

  const load = async () => {
    const { data: course } = await supabase.from('courses').select('title_en').eq('id', courseId).single();
    setCourseTitle(course?.title_en ?? '');

    const { data: secs } = await supabase
      .from('sections')
      .select('id, title_en, sort_order, lectures(id, title_en, content_type, video_type, video_url, video_duration_seconds, is_preview, description_en, text_content, sort_order)')
      .eq('course_id', courseId)
      .order('sort_order');

    setSections(
      (secs ?? []).map((s: Omit<Section, 'open'>) => ({
        ...s,
        lectures: (s.lectures ?? []).sort((a: Lecture, b: Lecture) => a.sort_order - b.sort_order),
        open: true,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, [courseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Section CRUD ──────────────────────────────────
  const addSection = async () => {
    if (!newSectionTitle.trim()) return;
    const sort_order = sections.length;
    const { data, error } = await supabase.from('sections')
      .insert({ course_id: courseId, title_en: newSectionTitle.trim(), sort_order })
      .select('id, title_en, sort_order').single();
    if (error || !data) return;
    setSections(prev => [...prev, { ...data, lectures: [], open: true }]);
    setNewSectionTitle(''); setAddingSection(false);
  };

  const saveSection = async (sectionId: string) => {
    const title = editingSectionTitle.trim();
    if (!title) return;
    await supabase.from('sections').update({ title_en: title }).eq('id', sectionId);
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, title_en: title } : s));
    setEditingSectionId(null);
  };

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section and all its lectures?')) return;
    await supabase.from('sections').delete().eq('id', sectionId);
    setSections(prev => prev.filter(s => s.id !== sectionId));
  };

  const moveSectionBy = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[idx], next[target]] = [next[target], next[idx]];
    const updated = next.map((s, i) => ({ ...s, sort_order: i }));
    setSections(updated);
    await Promise.all(updated.map(s => supabase.from('sections').update({ sort_order: s.sort_order }).eq('id', s.id)));
  };

  // ── Lecture modal ─────────────────────────────────
  const openNewLecture = (sectionId: string) => {
    setLectureForm({ ...EMPTY_LECTURE_FORM });
    setLectureErr('');
    setLectureModal({ sectionId });
  };

  const openEditLecture = (sectionId: string, lecture: Lecture) => {
    setLectureForm({
      title_en: lecture.title_en,
      content_type: lecture.content_type,
      video_type: lecture.video_type ?? 'youtube',
      video_url: lecture.video_url ?? '',
      video_duration_seconds: lecture.video_duration_seconds > 0 ? String(lecture.video_duration_seconds) : '',
      is_preview: lecture.is_preview,
      description_en: lecture.description_en ?? '',
      text_content: lecture.text_content ?? '',
    });
    setLectureErr('');
    setLectureModal({ sectionId, lectureId: lecture.id });
  };

  const saveLecture = async () => {
    if (!lectureForm.title_en.trim()) { setLectureErr('Title is required'); return; }
    if (!lectureModal) return;
    setLectureSaving(true); setLectureErr('');

    const section = sections.find(s => s.id === lectureModal.sectionId);
    const payload = {
      title_en: lectureForm.title_en.trim(),
      content_type: lectureForm.content_type,
      video_type: lectureForm.content_type === 'video' ? lectureForm.video_type : null,
      video_url: lectureForm.content_type === 'video' && lectureForm.video_url.trim() ? lectureForm.video_url.trim() : null,
      video_duration_seconds: lectureForm.video_duration_seconds ? parseInt(lectureForm.video_duration_seconds as string) : 0,
      is_preview: lectureForm.is_preview,
      description_en: lectureForm.description_en.trim() || null,
      text_content: lectureForm.content_type === 'text' ? lectureForm.text_content.trim() || null : null,
    };

    if (lectureModal.lectureId) {
      await supabase.from('lectures').update(payload).eq('id', lectureModal.lectureId);
      setSections(prev => prev.map(s => s.id === lectureModal.sectionId ? {
        ...s,
        lectures: s.lectures.map(l => l.id === lectureModal.lectureId ? { ...l, ...payload } : l),
      } : s));
    } else {
      const sort_order = section?.lectures.length ?? 0;
      const { data } = await supabase.from('lectures')
        .insert({ ...payload, section_id: lectureModal.sectionId, course_id: courseId, sort_order })
        .select('id, sort_order').single();
      if (data) {
        setSections(prev => prev.map(s => s.id === lectureModal.sectionId ? {
          ...s,
          lectures: [...s.lectures, { ...payload, id: data.id, sort_order: data.sort_order } as Lecture],
        } : s));
      }
    }

    setLectureSaving(false);
    setLectureModal(null);
    // Update course totals
    const totalLectures = sections.reduce((acc, s) => acc + s.lectures.length, 0) + (lectureModal.lectureId ? 0 : 1);
    await supabase.from('courses').update({ total_lectures: totalLectures }).eq('id', courseId);
  };

  const deleteLecture = async (sectionId: string, lectureId: string) => {
    if (!confirm('Delete this lecture?')) return;
    await supabase.from('lectures').delete().eq('id', lectureId);
    setSections(prev => prev.map(s => s.id === sectionId
      ? { ...s, lectures: s.lectures.filter(l => l.id !== lectureId) } : s));
  };

  const moveLectureBy = async (sectionId: string, idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    const section = sections.find(s => s.id === sectionId);
    if (!section || target < 0 || target >= section.lectures.length) return;
    const next = [...section.lectures];
    [next[idx], next[target]] = [next[target], next[idx]];
    const updated = next.map((l, i) => ({ ...l, sort_order: i }));
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, lectures: updated } : s));
    await Promise.all(updated.map(l => supabase.from('lectures').update({ sort_order: l.sort_order }).eq('id', l.id)));
  };

  if (loading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>;
  }

  const setLF = (k: string, v: string | boolean) => setLectureForm(f => ({ ...f, [k]: v }));

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/instructor/courses/${courseId}/edit`} className="p-2 rounded-xl border border-white/[0.06] text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={15} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Curriculum</h1>
          <p className="text-zinc-500 text-sm truncate">{courseTitle}</p>
        </div>
        <Link href={`/instructor/courses/${courseId}/settings`} className="text-purple-400 text-sm hover:underline">Settings →</Link>
      </div>

      {/* Sections */}
      <div className="space-y-3 mb-4">
        {sections.map((section, sIdx) => (
          <div key={section.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            {/* Section header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <button onClick={() => setSections(prev => prev.map(s => s.id === section.id ? { ...s, open: !s.open } : s))}
                className="text-zinc-600 hover:text-white transition-colors">
                {section.open ? <Expand size={14} /> : <ChevronRight size={14} />}
              </button>

              {editingSectionId === section.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input autoFocus value={editingSectionTitle} onChange={e => setEditingSectionTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveSection(section.id); if (e.key === 'Escape') setEditingSectionId(null); }}
                    className="flex-1 px-3 py-1 bg-[#0b0915] border border-purple-500/40 rounded-lg text-white text-sm focus:outline-none" />
                  <button onClick={() => saveSection(section.id)} className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"><Check size={13} /></button>
                  <button onClick={() => setEditingSectionId(null)} className="p-1.5 rounded-lg text-zinc-600 hover:text-white transition-colors"><X size={13} /></button>
                </div>
              ) : (
                <span className="flex-1 text-white text-sm font-medium">{section.title_en}</span>
              )}

              <span className="text-zinc-600 text-xs shrink-0">{section.lectures.length} lectures</span>

              <div className="flex items-center gap-1 ml-2">
                <button onClick={() => moveSectionBy(sIdx, -1)} disabled={sIdx === 0} className="p-1 text-zinc-700 hover:text-zinc-400 disabled:opacity-30 transition-colors"><ChevronUp size={13} /></button>
                <button onClick={() => moveSectionBy(sIdx, 1)} disabled={sIdx === sections.length - 1} className="p-1 text-zinc-700 hover:text-zinc-400 disabled:opacity-30 transition-colors"><ChevronDown size={13} /></button>
                <button onClick={() => { setEditingSectionId(section.id); setEditingSectionTitle(section.title_en); }}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all"><Edit2 size={13} /></button>
                <button onClick={() => deleteSection(section.id)}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-900/20 transition-all"><Trash2 size={13} /></button>
              </div>
            </div>

            {/* Lectures */}
            {section.open && (
              <div>
                {section.lectures.map((lecture, lIdx) => (
                  <div key={lecture.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                    <div className="shrink-0 text-zinc-700">
                      {lecture.content_type === 'video' ? <Play size={13} /> : <FileText size={13} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-sm truncate block">{lecture.title_en}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {lecture.video_duration_seconds > 0 && <span className="text-zinc-600 text-xs">{fmtSec(lecture.video_duration_seconds)}</span>}
                        {lecture.is_preview && <span className="text-xs text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded">Preview</span>}
                        <span className="text-zinc-700 text-xs capitalize">{lecture.content_type}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => moveLectureBy(section.id, lIdx, -1)} disabled={lIdx === 0} className="p-1 text-zinc-700 hover:text-zinc-400 disabled:opacity-30"><ChevronUp size={12} /></button>
                      <button onClick={() => moveLectureBy(section.id, lIdx, 1)} disabled={lIdx === section.lectures.length - 1} className="p-1 text-zinc-700 hover:text-zinc-400 disabled:opacity-30"><ChevronDown size={12} /></button>
                      <button onClick={() => openEditLecture(section.id, lecture)} className="p-1.5 rounded-lg text-zinc-600 hover:text-purple-400 hover:bg-purple-900/20 transition-all"><Edit2 size={12} /></button>
                      <button onClick={() => deleteLecture(section.id, lecture.id)} className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-900/20 transition-all"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
                <button onClick={() => openNewLecture(section.id)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-zinc-600 hover:text-purple-400 hover:bg-purple-500/5 text-sm transition-all">
                  <Plus size={13} /> Add Lecture
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add section */}
      {addingSection ? (
        <div className="flex gap-2 mb-6">
          <input autoFocus value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') { setAddingSection(false); setNewSectionTitle(''); } }}
            placeholder="Section title…"
            className="flex-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
          <button onClick={addSection} className="px-4 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors">Add</button>
          <button onClick={() => { setAddingSection(false); setNewSectionTitle(''); }} className="px-3 py-2.5 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white transition-colors"><X size={14} /></button>
        </div>
      ) : (
        <button onClick={() => setAddingSection(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/[0.12] text-zinc-500 hover:text-white hover:border-white/25 text-sm transition-all mb-6">
          <Plus size={14} /> Add Section
        </button>
      )}

      {/* Lecture Modal */}
      {lectureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setLectureModal(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-[#0f0c1e] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 className="text-white font-semibold">{lectureModal.lectureId ? 'Edit Lecture' : 'Add Lecture'}</h2>
              <button onClick={() => setLectureModal(null)} className="text-zinc-600 hover:text-white transition-colors"><X size={16} /></button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-white text-sm font-medium mb-1.5">Title <span className="text-red-400">*</span></label>
                <input value={lectureForm.title_en} onChange={e => setLF('title_en', e.target.value)}
                  placeholder="Lecture title"
                  className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-1.5">Content Type</label>
                <div className="flex gap-2">
                  {['video', 'text'].map(t => (
                    <button key={t} onClick={() => setLF('content_type', t)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border capitalize transition-all ${
                        lectureForm.content_type === t
                          ? 'bg-purple-500/20 border-purple-500/40 text-white'
                          : 'border-white/[0.08] text-zinc-500 hover:text-zinc-300'
                      }`}>{t}</button>
                  ))}
                </div>
              </div>

              {lectureForm.content_type === 'video' && (
                <>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-white text-sm font-medium mb-1.5">Video URL / ID</label>
                      <input value={lectureForm.video_url} onChange={e => setLF('video_url', e.target.value)}
                        placeholder="https://… or video ID"
                        className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
                    </div>
                    <div className="w-32">
                      <label className="block text-white text-sm font-medium mb-1.5">Platform</label>
                      <select value={lectureForm.video_type} onChange={e => setLF('video_type', e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40">
                        <option value="youtube">YouTube</option>
                        <option value="vimeo">Vimeo</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-1.5">Duration (seconds)</label>
                    <input type="number" min="0" value={lectureForm.video_duration_seconds}
                      onChange={e => setLF('video_duration_seconds', e.target.value)}
                      placeholder="e.g. 720 for 12 minutes"
                      className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
                  </div>
                </>
              )}

              {lectureForm.content_type === 'text' && (
                <div>
                  <label className="block text-white text-sm font-medium mb-1.5">Article Content</label>
                  <textarea value={lectureForm.text_content} onChange={e => setLF('text_content', e.target.value)}
                    rows={6} placeholder="Markdown or plain text content…"
                    className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600 resize-none" />
                </div>
              )}

              <div>
                <label className="block text-white text-sm font-medium mb-1.5">Description <span className="text-zinc-600 font-normal">optional</span></label>
                <textarea value={lectureForm.description_en} onChange={e => setLF('description_en', e.target.value)}
                  rows={2} placeholder="Short description shown below the player"
                  className="w-full px-4 py-2.5 bg-[#0b0915] border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600 resize-none" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={lectureForm.is_preview} onChange={e => setLF('is_preview', e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-[#0b0915] accent-purple-500" />
                <div>
                  <p className="text-white text-sm font-medium">Free Preview</p>
                  <p className="text-zinc-600 text-xs">Non-enrolled visitors can watch this lecture</p>
                </div>
              </label>

              {lectureErr && <p className="text-red-400 text-sm">{lectureErr}</p>}
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button onClick={saveLecture} disabled={lectureSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors">
                <Save size={14} /> {lectureSaving ? 'Saving…' : lectureModal.lectureId ? 'Save Changes' : 'Add Lecture'}
              </button>
              <button onClick={() => setLectureModal(null)} className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
