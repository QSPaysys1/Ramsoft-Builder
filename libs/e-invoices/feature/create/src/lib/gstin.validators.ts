import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

/** Indian GSTIN (15 chars). */
const GSTIN_PATTERN =
  /^([0][1-9]|[1-2][0-9]|[3][0-7])([A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z])$/;

export function gstinValidator(allowEmpty = false): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString().trim().toUpperCase();
    if (!raw) {
      return allowEmpty ? null : { required: true };
    }
    if (raw.length !== 15) {
      return { gstinLength: true };
    }
    return GSTIN_PATTERN.test(raw) ? null : { gstinPattern: true };
  };
}

export const pinIndiaValidator: ValidatorFn = (control: AbstractControl) => {
  const raw = (control.value ?? '').toString();
  if (!raw) {
    return { required: true };
  }
  return /^[0-9]{6}$/.test(raw) ? null : { pin: true };
};

export const vehicleNoEwbValidators = [
  Validators.required,
  Validators.minLength(4),
  Validators.maxLength(20),
];
