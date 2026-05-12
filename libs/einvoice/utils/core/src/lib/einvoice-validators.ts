/** Indian GSTIN (15 chars). */
const GSTIN_PATTERN =
  /^([0][1-9]|[1-2][0-9]|[3][0-7])([A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z])$/;

export function isValidGstin(raw: string | null | undefined): boolean {
  const v = (raw ?? '').toString().trim().toUpperCase();
  return v.length === 15 && GSTIN_PATTERN.test(v);
}

/** HSN: typically 4, 6, or 8 digits (allow 2 for chapter). */
export function isValidHsn(raw: string | null | undefined): boolean {
  const v = (raw ?? '').toString().trim();
  return /^[0-9]{2,8}$/.test(v);
}

export function isValidIndiaPin(raw: string | null | undefined): boolean {
  const v = (raw ?? '').toString().trim();
  return /^[0-9]{6}$/.test(v);
}

/** E-way bill vehicle number — alphanumeric, practical length bounds. */
export function isValidVehicleNo(raw: string | null | undefined): boolean {
  const v = (raw ?? '').toString().trim().toUpperCase();
  return v.length >= 4 && v.length <= 20 && /^[A-Z0-9\-/]+$/.test(v);
}

export function isValidEwbDistance(raw: string | number | null | undefined): boolean {
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) && n >= 0 && n <= 4000;
}
