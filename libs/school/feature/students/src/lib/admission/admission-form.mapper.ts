import type {
  StudentAdmissionDetails,
  StudentInsert,
  StudentStatus,
} from '@ramsoft-builder/school/models/students';
import type { AdmissionFormValue } from './admission-form.builder';

function mapAdmissionStatus(status: string): StudentStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'rejected':
      return 'dropped';
    default:
      return 'applicant';
  }
}

function pct(v: string): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function admissionFormToStudentInsert(
  value: AdmissionFormValue,
): StudentInsert {
  const p = value.personal!;
  const a = value.admission!;
  const parents = value.parents!;
  const addr = value.address!;
  const prev = value.previousSchool!;
  const med = value.medical!;

  const admissionDetails: StudentAdmissionDetails = {
    admission: {
      admissionType: a.admissionType,
      admissionStatus: a.admissionStatus,
      admissionCategory: a.admissionCategory,
      previousStudentId: a.previousStudentId || undefined,
      rollNumberMode: a.rollNumberMode,
    },
    personal: {
      caste: p.caste || undefined,
      subCaste: p.subCaste || undefined,
      communityCategory: p.communityCategory || undefined,
      motherTongue: p.motherTongue || undefined,
      identificationMark1: p.identificationMark1 || undefined,
      identificationMark2: p.identificationMark2 || undefined,
    },
    birthCertificate: value.birthCertificate ?? {},
    previousSchool: {
      schoolName: prev.schoolName || undefined,
      schoolCode: prev.schoolCode || undefined,
      board: prev.board || undefined,
      medium: prev.medium || undefined,
      classLastStudied: prev.classLastStudied || undefined,
      percentageOrGrade: prev.percentageOrGrade || undefined,
      tcNumber: prev.tcNumber || undefined,
      tcDate: prev.tcDate || undefined,
      reasonForLeaving: prev.reasonForLeaving || undefined,
      tcFileName: prev.tcFileName || undefined,
      marksMemoFileName: prev.marksMemoFileName || undefined,
    },
    academic: value.academic ?? {},
    transport: value.transport ?? {},
    hostel: value.hostel ?? {},
    fee: value.fee ?? {},
    bank: value.bank ?? {},
    documents: {
      ...value.documents,
      studentPhoto: p.studentPhotoFileName || value.documents?.studentPhoto,
    },
    emergency: value.emergency ?? {},
  };

  return {
    firstName: p.firstName ?? '',
    middleName: p.middleName || null,
    lastName: p.lastName ?? '',
    gender: p.gender ?? null,
    dateOfBirth: p.dateOfBirth ?? null,
    bloodGroup: med.bloodGroup || p.bloodGroup || null,
    aadhaarNumber: p.aadhaarNumber || null,
    mobileNumber: p.mobileNumber ?? '',
    email: p.email || null,
    photoUrl: null,
    category: p.communityCategory || a.admissionCategory || null,
    religion: p.religion || null,
    nationality: p.nationality || 'India',
    academicYear: a.academicYear ?? '',
    admissionDate: a.admissionDate ?? '',
    className: a.className || null,
    section: a.section || null,
    house: a.house || null,
    rollNumber:
      a.rollNumberMode === 'manual' && a.rollNumber ? a.rollNumber : null,
    previousSchool: prev.schoolName || null,
    previousPercentage: pct(prev.percentageOrGrade ?? ''),
    status: mapAdmissionStatus(a.admissionStatus ?? 'pending'),
    parentDetails: {
      father: parents.father,
      mother: parents.mother,
      guardian: {
        name: parents.guardian?.name,
        relation: parents.guardian?.relationship,
        mobileNumber: parents.guardian?.mobileNumber,
        occupation: parents.guardian?.occupation,
        address: parents.guardian?.address,
        aadhaarNumber: parents.guardian?.aadhaarNumber,
        photoFileName: parents.guardian?.photoFileName,
      },
    },
    address: {
      present: addr.present,
      permanent: addr.sameAsPresent ? addr.present : addr.permanent,
      sameAsPresent: addr.sameAsPresent,
    },
    medical: {
      bloodGroup: med.bloodGroup || undefined,
      allergies: med.allergies || undefined,
      conditions: med.conditions || undefined,
      disability: med.disability || undefined,
      doctorName: med.doctorName || undefined,
      emergencyContactPerson: med.emergencyContactPerson || undefined,
      emergencyContactNumber: med.emergencyContactNumber || undefined,
      height: med.height || undefined,
      weight: med.weight || undefined,
    },
    remarks: value.system?.remarks || null,
    admissionDetails,
  };
}
