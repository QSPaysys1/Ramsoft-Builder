import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  STUDENT_STATUS_LABELS,
  type StudentStatus,
} from '@ramsoft-builder/school/models/students';
import { StudentsStore } from './students.store';
import type { StudentsListRouteData } from './students.routes';

@Component({
  standalone: true,
  selector: 'lib-students-list-page',
  imports: [RouterLink],
  templateUrl: './students-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsListPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(StudentsStore);

  readonly title = signal('Students');
  readonly statusFilter = signal<StudentStatus | StudentStatus[] | undefined>(
    undefined,
  );
  readonly profileLink = signal(true);
  readonly searchInput = signal('');
  readonly statusLabels = STUDENT_STATUS_LABELS;

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const data = this.route.snapshot.data as StudentsListRouteData;
    this.title.set(data.title ?? 'Students');
    this.statusFilter.set(data.statusFilter);
    this.profileLink.set(data.profileLink !== false);

    void this.store.loadFilterOptions();
    void this.reload();

    this.route.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((d) => {
        const rd = d as StudentsListRouteData;
        this.title.set(rd.title ?? 'Students');
        this.statusFilter.set(rd.statusFilter);
        this.profileLink.set(rd.profileLink !== false);
        void this.reload();
      });
  }

  onSearchInput(value: string): void {
    this.searchInput.set(value);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.store.patchFilters({ search: value, page: 1 });
      void this.reload();
    }, 350);
  }

  onFilterChange(
    field: 'className' | 'section' | 'academicYear' | 'gender',
    value: string,
  ): void {
    this.store.patchFilters({
      [field]: value || undefined,
      page: 1,
    } as Partial<{ className: string; section: string; academicYear: string; gender: string; page: number }>);
    void this.reload();
  }

  goPage(page: number): void {
    this.store.patchFilters({ page });
    void this.reload();
  }

  exportCsv(): void {
    const rows = this.store.rows();
    if (!rows.length) {
      return;
    }
    const header = [
      'Admission',
      'Roll',
      'First Name',
      'Last Name',
      'Class',
      'Section',
      'Status',
      'Mobile',
    ];
    const lines = rows.map((r) =>
      [
        r.admissionNumber,
        r.rollNumber ?? '',
        r.firstName,
        r.lastName,
        r.className ?? '',
        r.section ?? '',
        r.status,
        r.mobileNumber,
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  statusBadgeClass(status: StudentStatus): string {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
      case 'alumni':
        return 'bg-sky-50 text-sky-800 ring-sky-200';
      case 'transferred':
        return 'bg-violet-50 text-violet-800 ring-violet-200';
      case 'inactive':
      case 'dropped':
        return 'bg-slate-100 text-slate-700 ring-slate-200';
      default:
        return 'bg-amber-50 text-amber-800 ring-amber-200';
    }
  }

  totalPages(): number {
    const f = this.store.filters();
    return Math.max(1, Math.ceil(this.store.total() / f.pageSize));
  }

  private reload(): Promise<void> {
    return this.store.loadList(this.statusFilter());
  }
}
