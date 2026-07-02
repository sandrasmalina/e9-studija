'use client';

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Eye, Play, FileText, Save, X, Upload, FileDown, Paperclip } from 'lucide-react';

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
}

interface LectureResource {
  id?: string;
  title: string;
  file_url: string;
  file_type: string | null;
  file_size_bytes: number | null;
  sort_order: number;
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

export default function CurriculumPage() {
  const { id: courseId } = useParams() as { id: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sections, setSections] = useState<Section[]>([]);
  const [courseSlug, setCourseSlug] = useState('');
  const [loading, setLoading] = useState(true);

  const [lectureModal, setLectureModal] = useState<{ sectionId: string; lectureId?: string } | null>(null);
  const [lectureForm, setLectureForm] = useState({ ...EMPTY_FORM });
  const [lectureSaving, setLectureSaving] = useState(false);
  const [lectureErr, setLectureErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [resources, setResources] = useState<LectureResource[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const resourceFileRef = useRef<HTMLInputElement>(null);

  const setLF = (k: string, v: string | boolean) => setLectureForm(f => ({ ...f, [k]: v }));
  const notify = () => window.dispatchEvent(new CustomEvent('curriculum-changed'));

  const load = async () => {
    const [{ data: secs }, { data: course }] = await Promise.all([
      supabase
        .from('sections')
        .select('id, title_en, sort_order, lectures(id, title_en, content_type, video_type, video_url, video_duration_seconds, is_preview, description_en, text_content, material_url, material_filename, sort_order)')
        .eq('course_id', courseId)
        .order('sort_order'),
      supabase.from('courses').select('slug').eq('id', courseId).single(),
    ]);
    setCourseSlug(course?.slug ?? '');
    setSections(
      (secs ?? []).map((s: Section) => ({
        ...s,
        lectures: (s.lectures ?? []).sort((a: Lecture, b: Lecture) => a.sort_order - b.sort_order),
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, [courseId]); // eslint-disable-line

  // Open form when sidebar navigates here with URL params
  useEffect(() => {
    const sectionId = searchParams.get('section');
    const lectureId = searchParams.get('lecture');
    const isNew     = searchParams.get('new') === '1';
    if (!sectionId) return;
    if (isNew) {
      setLectureForm({ ...EMPTY_FORM }); setLectureErr('');
      setLectureModal({ sectionId }); return;
    }
    if (lectureId && sections.length > 0) {
      const lecture = sections.flatMap(s => s.lectures).find(l => l.id === lectureId);
      if (lecture) {
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
        loadResources(lecture.id);
        setLectureModal({ sectionId, lectureId });
      }
    }
  }, [searchParams, sections]); // eslint-disable-line

  // ── Lecture modal ──────────────────────────────────────────────────────
  const loadResources = async (lectureId: string) => {
    const { data } = await supabase
      .from('lecture_resources')
      .select('id, title, file_url, file_type, file_size_bytes, sort_order')
      .eq('lecture_id', lectureId)
      .order('sort_order');
    setResources((data ?? []) as LectureResource[]);
  };

  const openNew = (sectionId: string) => {
    setLectureForm({ ...EMPTY_FORM }); setLectureErr('');
    setResources([]);
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
    loadResources(lecture.id);
    setLectureModal({ sectionId, lectureId: lecture.id });
  };

  const openLecturePreview = (lectureId: string) => {
    if (!courseSlug) return;
    window.open(`/learn/${courseSlug}/${lectureId}?preview=1`, '_blank', 'noopener,noreferrer');
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

  const uploadResourceFiles = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setLectureErr('');
    try {
      let nextSortOrder = resources.length;
      for (const file of selectedFiles) {
        const ext = file.name.split('.').pop() || 'file';
        const path = `${courseId}/resources/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('lecture-materials').upload(path, file, { contentType: file.type || undefined });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('lecture-materials').getPublicUrl(path);
        const nextResource: LectureResource = {
          title: file.name,
          file_url: publicUrl,
          file_type: ext.toLowerCase(),
          file_size_bytes: file.size,
          sort_order: nextSortOrder,
        };
        nextSortOrder += 1;
        if (lectureModal?.lectureId) {
          const { data, error: insertError } = await supabase
            .from('lecture_resources')
            .insert({ ...nextResource, lecture_id: lectureModal.lectureId })
            .select('id, title, file_url, file_type, file_size_bytes, sort_order')
            .single();
          if (insertError) throw insertError;
          setResources(current => [...current, data as LectureResource]);
        } else {
          setResources(current => [...current, { ...nextResource, sort_order: current.length }]);
        }
      }
    } catch (error) {
      setLectureErr(error instanceof Error ? error.message : 'File upload failed.');
    } finally {
      setUploading(false);
      if (resourceFileRef.current) resourceFileRef.current.value = '';
    }
  };

  const removeResource = async (resource: LectureResource) => {
    if (resource.id) {
      const { error } = await supabase.from('lecture_resources').delete().eq('id', resource.id);
      if (error) { setLectureErr(error.message); return; }
      setResources(current => current.filter(item => item.id !== resource.id));
      return;
    }
    setResources(current => current.filter(item => item !== resource));
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
      const { data, error } = await supabase.from('lectures')
        .update(payload)
        .eq('id', lectureModal.lectureId)
        .select('id, title_en, content_type, video_type, video_url, video_duration_seconds, is_preview, description_en, text_content, material_url, material_filename, sort_order')
        .single();
      if (error || !data) {
        setLectureSaving(false);
        setLectureErr(error?.message || 'Lecture was not saved. Please try again.');
        return;
      }
      setSections(prev => prev.map(s => s.id === lectureModal.sectionId ? {
        ...s,
        lectures: s.lectures.map(l => l.id === lectureModal.lectureId ? data as Lecture : l),
      } : s));
    } else {
      const sort_order = section?.lectures.length ?? 0;
      const { data, error } = await supabase.from('lectures')
        .insert({ ...payload, section_id: lectureModal.sectionId, course_id: courseId, sort_order })
        .select('id, title_en, content_type, video_type, video_url, video_duration_seconds, is_preview, description_en, text_content, material_url, material_filename, sort_order').single();
      if (error || !data) {
        setLectureSaving(false);
        setLectureErr(error?.message || 'Lecture was not created. Please try again.');
        return;
      }
      if (data) {
        if (resources.length > 0) {
          await supabase.from('lecture_resources').insert(resources.map((resource, index) => ({
            lecture_id: data.id,
            title: resource.title,
            file_url: resource.file_url,
            file_type: resource.file_type,
            file_size_bytes: resource.file_size_bytes,
            sort_order: index,
          })));
        }
        setSections(prev => prev.map(s => s.id === lectureModal.sectionId ? {
          ...s, lectures: [...s.lectures, data as Lecture],
        } : s));
      }
    }

    setLectureSaving(false);
    setLectureModal(null);
    router.replace(`/instructor/courses/${courseId}/curriculum`);
    notify();
    const total = sections.reduce((a, s) => a + s.lectures.length, 0) + (lectureModal.lectureId ? 0 : 1);
    await supabase.from('courses').update({ total_lectures: total }).eq('id', courseId);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="w-full max-w-[1180px]">
      {!lectureModal ? (
        <div className="flex flex-col items-center justify-center min-h-96 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <Play size={22} className="text-zinc-600" />
          </div>
          <div>
            <p className="text-zinc-400 font-medium mb-1">No lecture selected</p>
            <p className="text-zinc-600 text-sm">Select a lecture from the sidebar,<br />or press “Add Lecture” to create a new one.</p>
          </div>
        </div>
      ) : (
        <div className="pb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-lg font-semibold">
              {lectureModal.lectureId ? 'Edit Lecture' : 'Add Lecture'}
            </h2>
            <div className="flex items-center gap-2">
              {lectureModal.lectureId && courseSlug && (
                <button
                  type="button"
                  onClick={() => openLecturePreview(lectureModal.lectureId!)}
                  className="flex items-center gap-2 rounded-xl border border-purple-500/30 px-3 py-2 text-xs font-medium text-purple-300 transition-colors hover:bg-purple-500/10">
                  <Eye size={14} /> Preview as student
                </button>
              )}
              <button
                onClick={() => { setLectureModal(null); router.replace(`/instructor/courses/${courseId}/curriculum`); }}
                className="p-2 rounded-xl text-zinc-600 hover:text-white hover:bg-white/[0.06] transition-all">
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-white text-sm font-medium mb-1.5">Title <span className="text-red-400">*</span></label>
              <input value={lectureForm.title_en as string} onChange={e => setLF('title_en', e.target.value)}
                placeholder="Lecture title"
                className="w-full px-4 py-2.5 bg-zinc-900 border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-1.5">Content Type</label>
              <div className="flex gap-2">
                {([['video','Video',Play],['text','Article',FileText],['material','Material',Paperclip]] as const).map(([value, label, Icon]) => (
                  <button key={value} onClick={() => setLF('content_type', value)}
                    className={`flex items-center gap-2 flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                      lectureForm.content_type === value
                        ? 'bg-purple-500/20 border-purple-500/40 text-white'
                        : 'border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:border-white/20'
                    }`}>
                    <Icon size={13} />{label}
                  </button>
                ))}
              </div>
            </div>

            {lectureForm.content_type === 'video' && (
              <>
                <div>
                  <label className="block text-white text-sm font-medium mb-1.5">Video URL / ID</label>
                  <input value={lectureForm.video_url as string} onChange={e => setLF('video_url', e.target.value)}
                    placeholder="https://… or video ID"
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white text-sm font-medium mb-1.5">Platform</label>
                    <select value={lectureForm.video_type as string} onChange={e => setLF('video_type', e.target.value)}
                      className="w-full px-3 py-2.5 bg-zinc-900 border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40">
                      <option value="youtube">YouTube</option>
                      <option value="vimeo">Vimeo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white text-sm font-medium mb-1.5">Duration (min)</label>
                    <input type="number" min="0" step="0.5" value={lectureForm.video_duration_minutes as string}
                      onChange={e => setLF('video_duration_minutes', e.target.value)} placeholder="e.g. 12"
                      className="w-full px-4 py-2.5 bg-zinc-900 border border-white/[0.08] rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/40 placeholder-zinc-600" />
                  </div>
                </div>
              </>
            )}

            {lectureForm.content_type === 'material' && (
              <div>
                <label className="block text-white text-sm font-medium mb-1.5">Main File</label>
                <input ref={fileRef} type="file" className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} />
                {lectureForm.material_filename ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-green-500/20 rounded-xl">
                    <FileDown size={16} className="text-green-400 shrink-0" />
                    <span className="text-white text-sm flex-1 truncate">{lectureForm.material_filename as string}</span>
                    <button onClick={() => fileRef.current?.click()} className="text-zinc-500 hover:text-white text-xs shrink-0">Replace</button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="w-full flex flex-col items-center gap-3 px-4 py-8 bg-zinc-900 border-2 border-dashed border-white/[0.10] rounded-xl text-zinc-500 hover:text-white hover:border-white/25 transition-all disabled:opacity-50">
                    <Upload size={22} />
                    <span className="text-sm">{uploading ? 'Uploading…' : 'Click to upload PDF, image, or document'}</span>
                  </button>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <label className="block text-white text-sm font-medium">Lecture Materials</label>
                <button type="button" onClick={() => resourceFileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:text-white disabled:opacity-50">
                  <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload files'}
                </button>
              </div>
              <p className="mb-2 text-xs text-zinc-600">Attach one or several PDFs, images, documents, slides, spreadsheets, or zip files.</p>
              <input ref={resourceFileRef} type="file" multiple className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                onChange={e => { if (e.target.files) uploadResourceFiles(e.target.files); }} />
              {resources.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/[0.10] bg-zinc-900 px-4 py-5 text-center text-sm text-zinc-600">
                  No extra lecture materials uploaded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {resources.map(resource => (
                    <div key={resource.id ?? resource.file_url} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-zinc-900 px-4 py-3">
                      <FileDown size={15} className="shrink-0 text-purple-400" />
                      <a href={resource.file_url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm text-white hover:text-purple-300">{resource.title}</a>
                      {resource.file_size_bytes && <span className="shrink-0 text-xs text-zinc-600">{Math.round(resource.file_size_bytes / 1024)} KB</span>}
                      <button type="button" onClick={() => removeResource(resource)} className="shrink-0 text-xs text-zinc-500 hover:text-red-300">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {lectureForm.content_type === 'text' && (
              <div>
                <label className="block text-white text-sm font-medium mb-1.5">Article Content</label>
                <RichTextEditor value={lectureForm.text_content as string} onChange={v => setLF('text_content', v)}
                  placeholder="Write lecture content…" minHeight="260px" />
              </div>
            )}

            <div>
              <label className="block text-white text-sm font-medium mb-1.5">
                Description <span className="text-zinc-600 font-normal">optional</span>
              </label>
              <RichTextEditor value={lectureForm.description_en as string} onChange={v => setLF('description_en', v)}
                placeholder="Description shown below the player…"
                minHeight={lectureForm.content_type === 'text' ? '120px' : '200px'} />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={lectureForm.is_preview as boolean}
                onChange={e => setLF('is_preview', e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-zinc-900 accent-purple-500" />
              <div>
                <p className="text-white text-sm font-medium">Free Preview</p>
                <p className="text-zinc-600 text-xs">Non-enrolled visitors can watch this lecture</p>
              </div>
            </label>

            {lectureErr && <p className="text-red-400 text-sm">{lectureErr}</p>}

            <div className="flex gap-3 pt-2">
              <button onClick={saveLecture} disabled={lectureSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 disabled:opacity-50 transition-colors">
                <Save size={14} />
                {lectureSaving ? 'Saving…' : lectureModal.lectureId ? 'Save Changes' : 'Add Lecture'}
              </button>
              {lectureModal.lectureId && courseSlug && (
                <button type="button" onClick={() => openLecturePreview(lectureModal.lectureId!)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-purple-500/30 text-purple-300 text-sm font-medium hover:bg-purple-500/10 transition-colors">
                  <Eye size={14} /> Preview
                </button>
              )}
              <button
                onClick={() => { setLectureModal(null); router.replace(`/instructor/courses/${courseId}/curriculum`); }}
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

