import type {
  ParentDetails,
  Student,
  StudentAddress,
  StudentAdmissionDetails,
  StudentListItem,
  StudentMedical,
  TransferDetails,
} from '@ramsoft-builder/school/models/students';
import type { StudentStatus } from '@ramsoft-builder/school/models/students';

function jsonObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function parentFromJson(v: unknown): ParentDetails {
  const o = jsonObj(v);
  const person = (k: string) => {
    const p = jsonObj(o[k]);
    return {
      name: typeof p['name'] === 'string' ? p['name'] : undefined,
      occupation: typeof p['occupation'] === 'string' ? p['occupation'] : undefined,
      mobileNumber:
        typeof p['mobileNumber'] === 'string' ? p['mobileNumber'] : undefined,
      email: typeof p['email'] === 'string' ? p['email'] : undefined,
      qualification:
        typeof p['qualification'] === 'string' ? p['qualification'] : undefined,
      annualIncome:
        typeof p['annualIncome'] === 'string' ? p['annualIncome'] : undefined,
      aadhaarNumber:
        typeof p['aadhaarNumber'] === 'string' ? p['aadhaarNumber'] : undefined,
      photoFileName:
        typeof p['photoFileName'] === 'string' ? p['photoFileName'] : undefined,
    };
  };
  const g = jsonObj(o['guardian']);
  return {
    father: person('father'),
    mother: person('mother'),
    guardian: {
      name: typeof g['name'] === 'string' ? g['name'] : undefined,
      relation: typeof g['relation'] === 'string' ? g['relation'] : undefined,
      mobileNumber:
        typeof g['mobileNumber'] === 'string' ? g['mobileNumber'] : undefined,
      email: typeof g['email'] === 'string' ? g['email'] : undefined,
      address: typeof g['address'] === 'string' ? g['address'] : undefined,
    },
    emergencyContact:
      typeof o['emergencyContact'] === 'string' ? o['emergencyContact'] : undefined,
  };
}

function addressFromJson(v: unknown): StudentAddress {
  const o = jsonObj(v);
  const block = (key: string) => {
    const b = jsonObj(o[key]);
    return Object.keys(b).length ? (b as StudentAddress['present']) : undefined;
  };
  return {
    line1: typeof o['line1'] === 'string' ? o['line1'] : undefined,
    line2: typeof o['line2'] === 'string' ? o['line2'] : undefined,
    city: typeof o['city'] === 'string' ? o['city'] : undefined,
    state: typeof o['state'] === 'string' ? o['state'] : undefined,
    district: typeof o['district'] === 'string' ? o['district'] : undefined,
    pincode: typeof o['pincode'] === 'string' ? o['pincode'] : undefined,
    country: typeof o['country'] === 'string' ? o['country'] : undefined,
    present: block('present'),
    permanent: block('permanent'),
    sameAsPresent: o['sameAsPresent'] === true,
  };
}

function medicalFromJson(v: unknown): StudentMedical {
  const o = jsonObj(v);
  return {
    bloodGroup: typeof o['bloodGroup'] === 'string' ? o['bloodGroup'] : undefined,
    allergies: typeof o['allergies'] === 'string' ? o['allergies'] : undefined,
    conditions: typeof o['conditions'] === 'string' ? o['conditions'] : undefined,
    doctorName: typeof o['doctorName'] === 'string' ? o['doctorName'] : undefined,
    emergencyContact:
      typeof o['emergencyContact'] === 'string' ? o['emergencyContact'] : undefined,
    height: typeof o['height'] === 'string' ? o['height'] : undefined,
    weight: typeof o['weight'] === 'string' ? o['weight'] : undefined,
    disability: typeof o['disability'] === 'string' ? o['disability'] : undefined,
    emergencyContactPerson:
      typeof o['emergencyContactPerson'] === 'string'
        ? o['emergencyContactPerson']
        : undefined,
    emergencyContactNumber:
      typeof o['emergencyContactNumber'] === 'string'
        ? o['emergencyContactNumber']
        : undefined,
  };
}

function admissionDetailsFromJson(v: unknown): StudentAdmissionDetails {
  return jsonObj(v) as StudentAdmissionDetails;
}

function transferFromJson(v: unknown): TransferDetails {
  const o = jsonObj(v);
  return {
    transferType:
      typeof o['transferType'] === 'string' ? o['transferType'] : undefined,
    transferDate:
      typeof o['transferDate'] === 'string' ? o['transferDate'] : undefined,
    reason: typeof o['reason'] === 'string' ? o['reason'] : undefined,
    newSchool: typeof o['newSchool'] === 'string' ? o['newSchool'] : undefined,
    tcNumber: typeof o['tcNumber'] === 'string' ? o['tcNumber'] : undefined,
  };
}

function str(row: Record<string, unknown>, k: string): string | null {
  const v = row[k];
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function statusOf(v: unknown): StudentStatus {
  const s = typeof v === 'string' ? v : 'applicant';
  return s as StudentStatus;
}

export function rowToStudent(row: Record<string, unknown>): Student {
  const pct = row['previous_percentage'];
  return {
    id: String(row['id']),
    userId: String(row['user_id']),
    admissionNumber: String(row['admission_number'] ?? ''),
    rollNumber: str(row, 'roll_number'),
    middleName: str(row, 'middle_name'),
    firstName: String(row['first_name'] ?? ''),
    lastName: String(row['last_name'] ?? ''),
    gender: str(row, 'gender'),
    dateOfBirth: str(row, 'date_of_birth'),
    bloodGroup: str(row, 'blood_group'),
    aadhaarNumber: str(row, 'aadhaar_number'),
    mobileNumber: String(row['mobile_number'] ?? ''),
    email: str(row, 'email'),
    photoUrl: str(row, 'photo_url'),
    category: str(row, 'category'),
    religion: str(row, 'religion'),
    nationality: str(row, 'nationality'),
    academicYear: String(row['academic_year'] ?? ''),
    admissionDate: String(row['admission_date'] ?? ''),
    className: str(row, 'class_name'),
    section: str(row, 'section'),
    house: str(row, 'house'),
    previousSchool: str(row, 'previous_school'),
    previousPercentage:
      typeof pct === 'number' && Number.isFinite(pct) ? pct : Number(pct) || null,
    status: statusOf(row['status']),
    parentDetails: parentFromJson(row['parent_details']),
    address: addressFromJson(row['address']),
    medical: medicalFromJson(row['medical']),
    transferDetails: transferFromJson(row['transfer_details']),
    remarks: str(row, 'remarks'),
    admissionDetails: admissionDetailsFromJson(row['admission_details']),
    createdAt: String(row['created_at'] ?? ''),
    updatedAt: String(row['updated_at'] ?? ''),
  };
}

export function rowToListItem(row: Record<string, unknown>): StudentListItem {
  return {
    id: String(row['id']),
    admissionNumber: String(row['admission_number'] ?? ''),
    rollNumber: str(row, 'roll_number'),
    middleName: str(row, 'middle_name'),
    firstName: String(row['first_name'] ?? ''),
    lastName: String(row['last_name'] ?? ''),
    className: str(row, 'class_name'),
    section: str(row, 'section'),
    academicYear: String(row['academic_year'] ?? ''),
    gender: str(row, 'gender'),
    status: statusOf(row['status']),
    mobileNumber: String(row['mobile_number'] ?? ''),
    parentDetails: parentFromJson(row['parent_details']),
  };
}

export function studentToDbPayload(
  partial: Record<string, unknown>,
): Record<string, unknown> {
  return partial;
}
