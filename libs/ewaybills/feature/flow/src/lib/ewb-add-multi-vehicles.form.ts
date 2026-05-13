import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import type { EwbMvGroupPostRequest } from '@ramsoft-builder/ewaybills/models/ewb';
import {
  ewbVehicleNoFormatValid,
  formatIsoDateToDdMmYyyy,
  normalizeEwbNoTo12Digits,
} from '@ramsoft-builder/ewaybills/utils/core';
import {
  ewbTransDocDateNotAncientValidator,
  ewbTransDocDateNotFutureValidator,
} from './ewb-extend-movement.form';

export function mvGroupPostEwbNoValidator(control: AbstractControl): ValidationErrors | null {
  const v = normalizeEwbNoTo12Digits(control.value);
  return v ? null : { ewbNo12: true };
}

export function mvGroupPostVehicleNoValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const raw = String(control.value ?? '').trim();
  if (!raw) {
    return { required: true };
  }
  return ewbVehicleNoFormatValid(raw) ? null : { vehicleFormat: true };
}

function quantityPositiveIntValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  if (v === null || v === undefined || v === '') {
    return null;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    return { quantity: true };
  }
  return null;
}

/**
 * Reactive form for GSTZen `ewbapi/add-multi-vehicles/`.
 * `transDocDate` uses the HTML date control (`yyyy-mm-dd`); the API receives `DD/MM/YYYY`.
 */
export function buildMvGroupPostFormGroup(fb: FormBuilder) {
  return fb.nonNullable.group({
    ewbNo: fb.nonNullable.control<string>('', [
      Validators.required,
      mvGroupPostEwbNoValidator,
    ]),
    groupNo: fb.nonNullable.control<string>('', [
      Validators.required,
      Validators.maxLength(20),
    ]),
    vehicleNo: fb.nonNullable.control<string>('', [
      Validators.required,
      Validators.maxLength(20),
      mvGroupPostVehicleNoValidator,
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
    quantity: fb.nonNullable.control<number>(1, [
      Validators.required,
      Validators.min(1),
      quantityPositiveIntValidator,
    ]),
  });
}

export type MvGroupPostFormGroup = ReturnType<typeof buildMvGroupPostFormGroup>;

export function mvGroupPostFormToApiPayload(
  v: MvGroupPostFormGroup['value'],
): EwbMvGroupPostRequest | null {
  const ewb = normalizeEwbNoTo12Digits(v.ewbNo);
  if (!ewb) {
    return null;
  }
  const qty = Number(v.quantity);
  if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
    return null;
  }
  const transDocDate = formatIsoDateToDdMmYyyy(String(v.transDocDate ?? '').trim());
  if (!transDocDate) {
    return null;
  }
  return {
    ewbNo: Number(ewb),
    groupNo: String(v.groupNo ?? '').trim(),
    vehicleNo: String(v.vehicleNo ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ''),
    transDocNo: String(v.transDocNo ?? '').trim(),
    transDocDate,
    quantity: qty,
  };
}
