export * from './lib/gstr1a-return-period';
export * from './lib/gstr1a-amend-tiles';
export * from './lib/gstr1a-legacy-routes';
export * from './lib/gstr1a-workspace.constants';

/** @deprecated Use {@link GSTR1A_SECTION_CARD_PRIMARY_API} */
export { GSTR1A_SECTION_CARD_PRIMARY_API as GSTR1_SECTION_CARD_PRIMARY_API } from './lib/gstr1a-workspace.constants';

export type { Gstr1aAmendRecordDetailTile as Gstr1AmendRecordDetailTile } from './lib/gstr1a-amend-tiles';
