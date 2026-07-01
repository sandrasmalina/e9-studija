'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LegalDocumentVersion {
  document_type: 'terms' | 'privacy';
  version: number;
  title: string;
}

interface LegalAcceptance {
  document_type: 'terms' | 'privacy';
  version: number;
}

export default function LegalAcceptanceBanner() {
  const [pendingDocs, setPendingDocs] = useState<LegalDocumentVersion[]>([]);
  const [userId, setUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      setUserId(user.id);

      const [{ data: docs }, { data: acceptances }] = await Promise.all([
        supabase
          .from('legal_documents')
          .select('document_type, version, title')
          .in('document_type', ['terms', 'privacy'])
          .order('version', { ascending: false }),
        supabase
          .from('legal_acceptances')
          .select('document_type, version')
          .eq('user_id', user.id),
      ]);

      if (!active) return;
      const latest = new Map<'terms' | 'privacy', LegalDocumentVersion>();
      ((docs ?? []) as LegalDocumentVersion[]).forEach(doc => {
        if (!latest.has(doc.document_type)) latest.set(doc.document_type, doc);
      });
      const accepted = new Map((acceptances ?? []).map((row: LegalAcceptance) => [row.document_type, row.version]));
      setPendingDocs([...latest.values()].filter(doc => (accepted.get(doc.document_type) ?? 0) < doc.version));
    };
    load();
    return () => { active = false; };
  }, []);

  const acceptLatest = async () => {
    if (!userId || pendingDocs.length === 0) return;
    setSaving(true);
    setError('');
    const { error: saveError } = await supabase.from('legal_acceptances').upsert(
      pendingDocs.map(doc => ({
        user_id: userId,
        document_type: doc.document_type,
        version: doc.version,
        accepted_at: new Date().toISOString(),
      })),
      { onConflict: 'user_id,document_type' }
    );
    setSaving(false);
    if (saveError) { setError(saveError.message); return; }
    setPendingDocs([]);
  };

  if (pendingDocs.length === 0) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-4xl rounded-2xl border border-amber-400/30 bg-zinc-950/95 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur sm:inset-x-6 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
          <ShieldCheck size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Please accept the latest legal documents</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            Terms of Service or Privacy Policy has changed. Review the latest documents and accept them to continue using the app.
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <Link href="/terms" target="_blank" className="text-amber-200 hover:text-white">Terms of Service</Link>
            <Link href="/privacy" target="_blank" className="text-amber-200 hover:text-white">Privacy Policy</Link>
          </div>
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={acceptLatest}
        disabled={saving}
        className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-60 sm:mt-0 sm:w-auto sm:shrink-0"
      >
        {saving ? 'Saving...' : 'Accept new version'}
      </button>
    </div>
  );
}
