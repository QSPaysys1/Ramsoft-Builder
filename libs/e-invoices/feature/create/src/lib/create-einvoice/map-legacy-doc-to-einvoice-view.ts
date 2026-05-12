/**
 * Merges Supabase `einvoices` legacy rows into a flat shape compatible with
 * usaccounting `invoicefv` templates (`DocDtls`, `response.Irn`, etc.).
 */

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

/** View model: NIC body fields + `response` from Firestore-style or GSTZen. */
export type EinvoiceViewModel = Record<string, unknown> & {
  response: Record<string, unknown>;
};

export function mapLegacyDocToEinvoiceView(
  doc: Record<string, unknown> & { id: string },
): EinvoiceViewModel {
  const base = asRecord(doc['baseObject']) ?? (doc as Record<string, unknown>);
  const response =
    asRecord(doc['response']) ??
    asRecord(doc['gstzenResponse']) ??
    asRecord(doc['gstzenresponse']) ??
    {};

  return {
    ...base,
    id: doc.id,
    response,
  };
}
