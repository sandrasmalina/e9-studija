export interface LegalDocumentRef {
  id: string;
  document_type: string;
  version: number;
  title?: string;
}

export interface LegalAcceptanceMetadata {
  source: string;
  accepted_at: string;
  documents: Array<{
    document_type: string;
    version: number;
  }>;
}

type SupabaseQueryClient = {
  from: (table: string) => any;
};

export async function getLatestLegalDocumentRefs(client: SupabaseQueryClient, documentTypes?: string[]) {
  let query = client
    .from('legal_documents')
    .select('id, document_type, version, title')
    .order('document_type', { ascending: true })
    .order('version', { ascending: false });

  if (documentTypes?.length) {
    query = query.in('document_type', documentTypes);
  }

  const { data, error } = await query;
  if (error) return { documents: [] as LegalDocumentRef[], error };

  const latest = new Map<string, LegalDocumentRef>();
  ((data ?? []) as LegalDocumentRef[]).forEach(doc => {
    if (!latest.has(doc.document_type)) latest.set(doc.document_type, doc);
  });

  return { documents: [...latest.values()], error: null };
}

export function encodeLegalDocumentVersions(documents: LegalDocumentRef[]) {
  return documents
    .map(document => `${encodeURIComponent(document.document_type)}:${document.version}`)
    .join(',');
}

export function parseLegalDocumentVersions(value?: string | null) {
  if (!value) return [] as Array<{ document_type: string; version: number }>;

  return value.split(',').flatMap(item => {
    const [encodedType, rawVersion] = item.split(':');
    const version = Number(rawVersion);
    if (!encodedType || !Number.isInteger(version)) return [];

    try {
      return [{ document_type: decodeURIComponent(encodedType), version }];
    } catch {
      return [];
    }
  });
}

export async function getLegalDocumentRefsByVersions(
  client: SupabaseQueryClient,
  refs: Array<{ document_type: string; version: number }>,
) {
  const documentTypes = [...new Set(refs.map(ref => ref.document_type))];
  if (documentTypes.length === 0) return { documents: [] as LegalDocumentRef[], error: null };

  const { data, error } = await client
    .from('legal_documents')
    .select('id, document_type, version, title')
    .in('document_type', documentTypes);

  if (error) return { documents: [] as LegalDocumentRef[], error };

  const expected = new Set(refs.map(ref => `${ref.document_type}:${ref.version}`));
  const documents = ((data ?? []) as LegalDocumentRef[]).filter(document => (
    expected.has(`${document.document_type}:${document.version}`)
  ));

  return { documents, error: null };
}

export function buildLegalAcceptanceMetadata(documents: LegalDocumentRef[], source: string): LegalAcceptanceMetadata {
  return {
    source,
    accepted_at: new Date().toISOString(),
    documents: documents.map(doc => ({
      document_type: doc.document_type,
      version: doc.version,
    })),
  };
}