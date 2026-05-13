import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  EwaybillStore,
  type EwaybillCancelInput,
} from '@ramsoft-builder/ewaybills/data-access/ewb';
import type {
  EwaybillListView,
  EwbCancelReasonCode,
} from '@ramsoft-builder/ewaybills/models/ewb';
import { EwbInlineAlertComponent } from '@ramsoft-builder/ewaybills/ui/form';

/** NIC `cancelRsnCode` reference values. */
const CANCEL_REASONS: ReadonlyArray<{ code: EwbCancelReasonCode; label: string }> = [
  { code: 1, label: 'Duplicate' },
  { code: 2, label: 'Order cancelled' },
  { code: 3, label: 'Data entry mistake' },
  { code: 4, label: 'Others' },
];

@Component({
  standalone: true,
  selector: 'lib-ewb-list-page',
  imports: [RouterLink, ReactiveFormsModule, EwbInlineAlertComponent, DatePipe],
  templateUrl: './ewaybills-list.page.html',
  styleUrl: './ewaybills-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EwaybillsListPageComponent {
  protected readonly store = inject(EwaybillStore);
  private readonly fb = inject(FormBuilder);

  protected readonly cancelReasons = CANCEL_REASONS;
  protected readonly cancelTarget = signal<EwaybillListView | null>(null);
  protected readonly cancelSuccessMessage = signal<string | null>(null);

  protected readonly cancelForm = this.fb.nonNullable.group({
    cancelRsnCode: this.fb.nonNullable.control<EwbCancelReasonCode>(
      3 as EwbCancelReasonCode,
      Validators.required,
    ),
    cancelRmrk: this.fb.nonNullable.control<string>(
      '',
      [Validators.maxLength(50)],
    ),
  });

  protected readonly cancelInFlight = computed(
    () => this.store.cancelStatus() === 'loading',
  );

  constructor() {
    void this.store.loadList();
  }

  protected canCancel(row: EwaybillListView): boolean {
    return row.status === 'generated' && !!row.ewbNumber;
  }

  protected openCancelDialog(row: EwaybillListView): void {
    if (!this.canCancel(row)) {
      return;
    }
    this.cancelSuccessMessage.set(null);
    this.store.dismissCancelError();
    this.cancelForm.reset({ cancelRsnCode: 3 as EwbCancelReasonCode, cancelRmrk: '' });
    this.cancelTarget.set(row);
  }

  protected closeCancelDialog(): void {
    if (this.cancelInFlight()) {
      return;
    }
    this.cancelTarget.set(null);
    this.store.dismissCancelError();
  }

  protected async submitCancel(): Promise<void> {
    const target = this.cancelTarget();
    if (!target?.ewbNumber || this.cancelInFlight()) {
      return;
    }
    this.cancelForm.markAllAsTouched();
    if (this.cancelForm.invalid) {
      return;
    }
    const { cancelRsnCode, cancelRmrk } = this.cancelForm.getRawValue();
    const input: EwaybillCancelInput = {
      id: target.id,
      ewbNo: target.ewbNumber,
      cancelRsnCode,
      cancelRmrk: cancelRmrk.trim() || undefined,
      fromGstin: target.fromGstin ?? undefined,
    };
    await this.store.cancelEwaybill(input);
    if (this.store.cancelStatus() === 'success') {
      this.cancelSuccessMessage.set(
        `E-way bill ${target.ewbNumber} cancelled successfully.`,
      );
      this.cancelTarget.set(null);
    }
  }
}
