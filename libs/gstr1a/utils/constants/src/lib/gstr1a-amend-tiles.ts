import type { Gstr1aDownloadApiName } from '@ramsoft-builder/gstr1a/models/entities';

export interface Gstr1aAmendRecordDetailTile {
  readonly portalLabel: string;
  readonly retsumSecNames: readonly string[];
  readonly primaryTileIndex: number;
  readonly amendApi: Gstr1aDownloadApiName;
}

export const GSTR1A_AMEND_RECORD_DETAIL_TILES: readonly Gstr1aAmendRecordDetailTile[] = [
  { portalLabel: '9A - Amended B2B Invoices', retsumSecNames: ['B2BA'], primaryTileIndex: 0, amendApi: 'b2ba' },
  { portalLabel: '9A - Amended B2C (Large) Invoices', retsumSecNames: ['B2CLA'], primaryTileIndex: 1, amendApi: 'b2cla' },
  { portalLabel: '9A - Amended Exports Invoices', retsumSecNames: ['EXPA'], primaryTileIndex: 2, amendApi: 'expa' },
  { portalLabel: '9C - Amended Credit/Debit Notes (Registered)', retsumSecNames: ['CDNRA'], primaryTileIndex: 5, amendApi: 'cdnra' },
  { portalLabel: '9C - Amended Credit/Debit Notes (Unregistered)', retsumSecNames: ['CDNURA'], primaryTileIndex: 6, amendApi: 'cdnura' },
  { portalLabel: '10 - Amended B2C(Others)', retsumSecNames: ['B2CSA'], primaryTileIndex: 3, amendApi: 'b2csa' },
  { portalLabel: '11A - Amended Tax Liability (Advances Received)', retsumSecNames: ['ATA'], primaryTileIndex: 7, amendApi: 'ata' },
  { portalLabel: '11B - Amendment of Adjustment of Advances', retsumSecNames: ['TXPA', 'TXPDA'], primaryTileIndex: 8, amendApi: 'txpa' },
  { portalLabel: '14A - Amended Supplies made through ECO', retsumSecNames: ['ECOMA'], primaryTileIndex: 11, amendApi: 'ecoma' },
  { portalLabel: '15A - Amended Supplies U/s 9(5)', retsumSecNames: ['SUPECOMA'], primaryTileIndex: 12, amendApi: 'supecoa' },
];
