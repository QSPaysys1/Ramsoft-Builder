export const STUDENT_STATUSES = [
  'applicant',
  'active',
  'inactive',
  'transferred',
  'alumni',
  'dropped',
] as const;

export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  applicant: 'Applicant',
  active: 'Active',
  inactive: 'Inactive',
  transferred: 'Transferred',
  alumni: 'Alumni',
  dropped: 'Dropped',
};
