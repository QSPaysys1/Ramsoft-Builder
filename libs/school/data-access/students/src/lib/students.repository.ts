import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { SUPABASE_CLIENT } from '@ramsoft-builder/shared/data-access/supabase';
import type {
  PromoteStudentsPayload,
  Student,
  StudentInsert,
  StudentListFilters,
  StudentListItem,
  StudentListResult,
  StudentStatus,
  StudentUpdate,
  TransferStudentPayload,
} from '@ramsoft-builder/school/models/students';
import { STUDENTS_TABLE } from './students.constants';
import { rowToListItem, rowToStudent } from './students.mapper';

function insertToRow(
  userId: string,
  admissionNumber: string,
  input: StudentInsert,
): Record<string, unknown> {
  return {
    user_id: userId,
    admission_number: admissionNumber,
    roll_number: input.rollNumber ?? null,
    middle_name: input.middleName ?? null,
    first_name: input.firstName,
    last_name: input.lastName,
    gender: input.gender ?? null,
    date_of_birth: input.dateOfBirth ?? null,
    blood_group: input.bloodGroup ?? null,
    aadhaar_number: input.aadhaarNumber ?? null,
    mobile_number: input.mobileNumber,
    email: input.email ?? null,
    photo_url: input.photoUrl ?? null,
    category: input.category ?? null,
    religion: input.religion ?? null,
    nationality: input.nationality ?? 'India',
    academic_year: input.academicYear,
    admission_date: input.admissionDate,
    class_name: input.className ?? null,
    section: input.section ?? null,
    house: input.house ?? null,
    previous_school: input.previousSchool ?? null,
    previous_percentage: input.previousPercentage ?? null,
    status: input.status ?? 'applicant',
    parent_details: input.parentDetails ?? {},
    address: input.address ?? {},
    medical: input.medical ?? {},
    remarks: input.remarks ?? null,
    admission_details: input.admissionDetails ?? {},
    updated_at: new Date().toISOString(),
  };
}

function updateToRow(input: StudentUpdate): Record<string, unknown> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.rollNumber !== undefined) row['roll_number'] = input.rollNumber;
  if (input.middleName !== undefined) row['middle_name'] = input.middleName;
  if (input.firstName !== undefined) row['first_name'] = input.firstName;
  if (input.lastName !== undefined) row['last_name'] = input.lastName;
  if (input.gender !== undefined) row['gender'] = input.gender;
  if (input.dateOfBirth !== undefined) row['date_of_birth'] = input.dateOfBirth;
  if (input.bloodGroup !== undefined) row['blood_group'] = input.bloodGroup;
  if (input.aadhaarNumber !== undefined) row['aadhaar_number'] = input.aadhaarNumber;
  if (input.mobileNumber !== undefined) row['mobile_number'] = input.mobileNumber;
  if (input.email !== undefined) row['email'] = input.email;
  if (input.photoUrl !== undefined) row['photo_url'] = input.photoUrl;
  if (input.category !== undefined) row['category'] = input.category;
  if (input.religion !== undefined) row['religion'] = input.religion;
  if (input.nationality !== undefined) row['nationality'] = input.nationality;
  if (input.academicYear !== undefined) row['academic_year'] = input.academicYear;
  if (input.admissionDate !== undefined) row['admission_date'] = input.admissionDate;
  if (input.className !== undefined) row['class_name'] = input.className;
  if (input.section !== undefined) row['section'] = input.section;
  if (input.house !== undefined) row['house'] = input.house;
  if (input.previousSchool !== undefined) {
    row['previous_school'] = input.previousSchool;
  }
  if (input.previousPercentage !== undefined) {
    row['previous_percentage'] = input.previousPercentage;
  }
  if (input.status !== undefined) row['status'] = input.status;
  if (input.parentDetails !== undefined) row['parent_details'] = input.parentDetails;
  if (input.address !== undefined) row['address'] = input.address;
  if (input.medical !== undefined) row['medical'] = input.medical;
  if (input.remarks !== undefined) row['remarks'] = input.remarks;
  if (input.admissionDetails !== undefined) {
    row['admission_details'] = input.admissionDetails;
  }
  if (input.transferDetails !== undefined) {
    row['transfer_details'] = input.transferDetails;
  }
  return row;
}

@Injectable({ providedIn: 'root' })
export class StudentsRepository {
  private readonly client = inject(SUPABASE_CLIENT);
  private readonly platformId = inject(PLATFORM_ID);

