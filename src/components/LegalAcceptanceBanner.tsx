'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getLatestLegalDocumentRefs, type LegalDocumentRef } from '@/lib/legal-documents';

interface LegalAcceptance {
  document_type: string;
  version: number;
}

function canRetryWithLegacyAcceptanceShape(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('no unique or exclusion constraint matching the on conflict specification')
    || normalized.includes('document_id')
    || normalized.includes('source')
    || normalized.includes('schema cache');
}

export default function LegalAcceptanceBanner() {
  const [pendingDocs, setPendingDocs] = useState<LegalDocumentRef[]>([]);
  const [userId, setUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      setUserId(user.id);

      const [{ documents: docs, error: docsError }, { data: acceptances }] = await Promise.all([
        getLatestLegalDocumentRefs(supabase),
        supabase
          .from('legal_acceptances')
          .select('document_type, version')
          .eq('user_id', user.id),
      ]);

      if (!active) return;
      if (docsError) { setError(docsError.message); return; }

      const accepted = new Map<string, number>();
      ((acceptances ?? []) as LegalAcceptance[]).forEach(row => {
        accepted.set(row.document_type, Math.max(accepted.get(row.document_type) ?? 0, row.version));
      });
      setPendingDocs(docs.filter(doc => (accepted.get(doc.document_type) ?? 0) < doc.version));
    };
    load();
    return () => { active = false; };
  }, []);

  const acceptLatest = async () => {
    if (!userId || pendingDocs.length === 0) return;
    setSaving(true);
    setError('');
    const acceptedAt = new Date().toISOString();
    const rows = pendingDocs.map(doc => ({
        user_id: userId,
        document_id: doc.id,
        document_type: doc.document_type,
        version: doc.version,
        accepted_at: acceptedAt,
        source: 'banner',
      }));
    let { error: saveError } = await supabase.from('legal_acceptances').upsert(
      rows,
      { onConflict: 'user_id,document_type,version', ignoreDuplicates: true }
    );

    if (saveError && canRetryWithLegacyAcceptanceShape(saveError.message)) {
      const fallbackRows = rows.map(({ document_id, source, ...row }) => row);
      const { error: fallbackError } = await supabase.from('legal_acceptances').upsert(
        fallbackRows,
        { onConflict: 'user_id,document_type' }
      );
      saveError = fallbackError;
    }

    setSaving(false);
    if (saveError) { setError(saveError.message); return; }
    setPendingDocs([]);
  };

  const documentHref = (documentType: string) => {
    if (documentType === 'terms') return '/terms';
    if (documentType === 'privacy') return '/privacy';
    return null;
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
            Review and accept the latest legal documents to continue using the app.
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {pendingDocs.map(doc => {
              const href = documentHref(doc.document_type);
              return href ? (
                <Link key={`${doc.document_type}-${doc.version}`} href={href} target="_blank" className="text-amber-200 hover:text-white">
                  {doc.title ?? doc.document_type} v{doc.version}
                </Link>
              ) : (
                <span key={`${doc.document_type}-${doc.version}`} className="text-zinc-300">
                  {doc.title ?? doc.document_type} v{doc.version}
                </span>
              );
            })}
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
        {saving ? 'Saving...' : 'Accept latest versions'}
      </button>
    </div>
  );
}
