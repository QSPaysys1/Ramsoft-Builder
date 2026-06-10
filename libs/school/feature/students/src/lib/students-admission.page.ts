import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { merge } from 'rxjs';
import { buildAdmissionForm } from './admission/admission-form.builder';
import { admissionFormToStudentInsert } from './admission/admission-form.mapper';
import {
  ACADEMIC_YEARS,
  ADMISSION_SECTIONS,
  BLOOD_GROUPS,
  BOARDS,
  CASTES,
  CLASS_OPTIONS,
  COMMUNITY_CATEGORIES,
  HOUSE_OPTIONS,
  INDIAN_STATES,
  MEDIUMS,
  RELIGIONS,
  SECTION_OPTIONS,
  STREAMS,
} from './admission/admission-form.options';
import { StudentsStore } from './students.store';

@Component({
  standalone: true,
  selector: 'lib-students-admission-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './students-admission.page.html',
  styleUrl: './students-admission.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsAdmissionPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(StudentsStore);

  readonly saving = signal(false);
  readonly previewAdmissionNo = 'Auto-generated on save';
  readonly fullName = signal('');
  readonly age = signal<string | null>(null);
  readonly activeSection = signal('admission');

  readonly sections = ADMISSION_SECTIONS;
  readonly academicYears = ACADEMIC_YEARS;
  readonly classOptions = CLASS_OPTIONS;
  readonly sectionOptions = SECTION_OPTIONS;
  readonly houseOptions = HOUSE_OPTIONS;
  readonly bloodGroups = BLOOD_GROUPS;
  readonly religions = RELIGIONS;
  readonly castes = CASTES;
  readonly communityCategories = COMMUNITY_CATEGORIES;
  readonly states = INDIAN_STATES;
  readonly boards = BOARDS;
  readonly mediums = MEDIUMS;
  readonly streams = STREAMS;

  readonly form = buildAdmissionForm(this.fb);

  ngOnInit(): void {
    const personal = this.form.controls.personal;
    merge(personal.valueChanges, personal.statusChanges)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateDerivedPersonal());

    this.form.controls.admission.controls.rollNumberMode.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mode) => {
        const roll = this.form.controls.admission.controls.rollNumber;
        if (mode === 'auto') {
          roll.disable();
          roll.setValue('');
        } else {
          roll.enable();
        }
      });

    this.form.controls.address.controls.sameAsPresent.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((same) => {
        const permanent = this.form.controls.address.controls.permanent;
        if (same) {
          permanent.disable();
        } else {
          permanent.enable();
        }
      });

    this.updateDerivedPersonal();
    this.form.controls.admission.controls.rollNumber.disable();
  }

  private updateDerivedPersonal(): void {
    const p = this.form.controls.personal.getRawValue();
    const parts = [p.firstName, p.middleName, p.lastName].filter(Boolean);
    this.fullName.set(parts.join(' ').trim());

    if (!p.dateOfBirth) {
      this.age.set(null);
      return;
    }
    const dob = new Date(p.dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      this.age.set(null);
      return;
    }
    const today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      years--;
    }
    this.age.set(`${years} years`);
  }

  scrollToSection(id: string): void {
    this.activeSection.set(id);
    document.getElementById(`section-${id}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  onFileSelected(controlPath: string, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    this.form.get(controlPath)?.setValue(file.name);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const input = admissionFormToStudentInsert(raw);
    this.saving.set(true);
    const created = await this.store.createStudent(input);
    this.saving.set(false);
    if (created) {
      void this.router.navigate([
        '/school-management/academics/students/profile',
        created.id,
      ]);
    }
  }
}
