/** Portal labels for GSTR-1 Table 13 — documents issued during the tax period. */
export const GSTR1_DOCUMENTS_ISSUED_SECTIONS: readonly {
  readonly docNum: number;
  readonly title: string;
}[] = [
  { docNum: 1, title: 'Invoices for outward supply' },
  { docNum: 2, title: 'Invoices for inward supply from unregistered person' },
  { docNum: 3, title: 'Revised Invoice' },
  { docNum: 4, title: 'Debit Note' },
  { docNum: 5, title: 'Credit Note' },
  { docNum: 6, title: 'Receipt voucher' },
  { docNum: 7, title: 'Payment Voucher' },
  { docNum: 8, title: 'Refund voucher' },
  { docNum: 9, title: 'Delivery Challan for job work' },
  { docNum: 10, title: 'Delivery Challan for supply on approval' },
  { docNum: 11, title: 'Delivery Challan in case of liquid gas' },
  {
    docNum: 12,
    title: 'Delivery Challan in cases other than by way of supply (excluding at S no. 9 to 11)',
  },
] as const;
