'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Moon, Sun } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LegalDocument {
  title: string;
  content_html: string;
  version: number;
  published_at: string;
}

export default function TermsPage() {
  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentTheme, setContentTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = window.localStorage.getItem('e9-content-theme');
    if (saved === 'light' || saved === 'dark') setContentTheme(saved);
    supabase
      .from('legal_documents')
      .select('title, content_html, version, published_at')
      .eq('document_type', 'terms')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setDoc(data as LegalDocument | null); setLoading(false); });
  }, []);

  const toggleContentTheme = () => {
    setContentTheme(current => {
      const next = current === 'dark' ? 'light' : 'dark';
      window.localStorage.setItem('e9-content-theme', next);
      return next;
    });
  };

  return (
    <div className={`content-page content-theme-${contentTheme} min-h-screen bg-bg pt-28 pb-20`}>
      <button
        type="button"
        onClick={toggleContentTheme}
        className="fixed right-4 top-24 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-bg-card/90 text-neutral-400 shadow-2xl backdrop-blur transition-colors hover:text-white sm:right-5"
        title={contentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {contentTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-white">
          <ArrowLeft size={14} /> Back to E9 Studija
        </Link>
        <article className="rounded-2xl border border-white/8 bg-bg-card p-5 shadow-2xl shadow-black/10 sm:p-8">
          <div className="mb-8 flex flex-col gap-4 border-b border-white/8 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <FileText size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">{doc?.title ?? 'Terms of Service'}</h1>
                <p className="mt-1 text-sm text-neutral-500">Version {doc?.version ?? '-'}{doc?.published_at ? ` · Updated ${new Date(doc.published_at).toLocaleDateString('en-GB')}` : ''}</p>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => <div key={index} className="h-4 rounded bg-white/8" />)}
            </div>
          ) : doc ? (
            <div className="course-description-content prose prose-invert max-w-none break-words text-neutral-400" dangerouslySetInnerHTML={{ __html: doc.content_html }} />
          ) : (
            <p className="text-neutral-500">Terms of Service are not published yet.</p>
          )}
        </article>
      </div>
    </div>
  );
}
