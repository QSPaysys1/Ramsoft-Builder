import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import type {
  EwbChangeMultiVehiclesRequest,
  EwbPartBReasonCode,
} from '@ramsoft-builder/ewaybills/models/ewb';
import {
  normalizeEwbNoTo12Digits,
} from '@ramsoft-builder/ewaybills/utils/core';
import {
  mvGroupPostEwbNoValidator,
  mvGroupPostVehicleNoValidator,
} from './ewb-add-multi-vehicles.form';

export function changeMultiVehiclesGroupNoValidator(
  control: AbstractControl,
): ValidationErrors | null {
  const raw = String(control.value ?? '').trim();
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    return { groupNoInt: true };
  }
  return null;
}

export function buildChangeMultiVehiclesFormGroup(fb: FormBuilder) {
  return fb.nonNullable.group({
    ewbNo: fb.nonNullable.control<string>('', [
      Validators.required,
      mvGroupPostEwbNoValidator,
    ]),
    groupNo: fb.nonNullable.control<string>('', [
      Validators.required,
      Validators.maxLength(8),
      changeMultiVehiclesGroupNoValidator,
    ]),
    oldvehicleNo: fb.nonNullable.control<string>('', [
      Validators.required,
      Validators.maxLength(20),
      mvGroupPostVehicleNoValidator,
    ]),
    newVehicleNo: fb.nonNullable.control<string>('', [
      Validators.required,
      Validators.maxLength(20),
      mvGroupPostVehicleNoValidator,
    ]),
    oldTranNo: fb.nonNullable.control<string>('', [
      Validators.required,
      Validators.maxLength(50),
    ]),
    newTranNo: fb.nonNullable.control<string>('', [
      Validators.required,
      Validators.maxLength(50),
    ]),
    fromPlace: fb.nonNullable.control<string>('', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    fromState: fb.nonNullable.control<number>(1, [
      Validators.required,
      Validators.min(1),
      Validators.max(99),
    ]),
    reasonCode: fb.nonNullable.control<EwbPartBReasonCode>('1', [Validators.required]),
    reasonRem: fb.nonNullable.control<string>('', [Validators.maxLength(100)]),
  });
}

export type ChangeMultiVehiclesFormGroup = ReturnType<
  typeof buildChangeMultiVehiclesFormGroup
>;

export function changeMultiVehiclesFormToApiPayload(
  v: ChangeMultiVehiclesFormGroup['value'],
): EwbChangeMultiVehiclesRequest | null {
  const ewb = normalizeEwbNoTo12Digits(v.ewbNo);
  if (!ewb) {
    return null;
  }
  const groupRaw = String(v.groupNo ?? '').trim();
  const groupNo = Math.trunc(Number(groupRaw));
  if (!Number.isFinite(groupNo) || groupNo <= 0) {
    return null;
  }
  const fromState = Math.trunc(Number(v.fromState));
  if (!Number.isFinite(fromState) || fromState < 1 || fromState > 99) {
    return null;
  }
  const oldvehicleNo = String(v.oldvehicleNo ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  const newVehicleNo = String(v.newVehicleNo ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (!oldvehicleNo || !newVehicleNo) {
    return null;
  }
  const oldTranNo = String(v.oldTranNo ?? '').trim();
  const newTranNo = String(v.newTranNo ?? '').trim();
  if (!oldTranNo || !newTranNo || oldTranNo.length > 50 || newTranNo.length > 50) {
    return null;
  }
  const fromPlace = String(v.fromPlace ?? '').trim();
  if (!fromPlace) {
    return null;
  }
  const reasonCode = String(v.reasonCode ?? '').trim();
  if (!reasonCode) {
    return null;
  }
  return {
    ewbNo: Number(ewb),
    groupNo,
    oldvehicleNo,
    newVehicleNo,
    oldTranNo,
    newTranNo,
    fromPlace,
    fromState,
    reasonCode,
    reasonRem: String(v.reasonRem ?? '').trim(),
  };
}
