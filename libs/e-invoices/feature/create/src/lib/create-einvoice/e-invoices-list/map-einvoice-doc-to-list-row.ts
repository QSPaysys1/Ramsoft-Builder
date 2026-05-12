/**
 * Normalizes legacy `einvoices` docs (flat NIC fields) and Ramsoft saves
 * (`baseObject` + `gstzenResponse`) into one list row shape.
 */

export { einvoiceDocSortKey } from '@ramsoft-builder/e-invoices/data-access/einvoice';

export interface EinvoiceListRow {
  id: string;
  docNo: string;
  docDate: string;
  message: string;
  /** GEN | ERR | NON | … or null when only GSTZen message applies. */
  irnStatus: string | null;
  /** Shown in IRN column when `irnStatus` is empty (legacy second branch). */
  statusFallbackMessage: string;
  ewbNo: string | null;
  buyerGstin: string;
  buyerName: string;
  buyerLoc: string;
  crNo: string | null;
  crdr: string | null;
}

function str(v: unknown): string {
  if (v == null) {
    return '';
  }
  return String(v).trim();
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

export function mapEinvoiceDocToListRow(
  doc: Record<string, unknown> & { id: string },
): EinvoiceListRow {
  const base = asRecord(doc['baseObject']) ?? doc;
  const docDtls = asRecord(base['DocDtls']) ?? asRecord(doc['DocDtls']);
  const buyerDtls =
    asRecord(base['BuyerDtls']) ?? asRecord(doc['BuyerDtls']) ?? {};

  const response = asRecord(doc['response']);
  const gstzen =
    asRecord(doc['gstzenResponse']) ?? asRecord(doc['gstzenresponse']);

  const docNo = str(docDtls?.['No']);
  const docDate = str(docDtls?.['Dt']);

  let irnStatus =
    str(response?.['IrnStatus']) || str(gstzen?.['IrnStatus']) || null;
  if (!irnStatus && str(gstzen?.['Irn'])) {
    irnStatus = 'GEN';
  }
  const errDetails = gstzen?.['ErrorDetails'];
  const hasErrDetails = Array.isArray(errDetails) && errDetails.length > 0;
  if (!irnStatus && (hasErrDetails || gstzen?.['Success'] === false)) {
    irnStatus = 'ERR';
  }

  const message =
    str(response?.['message']) ||
    str(gstzen?.['message']) ||
    str(gstzen?.['ErrorMessage']) ||
    '';

  const statusFallbackMessage =
    str(gstzen?.['message']) || str(gstzen?.['ErrorMessage']) || '';

  const rawEwb = str(response?.['EwbNo']) || str(gstzen?.['EwbNo']);
  const ewbNo = rawEwb.length > 0 ? rawEwb : null;

  return {
    id: doc.id,
    docNo,
    docDate,
    message,
    irnStatus,
    statusFallbackMessage,
    ewbNo,
    buyerGstin: str(buyerDtls['Gstin']),
    buyerName: str(buyerDtls['LglNm']),
    buyerLoc: str(buyerDtls['Loc']),
    crNo: doc['crNo'] != null ? str(doc['crNo']) : null,
    crdr: doc['crdr'] != null ? str(doc['crdr']) : null,
  };
}
