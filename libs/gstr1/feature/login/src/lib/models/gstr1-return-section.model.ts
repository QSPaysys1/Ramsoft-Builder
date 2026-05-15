import type { Gstr1DownloadApiName } from '@ramsoft-builder/gstr1/data-access/gstzen-auth';

/** High-level UI grouping for columns, forms, and EWB mapping. */
export type Gstr1SectionUiKind =
  | 'b2b'
  | 'b2cl'
  | 'b2cs'
  | 'exp'
  | 'cdnr'
  | 'cdnur'
  | 'hsn'
  | 'at'
  | 'txp'
  | 'nil'
  | 'ecom'
  | 'generic';

export type Gstr1SectionRowSource = 'api' | 'local' | 'ewb';

export interface Gstr1SectionLineItem {
  readonly lineLabel: string;
  readonly taxableValue: number;
  readonly igst: number;
  readonly cgst: number;
  readonly sgst: number;
  readonly cess: number;
}

/** Normalized invoice / summary row for workspace tables. */
export interface Gstr1SectionDetailRow {
  readonly rowId: string;
  readonly ctin: string;
  readonly invoiceNo: string;
  readonly invoiceDate: string;
  readonly invoiceValue: number | null;
  readonly taxableTotal: number;
  readonly igst: number;
  readonly cgst: number;
  readonly sgst: number;
  readonly cess: number;
  readonly pos: string;
  readonly reverseCharge: string;
  readonly irn: string;
  readonly gstPayment?: string;
  readonly shippingBillNo?: string;
  readonly shippingBillDate?: string;
  readonly portCode?: string;
  readonly exportType?: string;
  readonly noteNumber?: string;
  readonly noteDate?: string;
  readonly noteType?: string;
  readonly rate?: number;
  readonly hsnCode?: string;
  readonly description?: string;
  readonly uqc?: string;
  readonly quantity?: number;
  readonly items: readonly Gstr1SectionLineItem[];
  readonly source: Gstr1SectionRowSource;
  readonly statusLabel?: string;
}

export function uiKindForDownloadApi(api: Gstr1DownloadApiName): Gstr1SectionUiKind {
  if (api === 'retsum') {
    return 'generic';
  }
  if (api.startsWith('b2b')) {
    return 'b2b';
  }
  if (api.startsWith('b2cl')) {
    return 'b2cl';
  }
  if (api.startsWith('b2cs')) {
    return 'b2cs';
  }
  if (api.startsWith('exp')) {
    return 'exp';
  }
  if (api.startsWith('cdnr')) {
    return 'cdnr';
  }
  if (api.startsWith('cdnur')) {
    return 'cdnur';
  }
  if (api === 'hsnsum') {
    return 'hsn';
  }
  if (api.startsWith('at')) {
    return 'at';
  }
  if (api.startsWith('txp')) {
    return 'txp';
  }
  if (api === 'nil') {
    return 'nil';
  }
  if (api.startsWith('ecom') || api.startsWith('supeco')) {
    return 'ecom';
  }
  return 'generic';
}
