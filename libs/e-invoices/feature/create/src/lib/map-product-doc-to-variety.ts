import type { EinvoiceVarietyOption } from './einvoice-variety-option';

function firestoreNum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') {
    return undefined;
  }
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Maps Supabase `products.data` / legacy product doc to variety dropdown option. */
export function mapFirestoreProductDocToVarietyOption(
  doc: Record<string, unknown>,
): EinvoiceVarietyOption {
  return {
    productName: String(doc['productName'] ?? '').trim(),
    hsnCode: doc['hsnCode'] as EinvoiceVarietyOption['hsnCode'],
    units:
      doc['units'] != null && doc['units'] !== ''
        ? String(doc['units']).trim()
        : undefined,
    unitType: firestoreNum(doc['unitType']),
    bags: firestoreNum(doc['bags']),
    itemType:
      doc['itemType'] != null ? String(doc['itemType']).trim() : undefined,
    IsServc:
      doc['IsServc'] != null ? String(doc['IsServc']).trim() : undefined,
    igst: firestoreNum(doc['igst']),
    cgst: firestoreNum(doc['cgst']),
    sgst: firestoreNum(doc['sgst']),
  };
}
