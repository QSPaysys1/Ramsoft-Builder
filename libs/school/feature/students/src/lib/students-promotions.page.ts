import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StudentsStore } from './students.store';

@Component({
  standalone: true,
  selector: 'lib-students-promotions-page',
  imports: [ReactiveFormsModule],
  templateUrl: './students-promotions.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsPromotionsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(StudentsStore);

  readonly selectedIds = signal<Set<string>>(new Set());
  readonly saving = signal(false);
  readonly success = signal(false);

  readonly form = this.fb.nonNullable.group({
    nextClassName: ['', Validators.required],
    nextSection: ['', Validators.required],
    academicYear: ['', Validators.required],
  });

  ngOnInit(): void {
    void this.store.loadFilterOptions();
    this.store.patchFilters({ page: 1, pageSize: 100 });
    void this.store.loadList('active');
  }

  toggle(id: string, checked: boolean): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.selectedIds().size === 0) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.success.set(false);
    const ok = await this.store.promote({
      studentIds: [...this.selectedIds()],
      nextClassName: v.nextClassName,
      nextSection: v.nextSection,
      academicYear: v.academicYear,
    });
    this.saving.set(false);
    if (ok) {
      this.success.set(true);
      this.selectedIds.set(new Set());
      void this.store.loadList('active');
    }
  }
}
