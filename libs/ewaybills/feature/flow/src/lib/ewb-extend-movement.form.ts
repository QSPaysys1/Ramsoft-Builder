import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  ewbVehicleNoFormatValid,
  pincodeValidator,
} from '@ramsoft-builder/ewaybills/utils/core';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function ewbExtendPincodeValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (v === null || v === undefined || v === '') {
    return { required: true };
  }
  return pincodeValidator(String(v)) ? null : { pincode: true };
}

export function ewbExtendVehicleNoValidator(control: AbstractControl): ValidationErrors | null {
  const raw = String(control.value ?? '').trim();
  if (!raw) {
    return { required: true };
  }
  return ewbVehicleNoFormatValid(raw) ? null : { vehicleFormat: true };
}

/** HTML date control (`yyyy-mm-dd`): disallow future calendar dates (GSTZen expects past / today). */
export function ewbTransDocDateNotFutureValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const iso = String(control.value ?? '').trim();
  if (!iso) {
    return null;
  }
  const m = iso.match(ISO_DATE);
  if (!m) {
    return { transDocDate: true };
  }
  const picked = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (!Number.isFinite(picked.getTime())) {
    return { transDocDate: true };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  picked.setHours(0, 0, 0, 0);
  if (picked > today) {
    return { futureDate: true };
  }
  return null;
}

/** Reject transport documents older than ~15 years (bad data / typo guard). */
export function ewbTransDocDateNotAncientValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const iso = String(control.value ?? '').trim();
  if (!iso) {
    return null;
  }
  const m = iso.match(ISO_DATE);
  if (!m) {
    return null;
  }
  const picked = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = new Date();
  const maxAgeMs = 1000 * 60 * 60 * 24 * 365 * 15;
  if (today.getTime() - picked.getTime() > maxAgeMs) {
    return { tooOld: true };
  }
  return null;
}

/**
 * Shared reactive form for GSTZen `ewbapi/extend/` (extend validity + initiate multi-vehicle movement).
 */
export function buildEwbExtendMovementFormGroup(fb: FormBuilder) {
  return fb.nonNullable.group({
    vehicleNo: fb.nonNullable.control<string>('', [
      Validators.required,
      Validators.maxLength(20),
      ewbExtendVehicleNoValidator,
    ]),
    fromPlace: fb.nonNullable.control<string>('', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    fromState: fb.nonNullable.control<number>(0, [
      Validators.required,
      Validators.min(1),
      Validators.max(99),
    ]),
    fromPincode: fb.nonNullable.control<number>(0 as number, [
      Validators.required,
      ewbExtendPincodeValidator,
    ]),
    remainingDistance: fb.nonNullable.control<number>(0, [
      Validators.required,
      Validators.min(1),
      Validators.max(99999),
    ]),
    transDocNo: fb.nonNullable.control<string>('', [
      Validators.required,
      Validators.maxLength(50),
    ]),
    transDocDate: fb.nonNullable.control<string>('', [
      Validators.required,
      ewbTransDocDateNotFutureValidator,
      ewbTransDocDateNotAncientValidator,
    ]),
    transMode: fb.nonNullable.control<string>('1', Validators.required),
    extnRsnCode: fb.nonNullable.control<string>('1', Validators.required),
    extnRemarks: fb.nonNullable.control<string>('', [Validators.maxLength(100)]),
    transitType: fb.nonNullable.control<string>('', [Validators.maxLength(30)]),
    consignmentStatus: fb.nonNullable.control<'M' | 'T'>('M', Validators.required),
  });
}

export type EwbExtendMovementFormGroup = ReturnType<typeof buildEwbExtendMovementFormGroup>;
