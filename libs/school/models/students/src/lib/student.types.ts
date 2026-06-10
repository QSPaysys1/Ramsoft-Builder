import type { StudentAdmissionDetails } from './admission.types';
import type { StudentStatus } from './student-status';

export interface ParentPerson {
  name?: string;
  occupation?: string;
  mobileNumber?: string;
  email?: string;
  qualification?: string;
  annualIncome?: string;
  aadhaarNumber?: string;
  photoFileName?: string;
}

export interface GuardianDetails extends ParentPerson {
  relation?: string;
  address?: string;
}

export interface ParentDetails {
  father?: ParentPerson;
  mother?: ParentPerson;
  guardian?: GuardianDetails;
  emergencyContact?: string;
}

export interface StudentAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  district?: string;
  pincode?: string;
  country?: string;
  present?: import('./admission.types').AddressBlock;
  permanent?: import('./admission.types').AddressBlock;
  sameAsPresent?: boolean;
}

export interface StudentMedical {
  bloodGroup?: string;
  allergies?: string;
  conditions?: string;
  doctorName?: string;
  emergencyContact?: string;
  height?: string;
  weight?: string;
  disability?: string;
  emergencyContactPerson?: string;
  emergencyContactNumber?: string;
}

export interface TransferDetails {
  transferType?: string;
  transferDate?: string;
  reason?: string;
  newSchool?: string;
  tcNumber?: string;
}

export interface Student {
  id: string;
  userId: string;
  admissionNumber: string;
  rollNumber: string | null;
  middleName: string | null;
  firstName: string;
  lastName: string;
  gender: string | null;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  aadhaarNumber: string | null;
  mobileNumber: string;
  email: string | null;
  photoUrl: string | null;
  category: string | null;
  religion: string | null;
  nationality: string | null;
  academicYear: string;
  admissionDate: string;
  className: string | null;
  section: string | null;
  house: string | null;
  previousSchool: string | null;
  previousPercentage: number | null;
  status: StudentStatus;
  parentDetails: ParentDetails;
  address: StudentAddress;
  medical: StudentMedical;
  transferDetails: TransferDetails;
  remarks: string | null;
  admissionDetails: StudentAdmissionDetails;
  createdAt: string;
  updatedAt: string;
}

export interface StudentListItem {
  id: string;
  admissionNumber: string;
  rollNumber: string | null;
  middleName: string | null;
  firstName: string;
  lastName: string;
  className: string | null;
  section: string | null;
  academicYear: string;
  gender: string | null;
  status: StudentStatus;
  mobileNumber: string;
  parentDetails: ParentDetails;
}

export interface StudentListFilters {
  search?: string;
  className?: string;
  section?: string;
  academicYear?: string;
  gender?: string;
  status?: StudentStatus | StudentStatus[];
  page: number;
  pageSize: number;
}

export interface StudentListResult {
  rows: StudentListItem[];
  total: number;
}

export interface StudentInsert {
  rollNumber?: string | null;
  middleName?: string | null;
  firstName: string;
  lastName: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  aadhaarNumber?: string | null;
  mobileNumber: string;
  email?: string | null;
  photoUrl?: string | null;
  category?: string | null;
  religion?: string | null;
  nationality?: string | null;
  academicYear: string;
  admissionDate: string;
  className?: string | null;
  section?: string | null;
  house?: string | null;
  previousSchool?: string | null;
  previousPercentage?: number | null;
  status?: StudentStatus;
  parentDetails?: ParentDetails;
  address?: StudentAddress;
  medical?: StudentMedical;
  remarks?: string | null;
  admissionDetails?: StudentAdmissionDetails;
}

export type StudentUpdate = Partial<
  Omit<StudentInsert, 'admissionDate'> & {
    admissionDate: string;
    status: StudentStatus;
    transferDetails: TransferDetails;
  }
>;

export interface PromoteStudentsPayload {
  studentIds: string[];
  nextClassName: string;
  nextSection: string;
  academicYear: string;
}

export interface TransferStudentPayload {
  studentId: string;
  transferType: string;
  transferDate: string;
  reason: string;
  newSchool: string;
}
