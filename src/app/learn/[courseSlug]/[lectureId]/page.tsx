'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLearner } from '@/contexts/LearnerContext';
import { CheckCircle2, ChevronLeft, ChevronRight, Download, FileText, Play, BookOpen } from 'lucide-react';

interface Lecture {
  id: string;
  title_en: string;
  description_en: string | null;
  video_url: string | null;
  video_type: string | null; // 'vimeo' | 'youtube'
  content_type: string;      // 'video' | 'text' | 'material'
  text_content: string | null;
  material_url: string | null;
  material_filename: string | null;
}

interface Resource {
  id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  file_size_bytes: number | null;
}

function extractVimeoId(url: string): string {
  const m = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  return m ? m[1] : url;
}

function extractVimeoHash(url: string): string | null {
  // Unlisted Vimeo URLs: vimeo.com/123456789/HASH or player.vimeo.com/video/123456789?h=HASH
  const hParam = url.match(/[?&]h=([a-zA-Z0-9]+)/);
  if (hParam) return hParam[1];
  const pathHash = url.match(/vimeo\.com\/\d+\/([a-zA-Z0-9]+)/);
  return pathHash ? pathHash[1] : null;
}

function extractYouTubeId(url: string): string {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : url;
}

function fmtBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function LecturePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams() as { courseSlug: string; lectureId: string };
  const { lectureId, courseSlug } = params;
  const isPreview = searchParams.get('preview') === '1';

  const { allLectures, completedIds, markComplete, courseTitle } = useLearner();

  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  // Current index + nav
  const currentIdx = allLectures.findIndex(l => l.id === lectureId);
  const prevLecture = currentIdx > 0 ? allLectures[currentIdx - 1] : null;
  const nextLecture = currentIdx < allLectures.length - 1 ? allLectures[currentIdx + 1] : null;
  const isCompleted = completedIds.has(lectureId);

  useEffect(() => {
    setLoading(true);
    setLecture(null);
    setResources([]);

    supabase
      .from('lectures')
      .select('id, title_en, description_en, video_url, video_type, content_type, text_content, material_url, material_filename')
      .eq('id', lectureId)
      .single()
      .then(({ data }) => {
        if (data) setLecture(data as Lecture);
        setLoading(false);
      });

    supabase
      .from('lecture_resources')
      .select('id, title, file_url, file_type, file_size_bytes')
      .eq('lecture_id', lectureId)
      .order('sort_order')
      .then(({ data }) => { if (data) setResources(data as Resource[]); });
  }, [lectureId]);

  const handleMarkComplete = async () => {
    if (isPreview) return;
    if (isCompleted || marking) return;
    setMarking(true);
    await markComplete(lectureId);
    setMarking(false);
    // Auto-advance to next lecture after a short delay
    if (nextLecture) {
      setTimeout(() => router.push(`/learn/${courseSlug}/${nextLecture.id}`), 800);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-96">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-96 text-center gap-3">
        <BookOpen size={36} className="text-zinc-700" />
        <p className="text-zinc-500">Lecture not found.</p>
      </div>
    );
  }

  const renderVideo = () => {
    if (!lecture.video_url) return null;
    if (lecture.video_type === 'vimeo') {
      const id = extractVimeoId(lecture.video_url);
      const hash = extractVimeoHash(lecture.video_url);
      return (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://player.vimeo.com/video/${id}?${hash ? `h=${hash}&` : ''}title=0&byline=0&portrait=0&autoplay=0`}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={lecture.title_en}
          />
        </div>
      );
    }
    if (lecture.video_type === 'youtube') {
      const id = extractYouTubeId(lecture.video_url);
      return (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={lecture.title_en}
          />
        </div>
      );
    }
    return (
      <div className="aspect-video w-full bg-[#0f0c1e] flex items-center justify-center">
        <Play size={40} className="text-zinc-700" />
        <p className="text-zinc-600 text-sm ml-3">Video not available</p>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <p className="text-zinc-600 text-xs mb-4 truncate">{courseTitle}</p>

      {/* Video / Content */}
      {lecture.content_type === 'video' && (
        <div className="rounded-xl overflow-hidden mb-6 border border-white/[0.06]">
          {renderVideo()}
        </div>
      )}

      {lecture.content_type === 'text' && lecture.text_content && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0c1e] p-6 mb-6 prose prose-invert prose-sm max-w-none">
          <div
            className="lecture-content text-zinc-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: lecture.text_content }}
          />
        </div>
      )}

      {lecture.content_type === 'material' && lecture.material_url && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0f0c1e] p-6 mb-6">
          <h2 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
            <FileText size={15} className="text-purple-400" /> Download Material
          </h2>
          <a
            href={lecture.material_url}
            target="_blank"
            rel="noreferrer"
            download={lecture.material_filename ?? true}
            className="flex items-center gap-3 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40 hover:bg-purple-500/10 transition-all group">
            <Download size={18} className="text-purple-400 shrink-0" />
            <span className="text-white text-sm flex-1 truncate">
              {lecture.material_filename ?? 'Download file'}
            </span>
          </a>
        </div>
      )}

      {/* Title + actions row */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">{lecture.title_en}</h1>
          {lecture.description_en && (
            <div
              className="lecture-content prose prose-invert prose-sm max-w-none mt-2 text-zinc-500 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: lecture.description_en }}
            />
          )}
        </div>

        {/* Mark complete button */}
        <button
          onClick={handleMarkComplete}
          disabled={isPreview || isCompleted || marking}
          className={`shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            isPreview
              ? 'bg-amber-500/10 text-amber-200 border border-amber-400/25 cursor-default'
              : isCompleted
              ? 'bg-green-900/30 text-green-400 border border-green-500/25 cursor-default'
              : 'bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-60'
          }`}>
          <CheckCircle2 size={15} />
          {isPreview ? 'Preview mode' : isCompleted ? 'Completed' : marking ? 'Saving…' : 'Mark Complete'}
        </button>
      </div>

      {/* Resources */}
      {resources.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText size={15} className="text-purple-400" /> Resources
          </h2>
          <div className="space-y-2">
            {resources.map(r => (
              <a key={r.id} href={r.file_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-[#0f0c1e] hover:border-purple-500/30 hover:bg-white/[0.04] transition-all group">
                <Download size={14} className="text-zinc-600 group-hover:text-purple-400 shrink-0 transition-colors" />
                <span className="text-white text-sm flex-1 truncate">{r.title}</span>
                {r.file_size_bytes && (
                  <span className="text-zinc-600 text-xs shrink-0">{fmtBytes(r.file_size_bytes)}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Prev / Next navigation */}
      <div className="flex items-center justify-between gap-4 pt-6 border-t border-white/[0.06]">
        {prevLecture ? (
          <button onClick={() => router.push(`/learn/${courseSlug}/${prevLecture.id}${isPreview ? '?preview=1' : ''}`)}
            className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors group max-w-[45%]">
            <ChevronLeft size={16} className="shrink-0" />
            <span className="truncate">{prevLecture.title_en}</span>
          </button>
        ) : <div />}

        {nextLecture ? (
          <button onClick={() => router.push(`/learn/${courseSlug}/${nextLecture.id}${isPreview ? '?preview=1' : ''}`)}
            className="flex items-center gap-2 text-zinc-500 hover:text-white text-sm transition-colors group max-w-[45%] text-right ml-auto">
            <span className="truncate">{nextLecture.title_en}</span>
            <ChevronRight size={16} className="shrink-0" />
          </button>
        ) : (
          <div className="text-center ml-auto">
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
              <CheckCircle2 size={16} /> Course Complete!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
