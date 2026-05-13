import { DatePipe, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import type {
  EwaybillDbRow,
  EwaybillTransportUpdateDbRow,
} from '@ramsoft-builder/ewaybills/models/ewb';
import { EwaybillRepository } from '@ramsoft-builder/ewaybills/data-access/ewb';
import { EwbInlineAlertComponent } from '@ramsoft-builder/ewaybills/ui/form';

@Component({
  standalone: true,
  selector: 'lib-ewb-detail-page',
  imports: [RouterLink, DatePipe, JsonPipe, EwbInlineAlertComponent],
  templateUrl: './ewaybill-detail.page.html',
  styleUrl: './ewaybill-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EwaybillDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authStore = inject(AuthStore);
  private readonly repo = inject(EwaybillRepository);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly row = signal<EwaybillDbRow | null | undefined>(undefined);
  protected readonly loadError = signal<string | null>(null);
  protected readonly transportUpdates = signal<
    EwaybillTransportUpdateDbRow[] | undefined
  >(undefined);
  protected readonly transportLoadError = signal<string | null>(null);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
      void this.load(pm.get('id'));
    });
  }

  private async load(id: string | null): Promise<void> {
    this.loadError.set(null);
    this.transportLoadError.set(null);
    this.transportUpdates.set(undefined);
    this.row.set(undefined);
    if (!id) {
      this.row.set(null);
      this.transportUpdates.set([]);
      return;
    }
    const uid = this.authStore.user()?.id;
    if (!uid) {
      this.row.set(null);
      this.transportUpdates.set([]);
      return;
    }
    try {
      const r = await this.repo.getById(uid, id);
      this.row.set(r ?? null);
      if (r) {
        try {
          const logs = await this.repo.listTransportUpdatesForEwaybill(uid, id);
          this.transportUpdates.set(logs);
        } catch (e) {
          this.transportLoadError.set(
            e instanceof Error ? e.message : 'Failed to load Part B history.',
          );
          this.transportUpdates.set([]);
        }
      } else {
        this.transportUpdates.set([]);
      }
    } catch (e) {
      this.loadError.set(e instanceof Error ? e.message : 'Failed to load.');
      this.row.set(null);
      this.transportUpdates.set([]);
    }
  }
}
