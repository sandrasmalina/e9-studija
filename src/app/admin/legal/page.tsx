'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ExternalLink, FileText, Save, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const RichTextEditor = dynamic(() => import('@/components/RichTextEditor'), { ssr: false });

type DocumentType = 'terms' | 'privacy';

interface LegalDocument {
  id: string;
  document_type: DocumentType;
  version: number;
  title: string;
  content_html: string;
  published_at: string;
}

interface EditorState {
  title: string;
  content: string;
  latestVersion: number;
  publishedAt: string | null;
}

const EMPTY_STATE: Record<DocumentType, EditorState> = {
  terms: { title: 'Terms of Service', content: '', latestVersion: 0, publishedAt: null },
  privacy: { title: 'Privacy Policy', content: '', latestVersion: 0, publishedAt: null },
};

export default function AdminLegalPage() {
  const [states, setStates] = useState<Record<DocumentType, EditorState>>(EMPTY_STATE);
  const [active, setActive] = useState<DocumentType>('terms');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<DocumentType | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('legal_documents')
      .select('id, document_type, version, title, content_html, published_at')
      .in('document_type', ['terms', 'privacy'])
      .order('version', { ascending: false });

    const next = { ...EMPTY_STATE };
    ((data ?? []) as LegalDocument[]).forEach(doc => {
      if (next[doc.document_type].latestVersion === 0) {
        next[doc.document_type] = {
          title: doc.title,
          content: doc.content_html,
          latestVersion: doc.version,
          publishedAt: doc.published_at,
        };
      }
    });
    setStates(next);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateState = (type: DocumentType, patch: Partial<EditorState>) => {
    setStates(current => ({ ...current, [type]: { ...current[type], ...patch } }));
    setMessage('');
    setError('');
  };

  const publish = async (type: DocumentType) => {
    const current = states[type];
    if (!current.title.trim()) { setError('Title is required.'); return; }
    if (!current.content.trim()) { setError('Document text is required.'); return; }

    setSaving(type);
    setMessage('');
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    const nextVersion = current.latestVersion + 1;
    const { error: saveError } = await supabase.from('legal_documents').insert({
      document_type: type,
      version: nextVersion,
      title: current.title.trim(),
      content_html: current.content.trim(),
      created_by: user?.id ?? null,
    });

    setSaving(null);
    if (saveError) { setError(saveError.message); return; }
    setStates(currentStates => ({
      ...currentStates,
      [type]: {
        ...currentStates[type],
        latestVersion: nextVersion,
        publishedAt: new Date().toISOString(),
      },
    }));
    setMessage(`${type === 'terms' ? 'Terms of Service' : 'Privacy Policy'} version ${nextVersion} published. Users will be asked to accept the new version.`);
  };

  const activeState = states[active];

  if (loading) {
    return <div className="space-y-3">{[...Array(5)].map((_, index) => <div key={index} className="h-16 rounded-xl bg-zinc-900/60 animate-pulse" />)}</div>;
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Legal</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage Terms of Service and Privacy Policy. Each apply creates a new version.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/terms" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:text-white">
            <ExternalLink size={14} /> View ToS
          </Link>
          <Link href="/privacy" target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:text-white">
            <ExternalLink size={14} /> View PP
          </Link>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {(['terms', 'privacy'] as DocumentType[]).map(type => {
          const Icon = type === 'terms' ? FileText : Shield;
          const selected = active === type;
          const state = states[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => setActive(type)}
              className={`rounded-2xl border p-4 text-left transition-colors ${selected ? 'border-purple-500/40 bg-purple-500/10' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'}`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={selected ? 'text-purple-300' : 'text-zinc-500'} />
                <div>
                  <p className="font-semibold text-white">{type === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</p>
                  <p className="text-xs text-zinc-500">Current version {state.latestVersion || '-'}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">Document title</label>
            <input
              value={activeState.title}
              onChange={event => updateState(active, { title: event.target.value })}
              className="w-full rounded-xl border border-zinc-700/50 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-purple-500/50 focus:outline-none"
            />
          </div>
          <div className="text-xs text-zinc-500 sm:text-right">
            <p>Current version: {activeState.latestVersion || '-'}</p>
            {activeState.publishedAt && <p>Published: {new Date(activeState.publishedAt).toLocaleString('en-GB')}</p>}
          </div>
        </div>

        <label className="mb-1.5 block text-sm font-medium text-zinc-300">Document text</label>
        <RichTextEditor value={activeState.content} onChange={value => updateState(active, { content: value })} minHeight="360px" placeholder="Write legal text..." />

        {message && <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</p>}
        {error && <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">Applying changes publishes version {activeState.latestVersion + 1} and triggers acceptance for users inside the app.</p>
          <button
            type="button"
            onClick={() => publish(active)}
            disabled={saving === active}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-600 disabled:opacity-60"
          >
            <Save size={15} /> {saving === active ? 'Publishing...' : 'Apply changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
