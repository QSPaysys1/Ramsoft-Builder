import type { Gstr2bCpSummRow, Gstr2bDocRow } from '@ramsoft-builder/gstr2b/models/entities';

export type Gstr2bAllTablesSubTab = 'supplier' | 'document';

export interface Gstr2bTableColumnDef<TRow extends object = object> {
  readonly id: string;
  readonly label: string;
  readonly field: keyof TRow & string;
  readonly locked?: boolean;
  /** Hidden by default in Display/Hide Columns (document tab). */
  readonly defaultHidden?: boolean;
}

export const GSTR2B_SUPPLIER_TABLE_COLUMNS: readonly Gstr2bTableColumnDef<Gstr2bCpSummRow>[] = [
  { id: 'supplierGstin', label: 'GSTIN of supplier', field: 'supplierGstin', locked: true },
  { id: 'tradeName', label: 'Trade/legal name', field: 'tradeName' },
  { id: 'totalDocs', label: 'Number of records', field: 'totalDocs' },
  { id: 'taxableValue', label: 'Taxable Value (₹)', field: 'taxableValue' },
  { id: 'integratedTax', label: 'Integrated Tax (₹)', field: 'integratedTax' },
  { id: 'centralTax', label: 'Central Tax (₹)', field: 'centralTax' },
  { id: 'stateTax', label: 'State/UT Tax (₹)', field: 'stateTax' },
  { id: 'cess', label: 'Cess (₹)', field: 'cess' },
];

export const GSTR2B_DOCUMENT_TABLE_COLUMNS: readonly Gstr2bTableColumnDef<Gstr2bDocRow>[] = [
  { id: 'supplierGstin', label: 'GSTIN of supplier', field: 'supplierGstin', locked: true },
  { id: 'tradeName', label: 'Trade/legal name', field: 'tradeName' },
  { id: 'invoiceNumber', label: 'Invoice number', field: 'invoiceNumber' },
  { id: 'invoiceType', label: 'Invoice type', field: 'invoiceType' },
  { id: 'invoiceDate', label: 'Invoice Date', field: 'invoiceDate' },
  { id: 'invoiceValue', label: 'Invoice Value (₹)', field: 'invoiceValue' },
  { id: 'placeOfSupply', label: 'Place of supply', field: 'placeOfSupply' },
  {
    id: 'reverseCharge',
    label: 'Supply Attract Reverse Charge',
    field: 'reverseCharge',
  },
  { id: 'taxableValue', label: 'Total Taxable Value (₹)', field: 'taxableValue' },
  { id: 'integratedTax', label: 'Integrated Tax (₹)', field: 'integratedTax' },
  { id: 'centralTax', label: 'Central Tax (₹)', field: 'centralTax' },
  { id: 'stateTax', label: 'State/UT Tax (₹)', field: 'stateTax' },
  { id: 'cess', label: 'Cess (₹)', field: 'cess' },
  {
    id: 'gstr1FilingPeriod',
    label: 'GSTR-1/IFF/GSTR-1A/GSTR-5 Period',
    field: 'gstr1FilingPeriod',
  },
  {
    id: 'gstr1FilingDate',
    label: 'GSTR-1/IFF/GSTR-1A/GSTR-5 Filing Date',
    field: 'gstr1FilingDate',
  },
  { id: 'itcAvailability', label: 'ITC Availability', field: 'itcAvailability' },
  { id: 'reason', label: 'Reason', field: 'reason' },
  { id: 'source', label: 'Source', field: 'source' },
  {
    id: 'taxRatePercent',
    label: 'Applicable % of Tax Rate',
    field: 'taxRatePercent',
    defaultHidden: true,
  },
  { id: 'irn', label: 'IRN', field: 'irn', defaultHidden: true },
  { id: 'irnDate', label: 'IRN Date', field: 'irnDate', defaultHidden: true },
];

export const GSTR2B_RECORDS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

export const GSTR2B_INVOICE_TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'R', label: 'Regular' },
  { value: 'DE', label: 'Deemed Exports' },
  { value: 'SEWP', label: 'SEZ supplies with payment' },
  { value: 'SEWOP', label: 'SEZ supplies without payment' },
  { value: 'CBW', label: 'Custom Bonded Warehouse' },
] as const;

export const GSTR2B_YES_NO_FILTER_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
] as const;

export const GSTR2B_TAX_RATE_FILTER_OPTIONS = [
  { value: '', label: 'Select' },
  { value: '0', label: '0%' },
  { value: '0.1', label: '0.1%' },
  { value: '0.25', label: '0.25%' },
  { value: '1', label: '1%' },
  { value: '1.5', label: '1.5%' },
  { value: '3', label: '3%' },
  { value: '5', label: '5%' },
  { value: '6', label: '6%' },
  { value: '7.5', label: '7.5%' },
  { value: '12', label: '12%' },
  { value: '18', label: '18%' },
  { value: '28', label: '28%' },
] as const;

export function gstr2bDefaultDocumentColumnVisibility(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const col of GSTR2B_DOCUMENT_TABLE_COLUMNS) {
    out[col.id] = !col.defaultHidden;
  }
  return out;
}
