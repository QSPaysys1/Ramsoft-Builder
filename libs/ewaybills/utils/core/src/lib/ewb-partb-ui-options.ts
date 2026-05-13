import type { EwbPartBReasonCode } from '@ramsoft-builder/ewaybills/models/ewb';

/** NIC Part-B / vehicle-update reason codes (GSTZen uses string `reasonCode` on several endpoints). */
export const EWB_PARTB_UI_REASONS: ReadonlyArray<{
  code: EwbPartBReasonCode;
  label: string;
}> = [
  { code: '1', label: 'Vehicle break down' },
  { code: '2', label: 'Transshipment' },
  { code: '3', label: 'Not available' },
  { code: '4', label: 'Natural calamity' },
  { code: '5', label: 'Law and order situation' },
];
