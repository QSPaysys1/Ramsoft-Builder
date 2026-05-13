import type {
  EwbExtensionReasonCode,
  EwbTransModeCode,
} from '@ramsoft-builder/ewaybills/models/ewb';

/** Dropdown labels for GSTZen `ewbapi/extend/` `transMode` (NIC string codes). */
export const EWB_EXTEND_UI_TRANS_MODES: ReadonlyArray<{
  code: EwbTransModeCode;
  label: string;
}> = [
  { code: '1', label: 'Road' },
  { code: '2', label: 'Rail' },
  { code: '3', label: 'Air' },
  { code: '4', label: 'Ship' },
];

/** NIC / GSTZen `extnRsnCode` options for extend / multi-vehicle movement. */
export const EWB_EXTEND_UI_EXTN_REASONS: ReadonlyArray<{
  code: EwbExtensionReasonCode;
  label: string;
}> = [
  { code: 1, label: 'Natural calamity' },
  { code: 2, label: 'Law and order situation' },
  { code: 3, label: 'Transshipment' },
  { code: 4, label: 'Accident' },
  { code: 5, label: 'Others' },
];

/** `consignmentStatus` on extend payload (`M` / `T`). */
export const EWB_EXTEND_UI_CONSIGNMENT_STATUS: ReadonlyArray<{
  code: 'M' | 'T';
  label: string;
}> = [
  { code: 'M', label: 'In movement' },
  { code: 'T', label: 'In transit' },
];
