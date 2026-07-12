import { supabaseAdmin } from '@/lib/supabase';
import { getLatestLegalDocumentRefs, type LegalDocumentRef } from '@/lib/legal-documents';

export interface RecordLegalAcceptanceInput {
  userId: string;
  source: string;
  documents?: LegalDocumentRef[];
  acceptedAt?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordLegalAcceptances({
  userId,
  source,
  documents,
  acceptedAt,
  ipAddress,
  userAgent,
}: RecordLegalAcceptanceInput) {
  const latestResult = documents?.length ? null : await getLatestLegalDocumentRefs(supabaseAdmin);
  if (latestResult?.error) return { error: latestResult.error, count: 0 };

  const legalDocuments = documents?.length ? documents : latestResult?.documents ?? [];

  if (legalDocuments.length === 0) return { error: null, count: 0 };

  const acceptedAtValue = acceptedAt ?? new Date().toISOString();
  const rows = legalDocuments.map(document => ({
    user_id: userId,
    document_id: document.id,
    document_type: document.document_type,
    version: document.version,
    accepted_at: acceptedAtValue,
    source,
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
  }));

  const { error } = await supabaseAdmin
    .from('legal_acceptances')
    .upsert(rows, { onConflict: 'user_id,document_type,version', ignoreDuplicates: true });

  return { error, count: error ? 0 : rows.length };
}

export function requestIpAddress(headers: Headers) {
  return headers.get('cf-connecting-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}