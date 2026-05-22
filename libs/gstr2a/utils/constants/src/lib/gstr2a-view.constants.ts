export interface Gstr2aSectionTile {
  readonly id: string;
  readonly label: string;
}

export interface Gstr2aPart {
  readonly id: string;
  readonly title: string;
  readonly note?: string;
  readonly tiles: readonly Gstr2aSectionTile[];
}

export const GSTR2A_PARTS: readonly Gstr2aPart[] = [
  {
    id: 'part-a',
    title: 'Part-A',
    note: '* Why my Invoice is missing in GSTR-2A? — portal help *',
    tiles: [
      { id: 'b2b', label: 'B2B Invoices' },
      { id: 'cdn', label: 'Credit/Debit Notes' },
      { id: 'b2ba', label: 'Amendments to B2B Invoices' },
      { id: 'cdna', label: 'Amendments to Credit/Debit Notes' },
      { id: 'eco', label: 'ECO Documents' },
      { id: 'ecoa', label: 'Amendments to ECO Documents' },
    ],
  },
  {
    id: 'part-b',
    title: 'Part-B',
    tiles: [
      { id: 'isd', label: 'ISD Credits' },
      { id: 'isda', label: 'Amendments to ISD Credits' },
    ],
  },
  {
    id: 'part-c',
    title: 'Part-C',
    tiles: [
      { id: 'tds', label: 'TDS Credits' },
      { id: 'tdsa', label: 'Amendments to TDS Credits' },
      { id: 'tcs', label: 'TCS Credits' },
    ],
  },
  {
    id: 'part-d',
    title: 'Part-D',
    tiles: [
      {
        id: 'imp-goods',
        label: 'Import of goods from overseas on bill of entry',
      },
      {
        id: 'imp-sez',
        label: 'Import of goods from SEZ units / developers on bill of entry',
      },
    ],
  },
];
