'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, Plus, Trash2, Edit2, Check, X,
  Play, FileText, Save, ChevronRight, ChevronDown,
  GripVertical, Upload, FileDown, Paperclip,
} from 'lucide-react';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

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
  material_url: string | null;
  material_filename: string | null;
  sort_order: number;
}

interface Section {
  id: string;
  title_en: string;
  sort_order: number;
  lectures: Lecture[];
  open: boolean;
}

const EMPTY_FORM = {
  title_en: '',
  content_type: 'video',
  video_type: 'youtube',
  video_url: '',
  video_duration_minutes: '',
  is_preview: false,
  description_en: '',
  text_content: '',
  material_url: '',
  material_filename: '',
};

function fmtMin(s: number) {
  const m = Math.round(s / 60);
  return m === 1 ? '1 min' : `${m} min`;
}

export default function CurriculumPage() {
  const { id: courseId } = useParams() as { id: string };
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseTitle, setCourseTitle] = useState('');

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  const [lectureModal, setLectureModal] = useState<{ sectionId: string; lectureId?: string } | null>(null);
  const [lectureForm, setLectureForm] = useState({ ...EMPTY_FORM });
  const [lectureSaving, setLectureSaving] = useState(false);
  const [lectureErr, setLectureErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const setLF = (k: string, v: string | boolean) => setLectureForm(f => ({ ...f, [k]: v }));
  const notify = () => window.dispatchEvent(new CustomEvent('curriculum-changed'));

  const load = async () => {
    const { data: course } = await supabase.from('courses').select('title_en').eq('id', courseId).single();
    setCourseTitle(course?.title_en ?? '');
    const { data: secs } = await supabase
      .from('sections')
      .select('id, title_en, sort_order, lectures(id, title_en, content_type, video_type, video_url, video_duration_seconds, is_preview, description_en, text_content, material_url, material_filename, sort_order)')
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

  useEffect(() => { load(); }, [courseId]); // eslint-disable-line

  // ── Section CRUD ───────────────────────────────────────────────────────
  const addSection = async () => {
    if (!newSectionTitle.trim()) return;
    const { data, error } = await supabase.from('sections')
      .insert({ course_id: courseId, title_en: newSectionTitle.trim(), sort_order: sections.length })
      .select('id, title_en, sort_order').single();
    if (error || !data) return;
    setSections(prev => [...prev, { ...data, lectures: [], open: true }]);
    setNewSectionTitle(''); setAddingSection(false); notify();
  };

  const saveSection = async (sectionId: string) => {
    const title = editingSectionTitle.trim();
    if (!title) return;
    await supabase.from('sections').update({ title_en: title }).eq('id', sectionId);
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, title_en: title } : s));
    setEditingSectionId(null); notify();
  };

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section and all its lectures?')) return;
    await supabase.from('sections').delete().eq('id', sectionId);
    setSections(prev => prev.filter(s => s.id !== sectionId)); notify();
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────
  const onDragEnd = async (result: DropResult) => {
    const { source: src, destination: dst, type } = result;
    if (!dst || (src.droppableId === dst.droppableId && src.index === dst.index)) return;

    if (type === 'section') {
      const next = [...sections];
      const [moved] = next.splice(src.index, 1);
      next.splice(dst.index, 0, moved);
      const updated = next.map((s, i) => ({ ...s, sort_order: i }));
      setSections(updated);
      await Promise.all(updated.map(s => supabase.from('sections').update({ sort_order: s.sort_order }).eq('id', s.id)));
      notify();
      return;
    }

    // Lecture drag
    const srcSec = sections.find(s => s.id === src.droppableId)!;
    const dstSec = sections.find(s => s.id === dst.droppableId)!;
    const srcList = [...srcSec.lectures];
    const [moved] = srcList.splice(src.index, 1);

    if (src.droppableId === dst.droppableId) {
      srcList.splice(dst.index, 0, moved);
      const updated = srcList.map((l, i) => ({ ...l, sort_order: i }));
      setSections(prev => prev.map(s => s.id === src.droppableId ? { ...s, lectures: updated } : s));
      await Promise.all(updated.map(l => supabase.from('lectures').update({ sort_order: l.sort_order }).eq('id', l.id)));
    } else {
      const dstList = [...dstSec.lectures];
      dstList.splice(dst.index, 0, moved);
      const updSrc = srcList.map((l, i) => ({ ...l, sort_order: i }));
      const updDst = dstList.map((l, i) => ({ ...l, sort_order: i }));
      setSections(prev => prev.map(s => {
        if (s.id === src.droppableId) return { ...s, lectures: updSrc };
        if (s.id === dst.droppableId) return { ...s, lectures: updDst };
        return s;
      }));
      await Promise.all([
        supabase.from('lectures').update({ section_id: dst.droppableId, sort_order: dst.index }).eq('id', moved.id),
        ...updSrc.map(l => supabase.from('lectures').update({ sort_order: l.sort_order }).eq('id', l.id)),
        ...updDst.filter(l => l.id !== moved.id).map(l => supabase.from('lectures').update({ sort_order: l.sort_order }).eq('id', l.id)),
      ]);
    }
    notify();
  };

  // ── Lecture modal ──────────────────────────────────────────────────────
  const openNew = (sectionId: string) => {
    setLectureForm({ ...EMPTY_FORM }); setLectureErr('');
    setLectureModal({ sectionId });
  };

  const openEdit = (sectionId: string, lecture: Lecture) => {
    setLectureForm({
      title_en: lecture.title_en,
      content_type: lecture.content_type,
      video_type: lecture.video_type ?? 'youtube',
      video_url: lecture.video_url ?? '',
      video_duration_minutes: lecture.video_duration_seconds > 0 ? String(Math.round(lecture.video_duration_seconds / 60)) : '',
      is_preview: lecture.is_preview,
      description_en: lecture.description_en ?? '',
      text_content: lecture.text_content ?? '',
      material_url: lecture.material_url ?? '',
      material_filename: lecture.material_filename ?? '',
    });
    setLectureErr('');
    setLectureModal({ sectionId, lectureId: lecture.id });
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${courseId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('lecture-materials').upload(path, file, { contentType: file.type });
    if (error) { setLectureErr(error.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('lecture-materials').getPublicUrl(path);
    setLF('material_url', publicUrl);
    setLF('material_filename', file.name);
    setUploading(false);
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
      video_url: lectureForm.content_type === 'video' && (lectureForm.video_url as string).trim() ? (lectureForm.video_url as string).trim() : null,
      video_duration_seconds: lectureForm.video_duration_minutes ? Math.round(parseFloat(lectureForm.video_duration_minutes as string) * 60) : 0,
      is_preview: lectureForm.is_preview,
      description_en: (lectureForm.description_en as string).trim() || null,
      text_content: lectureForm.content_type === 'text' ? (lectureForm.text_content as string).trim() || null : null,
      material_url: lectureForm.content_type === 'material' ? (lectureForm.material_url as string) || null : null,
      material_filename: lectureForm.content_type === 'material' ? (lectureForm.material_filename as string) || null : null,
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
          ...s, lectures: [...s.lectures, { ...payload, id: data.id, sort_order: data.sort_order } as Lecture],
        } : s));
      }
    }

    setLectureSaving(false);
    setLectureModal(null);
    notify();
    const total = sections.reduce((a, s) => a + s.lectures.length, 0) + (lectureModal.lectureId ? 0 : 1);
    await supabase.from('courses').update({ total_lectures: total }).eq('id', courseId);
  };

  const deleteLecture = async (sectionId: string, lectureId: string) => {
    if (!confirm('Delete this lecture?')) return;
    await supabase.from('lectures').delete().eq('id', lectureId);
    setSections(prev => prev.map(s => s.id === sectionId
      ? { ...s, lectures: s.lectures.filter(l => l.id !== lectureId) } : s));
    notify();
  };

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />)}
    </div>
  );

  const ctIcon = (ct: string) =>
    ct === 'video' ? <Play size={11} /> : ct === 'material' ? <Paperclip size={11} /> : <FileText size={11} />;

  // ── Split-panel layout ───────────────────────────────────────────────────
  return (
    <div className="flex -m-8 h-[calc(100vh-3.5rem)] overflow-hidden">

      {/* ── LEFT PANEL: course nav + drag-and-drop curriculum ─────────────── */}
      <div className="w-80 shrink-0 flex flex-col border-r border-white/[0.06] bg-zinc-950 overflow-hidden">

        {/* Top: course title + links */}
        <div className="px-4 py-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <Link href={`/instructor/courses/${courseId}/edit`}
              className="p-1.5 rounded-lg border border-white/[0.06] text-zinc-500 hover:text-white transition-colors shrink-0">
              <ArrowLeft size={13} />
            </Link>
            <p className="text-white text-sm font-semibold truncate flex-1">{courseTitle}</p>
          </div>
          <div className="flex gap-2">
            <Link href={`/instructor/courses/${courseId}/edit`}
              className="flex-1 text-center py-1.5 rounded-lg text-xs text-zinc-500 hover:text-white border border-white/[0.06] hover:border-white/20 transition-all">
              Course Info
            </Link>
            <Link href={`/instructor/courses/${courseId}/settings`}
              className="flex-1 text-center py-1.5 rounded-lg text-xs text-zinc-500 hover:text-white border border-white/[0.06] hover:border-white/20 transition-all">
              Settings
            </Link>
          </div>
        </div>

        {/* Scrollable sections + lectures */}
        <div className="flex-1 overflow-y-auto py-2">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sections" type="section">
              {(prov) => (
                <div {...prov.droppableProps} ref={prov.innerRef} className="space-y-1 px-2">
                  {sections.map((section, sIdx) => (
                    <Draggable key={section.id} draggableId={section.id} index={sIdx}>
                      {(drag, dragSnap) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className={`rounded-xl border overflow-hidden transition-shadow ${
                            dragSnap.isDragging
                              ? 'border-purple-500/30 shadow-lg shadow-purple-500/10 bg-zinc-900'
                              : 'border-white/[0.06] bg-white/[0.02]'
                          }`}
                        >
                          {/* Section header */}
                          <div className="flex items-center gap-1.5 px-2 py-2 border-b border-white/[0.04]">
                            <div {...(drag.dragHandleProps ?? {})} className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing p-0.5 shrink-0">
                              <GripVertical size={12} />
                            </div>
                            <button
                              onClick={() => setSections(p => p.map(s => s.id === section.id ? { ...s, open: !s.open } : s))}
                              className="text-zinc-600 hover:text-white transition-colors shrink-0">
                              {section.open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>

                            {editingSectionId === section.id ? (
                              <div className="flex-1 flex items-center gap-1">
                                <input
                                  autoFocus value={editingSectionTitle}
                                  onChange={e => setEditingSectionTitle(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveSection(section.id); if (e.key === 'Escape') setEditingSectionId(null); }}
                                  className="flex-1 px-2 py-0.5 bg-zinc-900 border border-purple-500/40 rounded-lg text-white text-xs focus:outline-none" />
                                <button onClick={() => saveSection(section.id)} className="p-1 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 shrink-0"><Check size={11} /></button>
                                <button onClick={() => setEditingSectionId(null)} className="p-1 text-zinc-600 hover:text-white shrink-0"><X size={11} /></button>
                              </div>
                            ) : (
                              <span className="flex-1 text-white text-xs font-medium truncate">{section.title_en}</span>
                            )}

                            <div className="flex gap-0.5 shrink-0">
                              <button
                                onClick={() => { setEditingSectionId(section.id); setEditingSectionTitle(section.title_en); }}
                                className="p-1 rounded text-zinc-700 hover:text-white hover:bg-white/[0.06] transition-all">
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => deleteSection(section.id)}
                                className="p-1 rounded text-zinc-700 hover:text-red-400 hover:bg-red-900/20 transition-all">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>

                          {/* Lectures */}
                          {section.open && (
                            <Droppable droppableId={section.id} type="lecture">
                              {(lProv, lSnap) => (
                                <div
                                  {...lProv.droppableProps}
                                  ref={lProv.innerRef}
                                  className={`min-h-[4px] transition-colors ${lSnap.isDraggingOver ? 'bg-purple-500/5' : ''}`}
                                >
                                  {section.lectures.map((lecture, lIdx) => {
                                    const isActive = lectureModal?.lectureId === lecture.id;
                                    return (
                                      <Draggable key={lecture.id} draggableId={lecture.id} index={lIdx}>
                                        {(lDrag, lDragSnap) => (
                                          <div
                                            ref={lDrag.innerRef}
                                            {...lDrag.draggableProps}
                                            className={`flex items-center gap-2 px-2 py-1.5 border-b border-white/[0.03] transition-colors group ${
                                              lDragSnap.isDragging
                                                ? 'bg-zinc-900 rounded-lg shadow-md'
                                                : isActive
                                                  ? 'bg-purple-500/10'
                                                  : 'hover:bg-white/[0.03]'
                                            }`}
                                          >
                                            <div {...(lDrag.dragHandleProps ?? {})} className="text-zinc-700 hover:text-zinc-500 cursor-grab active:cursor-grabbing shrink-0">
                                              <GripVertical size={11} />
                                            </div>
                                            <span className={`shrink-0 ${isActive ? 'text-purple-400' : 'text-zinc-600'}`}>{ctIcon(lecture.content_type)}</span>
                                            <button
                                              onClick={() => openEdit(section.id, lecture)}
                                              className="flex-1 min-w-0 text-left">
                                              <span className={`text-xs truncate block ${isActive ? 'text-purple-300' : 'text-zinc-300 group-hover:text-white'} transition-colors`}>
                                                {lecture.title_en}
                                              </span>
                                              {lecture.video_duration_seconds > 0 && (
                                                <span className="text-zinc-600 text-[10px]">{fmtMin(lecture.video_duration_seconds)}</span>
                                              )}
                                            </button>
                                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                              <button
                                                onClick={() => deleteLecture(section.id, lecture.id)}
                                                className="p-1 rounded text-zinc-700 hover:text-red-400 hover:bg-red-900/20 transition-all">
                                                <Trash2 size={10} />
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    );
                                  })}
                                  {lProv.placeholder}
                                  <button
                                    onClick={() => openNew(section.id)}
                                    className="flex items-center gap-1.5 w-full px-3 py-2 text-zinc-600 hover:text-purple-400 hover:bg-purple-500/5 text-xs transition-all">
                                    <Plus size={11} /> Add Lecture
                                  </button>
                                </div>
                              )}
                            </Droppable>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {prov.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Add section */}
        <div className="px-3 py-3 border-t border-white/[0.06] shrink-0">
          {addingSection ? (
            <div className="flex gap-1.5">
              <input
                autoFocus value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') { setAddingSection(false); setNewSectionTitle(''); } }}
                placeholder="Section title…"
                className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-xs focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
              <button onClick={addSection} className="px-3 py-2 rounded-xl bg-purple-500 text-white text-xs font-medium hover:bg-purple-600 transition-colors">Add</button>
              <button onClick={() => { setAddingSection(false); setNewSectionTitle(''); }} className="px-2 py-2 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white transition-colors"><X size={12} /></button>
            </div>
          ) : (
            <button
              onClick={() => setAddingSection(true)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl border border-dashed border-white/[0.10] text-zinc-500 hover:text-white hover:border-white/25 text-xs transition-all">
              <Plus size={12} /> Add Section
            </button>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: lecture form ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {!lectureModal ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Play size={22} className="text-zinc-600" />
            </div>
            <div>
              <p className="text-zinc-400 font-medium mb-1">No lecture selected</p>
              <p className="text-zinc-600 text-sm">Click a lecture to edit it, or press<br />"Add Lecture" in any section.</p>
            </div>
          </div>
        ) : (
          /* Lecture form */
          <div className="max-w-2xl mx-auto px-8 py-8">
            {/* Form header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-lg font-semibold">
                {lectureModal.lectureId ? 'Edit Lecture' : 'Add Lecture'}
              </h2>
              <button onClick={() => setLectureModal(null)} className="p-2 rounded-xl text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-white text-sm font-medium mb-1.5">Title <span className="text-red-400">*</span></label>
                <input
                  value={lectureForm.title_en as string}
                  onChange={e => setLF('title_en', e.target.value)}
                  placeholder="Lecture title"
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
              </div>

              {/* Content type */}
              <div>
                <label className="block text-white text-sm font-medium mb-1.5">Content Type</label>
                <div className="flex gap-2">
                  {[
                    { value: 'video',    label: 'Video',    Icon: Play },
                    { value: 'text',     label: 'Article',  Icon: FileText },
                    { value: 'material', label: 'Material', Icon: Paperclip },
                  ].map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      onClick={() => setLF('content_type', value)}
                      className={`flex items-center gap-2 flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                        lectureForm.content_type === value
                          ? 'bg-purple-500/20 border-purple-500/40 text-white'
                          : 'border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:border-white/20'
                      }`}>
                      <Icon size={13} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Video fields */}
              {lectureForm.content_type === 'video' && (
                <>
                  <div>
                    <label className="block text-white text-sm font-medium mb-1.5">Video URL / ID</label>
                    <input
                      value={lectureForm.video_url as string}
                      onChange={e => setLF('video_url', e.target.value)}
                      placeholder="https://… or video ID"
                      className="w-full px-4 py-2.5 bg-zinc-900 border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white text-sm font-medium mb-1.5">Platform</label>
                      <select
                        value={lectureForm.video_type as string}
                        onChange={e => setLF('video_type', e.target.value)}
                        className="w-full px-3 py-2.5 bg-zinc-900 border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40">
                        <option value="youtube">YouTube</option>
                        <option value="vimeo">Vimeo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-1.5">Duration (min)</label>
                      <input
                        type="number" min="0" step="0.5"
                        value={lectureForm.video_duration_minutes as string}
                        onChange={e => setLF('video_duration_minutes', e.target.value)}
                        placeholder="e.g. 12"
                        className="w-full px-4 py-2.5 bg-zinc-900 border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
                    </div>
                  </div>
                </>
              )}

              {/* Material upload */}
              {lectureForm.content_type === 'material' && (
                <div>
                  <label className="block text-white text-sm font-medium mb-1.5">File</label>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
                  {lectureForm.material_filename ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-green-500/20 rounded-xl">
                      <FileDown size={16} className="text-green-400 shrink-0" />
                      <span className="text-white text-sm flex-1 truncate">{lectureForm.material_filename as string}</span>
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="text-zinc-500 hover:text-white text-xs transition-colors shrink-0">
                        Replace
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex flex-col items-center gap-3 px-4 py-8 bg-zinc-900 border-2 border-dashed border-white/[0.10] rounded-xl text-zinc-500 hover:text-white hover:border-white/25 transition-all disabled:opacity-50">
                      <Upload size={22} />
                      <span className="text-sm">{uploading ? 'Uploading…' : 'Click to upload PDF, image, or document'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Article content */}
              {lectureForm.content_type === 'text' && (
                <div>
                  <label className="block text-white text-sm font-medium mb-1.5">Article Content</label>
                  <RichTextEditor
                    value={lectureForm.text_content as string}
                    onChange={v => setLF('text_content', v)}
                    placeholder="Write lecture content…"
                    minHeight="260px" />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-white text-sm font-medium mb-1.5">
                  Description <span className="text-zinc-600 font-normal">optional</span>
                </label>
                <RichTextEditor
                  value={lectureForm.description_en as string}
                  onChange={v => setLF('description_en', v)}
                  placeholder="Description shown below the player…"
                  minHeight={lectureForm.content_type === 'text' ? '120px' : '200px'} />
              </div>

              {/* Free Preview */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lectureForm.is_preview as boolean}
                  onChange={e => setLF('is_preview', e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-zinc-900 accent-purple-500" />
                <div>
                  <p className="text-white text-sm font-medium">Free Preview</p>
                  <p className="text-zinc-600 text-xs">Non-enrolled visitors can watch this lecture</p>
                </div>
              </label>

              {lectureErr && <p className="text-red-400 text-sm">{lectureErr}</p>}

              {/* Actions */}
              <div className="flex gap-3 pt-2 pb-8">
                <button
                  onClick={saveLecture}
                  disabled={lectureSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors">
                  <Save size={14} />
                  {lectureSaving ? 'Saving…' : lectureModal.lectureId ? 'Save Changes' : 'Add Lecture'}
                </button>
                <button
                  onClick={() => setLectureModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
