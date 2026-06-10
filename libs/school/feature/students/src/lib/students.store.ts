import { Injectable, inject, signal } from '@angular/core';
import { AuthStore } from '@ramsoft-builder/auth/data-access/auth';
import { StudentsRepository } from '@ramsoft-builder/school/data-access/students';
import type {
  PromoteStudentsPayload,
  Student,
  StudentInsert,
  StudentListFilters,
  StudentListItem,
  StudentStatus,
  StudentUpdate,
  TransferStudentPayload,
} from '@ramsoft-builder/school/models/students';

export type StudentsViewState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

@Injectable({ providedIn: 'root' })
export class StudentsStore {
  private readonly repo = inject(StudentsRepository);
  private readonly authStore = inject(AuthStore);

  readonly viewState = signal<StudentsViewState>('idle');
  readonly rows = signal<StudentListItem[]>([]);
  readonly total = signal(0);
  readonly errorMessage = signal<string | null>(null);
  readonly filters = signal<StudentListFilters>({
    page: 1,
    pageSize: 20,
  });
  readonly selectedStudent = signal<Student | null>(null);
  readonly classOptions = signal<string[]>([]);
  readonly sectionOptions = signal<string[]>([]);
  readonly yearOptions = signal<string[]>([]);

  private userId(): string | null {
    return this.authStore.user()?.id ?? null;
  }

  async loadList(statusOverride?: StudentStatus | StudentStatus[]): Promise<void> {
    const userId = this.userId();
    if (!userId) {
      this.viewState.set('error');
      this.errorMessage.set('Sign in to manage students.');
      return;
    }
    const f = this.filters();
    const filters: StudentListFilters = {
      ...f,
      status: statusOverride ?? f.status,
    };
    this.viewState.set('loading');
    this.errorMessage.set(null);
    try {
      const result = await this.repo.list(userId, filters);
      this.rows.set(result.rows);
      this.total.set(result.total);
      this.viewState.set(result.rows.length === 0 ? 'empty' : 'success');
    } catch (err: unknown) {
      this.viewState.set('error');
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Failed to load students.',
      );
    }
  }

  async loadFilterOptions(): Promise<void> {
    const userId = this.userId();
    if (!userId) {
      return;
    }
    try {
      const [classes, sections, years] = await Promise.all([
        this.repo.distinctFilterValues(userId, 'class_name'),
        this.repo.distinctFilterValues(userId, 'section'),
        this.repo.distinctFilterValues(userId, 'academic_year'),
      ]);
      this.classOptions.set(classes);
      this.sectionOptions.set(sections);
      this.yearOptions.set(years);
    } catch {
      // non-blocking
    }
  }

  patchFilters(patch: Partial<StudentListFilters>): void {
    this.filters.update((f) => ({ ...f, ...patch }));
  }

  async loadStudent(id: string): Promise<Student | null> {
    const userId = this.userId();
    if (!userId) {
      return null;
    }
    this.errorMessage.set(null);
    try {
      const student = await this.repo.getById(userId, id);
      this.selectedStudent.set(student);
      return student;
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Failed to load student.',
      );
      return null;
    }
  }

  async createStudent(input: StudentInsert): Promise<Student | null> {
    const userId = this.userId();
    if (!userId) {
      return null;
    }
    this.errorMessage.set(null);
    try {
      return await this.repo.create(userId, input);
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Failed to create student.',
      );
      return null;
    }
  }

  async updateStudent(id: string, input: StudentUpdate): Promise<Student | null> {
    const userId = this.userId();
    if (!userId) {
      return null;
    }
    this.errorMessage.set(null);
    try {
      const updated = await this.repo.update(userId, id, input);
      this.selectedStudent.set(updated);
      return updated;
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Failed to update student.',
      );
      return null;
    }
  }

  async deleteStudent(id: string): Promise<boolean> {
    const userId = this.userId();
    if (!userId) {
      return false;
    }
    try {
      await this.repo.softDelete(userId, id);
      return true;
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Failed to delete student.',
      );
      return false;
    }
  }

  async promote(payload: PromoteStudentsPayload): Promise<boolean> {
    const userId = this.userId();
    if (!userId) {
      return false;
    }
    try {
      await this.repo.promoteStudents(userId, payload);
      return true;
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Promotion failed.',
      );
      return false;
    }
  }

  async transfer(payload: TransferStudentPayload): Promise<Student | null> {
    const userId = this.userId();
    if (!userId) {
      return null;
    }
    try {
      return await this.repo.transferStudent(userId, payload);
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Transfer failed.',
      );
      return null;
    }
  }

  async searchStudents(term: string): Promise<StudentListItem[]> {
    const userId = this.userId();
    if (!userId || !term.trim()) {
      return [];
    }
    return this.repo.searchByNameOrAdmission(userId, term.trim());
  }
}
