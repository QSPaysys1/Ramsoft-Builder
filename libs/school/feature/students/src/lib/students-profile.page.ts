import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  STUDENT_STATUSES,
  STUDENT_STATUS_LABELS,
} from '@ramsoft-builder/school/models/students';
import { StudentsStore } from './students.store';

@Component({
  standalone: true,
  selector: 'lib-students-profile-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './students-profile.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsProfilePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly store = inject(StudentsStore);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly statuses = STUDENT_STATUSES;
  readonly statusLabels = STUDENT_STATUS_LABELS;
  readonly activeSection = signal<
    'overview' | 'academic' | 'parents' | 'address' | 'medical'
  >('overview');

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    gender: [''],
    dateOfBirth: [''],
    mobileNumber: ['', Validators.required],
    email: [''],
    academicYear: ['', Validators.required],
    admissionDate: [''],
    className: [''],
    section: [''],
    rollNumber: [''],
    status: ['active', Validators.required],
    line1: [''],
    city: [''],
    state: [''],
    pincode: [''],
    allergies: [''],
    emergencyContact: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigate(['/school-management/academics/students/all']);
      return;
    }
    void this.load(id);
  }

  async load(id: string): Promise<void> {
    this.loading.set(true);
    const s = await this.store.loadStudent(id);
    this.loading.set(false);
    if (!s) {
      return;
    }
    this.form.patchValue({
      firstName: s.firstName,
      lastName: s.lastName,
      gender: s.gender ?? '',
      dateOfBirth: s.dateOfBirth ?? '',
      mobileNumber: s.mobileNumber,
      email: s.email ?? '',
      academicYear: s.academicYear,
      admissionDate: s.admissionDate,
      className: s.className ?? '',
      section: s.section ?? '',
      rollNumber: s.rollNumber ?? '',
      status: s.status,
      line1: s.address.line1 ?? '',
      city: s.address.city ?? '',
      state: s.address.state ?? '',
      pincode: s.address.pincode ?? '',
      allergies: s.medical.allergies ?? '',
      emergencyContact: s.medical.emergencyContact ?? '',
    });
  }

  setSection(
    section: 'overview' | 'academic' | 'parents' | 'address' | 'medical',
  ): void {
    this.activeSection.set(section);
  }

  async save(): Promise<void> {
    const s = this.store.selectedStudent();
    if (!s || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    await this.store.updateStudent(s.id, {
      firstName: v.firstName,
      lastName: v.lastName,
      gender: v.gender || null,
      dateOfBirth: v.dateOfBirth || null,
      mobileNumber: v.mobileNumber,
      email: v.email || null,
      academicYear: v.academicYear,
      admissionDate: v.admissionDate,
      className: v.className || null,
      section: v.section || null,
      rollNumber: v.rollNumber || null,
      status: v.status as (typeof STUDENT_STATUSES)[number],
      address: {
        line1: v.line1 || undefined,
        city: v.city || undefined,
        state: v.state || undefined,
        pincode: v.pincode || undefined,
      },
      medical: {
        allergies: v.allergies || undefined,
        emergencyContact: v.emergencyContact || undefined,
      },
    });
    this.saving.set(false);
  }

  async remove(): Promise<void> {
    const s = this.store.selectedStudent();
    if (!s || !confirm('Soft-delete this student record?')) {
      return;
    }
    const ok = await this.store.deleteStudent(s.id);
    if (ok) {
      void this.router.navigate(['/school-management/academics/students/all']);
    }
  }
}
