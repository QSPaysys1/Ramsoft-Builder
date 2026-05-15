import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Loose Indian GSTIN format (15 alphanumeric; checksum position per NIC pattern).
 */
export const INDIAN_GSTIN_FORMAT_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/** True when trimmed value matches GSTIN structure (use after uppercasing). */
export function isIndianGstinFormat(value: string | null | undefined): boolean {
  const raw = value?.trim();
  if (!raw) {
    return false;
  }
  return INDIAN_GSTIN_FORMAT_REGEX.test(raw.toUpperCase());
}

/** Validates non-empty trimmed value looks like a GSTIN. Pair with `Validators.required`. */
export const indianGstinValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const raw = (control.value as string | null | undefined)?.trim();
  if (!raw) {
    return null;
  }
  const normalized = raw.toUpperCase();
  return INDIAN_GSTIN_FORMAT_REGEX.test(normalized) ? null : { gstinPattern: true };
};