  private requireClient() {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Students data is only available in the browser.');
    }
    const c = this.client;
    if (!c) {
      throw new Error(
        'Supabase is not configured. Set environment.supabase url and anonKey.',
      );
    }
    return c;
  }

  async generateAdmissionNumber(userId: string): Promise<string> {
    const c = this.requireClient();
    const { data, error } = await c.rpc('generate_admission_number', {
      p_user_id: userId,
    });
    if (error) {
      throw error;
    }
    return String(data);
  }

  async generateTcNumber(userId: string): Promise<string> {
    const c = this.requireClient();
    const { data, error } = await c.rpc('generate_transfer_certificate_number', {
      p_user_id: userId,
    });
    if (error) {
      throw error;
    }
    return String(data);
  }

  async list(
    userId: string,
    filters: StudentListFilters,
  ): Promise<StudentListResult> {
    const c = this.requireClient();
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    let q = c
      .from(STUDENTS_TABLE)
      .select(
        'id,admission_number,roll_number,first_name,last_name,class_name,section,academic_year,gender,status,mobile_number,parent_details',
        { count: 'exact' },
      )
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        q = q.in('status', filters.status);
      } else {
        q = q.eq('status', filters.status);
      }
    }
    if (filters.className) {
      q = q.eq('class_name', filters.className);
    }
    if (filters.section) {
      q = q.eq('section', filters.section);
    }
    if (filters.academicYear) {
      q = q.eq('academic_year', filters.academicYear);
    }
    if (filters.gender) {
      q = q.eq('gender', filters.gender);
    }
    const term = filters.search?.trim();
    if (term) {
      const p = `%${term}%`;
      q = q.or(
        `first_name.ilike.${p},last_name.ilike.${p},admission_number.ilike.${p},roll_number.ilike.${p}`,
      );
    }

    const { data, error, count } = await q.range(from, to);
    if (error) {
      throw error;
    }
    return {
      rows: (data as Record<string, unknown>[]).map(rowToListItem),
      total: count ?? 0,
    };
  }

  async getById(userId: string, id: string): Promise<Student | null> {
    const c = this.requireClient();
    const { data, error } = await c
      .from(STUDENTS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) {
      throw error;
    }
    return data ? rowToStudent(data as Record<string, unknown>) : null;
  }

  async create(userId: string, input: StudentInsert): Promise<Student> {
    const c = this.requireClient();
    const admissionNumber = await this.generateAdmissionNumber(userId);
    const { data, error } = await c
      .from(STUDENTS_TABLE)
      .insert(insertToRow(userId, admissionNumber, input))
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    return rowToStudent(data as Record<string, unknown>);
  }

  async update(
    userId: string,
    id: string,
    input: StudentUpdate,
  ): Promise<Student> {
    const c = this.requireClient();
    const { data, error } = await c
      .from(STUDENTS_TABLE)
      .update(updateToRow(input))
      .eq('user_id', userId)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    return rowToStudent(data as Record<string, unknown>);
  }

  async softDelete(userId: string, id: string): Promise<void> {
    const c = this.requireClient();
    const { error } = await c
      .from(STUDENTS_TABLE)
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('id', id);
    if (error) {
      throw error;
    }
  }

  async promoteStudents(
    userId: string,
    payload: PromoteStudentsPayload,
  ): Promise<void> {
    const c = this.requireClient();
    const { error } = await c
      .from(STUDENTS_TABLE)
      .update({
        class_name: payload.nextClassName,
        section: payload.nextSection,
        academic_year: payload.academicYear,
        status: 'active' satisfies StudentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .in('id', payload.studentIds)
      .is('deleted_at', null);
    if (error) {
      throw error;
    }
  }

  async transferStudent(
    userId: string,
    payload: TransferStudentPayload,
  ): Promise<Student> {
    const tcNumber = await this.generateTcNumber(userId);
    return this.update(userId, payload.studentId, {
      status: 'transferred',
      transferDetails: {
        transferType: payload.transferType,
        transferDate: payload.transferDate,
        reason: payload.reason,
        newSchool: payload.newSchool,
        tcNumber,
      },
    });
  }

  async searchByNameOrAdmission(
    userId: string,
    term: string,
    limit = 10,
  ): Promise<StudentListItem[]> {
    const result = await this.list(userId, {
      search: term,
      page: 1,
      pageSize: limit,
    });
    return result.rows;
  }

  async distinctFilterValues(
    userId: string,
    field: 'class_name' | 'section' | 'academic_year',
  ): Promise<string[]> {
    const c = this.requireClient();
    const { data, error } = await c
      .from(STUDENTS_TABLE)
      .select(field)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .not(field, 'is', null);
    if (error) {
      throw error;
    }
    const set = new Set<string>();
    for (const row of data as Record<string, unknown>[]) {
      const v = row[field];
      if (typeof v === 'string' && v.trim()) {
        set.add(v.trim());
      }
    }
    return [...set].sort();
  }
}
