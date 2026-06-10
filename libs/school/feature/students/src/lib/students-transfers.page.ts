import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { StudentListItem } from '@ramsoft-builder/school/models/students';
import type { TransfersPageRouteData } from './students.routes';
import { StudentsStore } from './students.store';

@Component({
  standalone: true,
  selector: 'lib-students-transfers-page',
  imports: [ReactiveFormsModule],
  templateUrl: './students-transfers.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsTransfersPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(StudentsStore);

  readonly pageTitle = signal('Transfer student');
  readonly lockTransferType = signal(false);

  readonly searchTerm = signal('');
  readonly results = signal<StudentListItem[]>([]);
  readonly selected = signal<StudentListItem | null>(null);
  readonly saving = signal(false);
  readonly completedTc = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    transferType: ['outgoing', Validators.required],
    transferDate: [
      new Date().toISOString().slice(0, 10),
      Validators.required,
    ],
    reason: ['', Validators.required],
    newSchool: ['', Validators.required],
  });

  constructor() {
    this.applyRouteData(this.route.snapshot.data as TransfersPageRouteData);
    this.route.data
      .pipe(takeUntilDestroyed())
      .subscribe((d) => this.applyRouteData(d as TransfersPageRouteData));
  }

  private applyRouteData(data: TransfersPageRouteData): void {
    if (data.title) {
      this.pageTitle.set(data.title);
    }
    const locked = !!data.lockTransferType;
    this.lockTransferType.set(locked);
    if (data.defaultTransferType) {
      this.form.patchValue({ transferType: data.defaultTransferType });
      if (locked) {
        this.form.controls.transferType.disable();
      } else {
        this.form.controls.transferType.enable();
      }
    }
  }

  async onSearch(term: string): Promise<void> {
    this.searchTerm.set(term);
    this.completedTc.set(null);
    if (term.trim().length < 2) {
      this.results.set([]);
      return;
    }
    const rows = await this.store.searchStudents(term);
    this.results.set(rows);
  }

  pick(student: StudentListItem): void {
    this.selected.set(student);
    this.results.set([]);
    this.searchTerm.set(`${student.firstName} ${student.lastName}`);
    this.completedTc.set(null);
  }

  async submit(): Promise<void> {
    const student = this.selected();
    if (!student || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    const updated = await this.store.transfer({
      studentId: student.id,
      transferType: v.transferType,
      transferDate: v.transferDate,
      reason: v.reason,
      newSchool: v.newSchool,
    });
    this.saving.set(false);
    if (updated) {
      this.completedTc.set(updated.transferDetails.tcNumber ?? null);
      this.selected.set(null);
      this.searchTerm.set('');
    }
  }
}
