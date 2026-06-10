export interface AdmissionInfoDetails {
  admissionType?: string;
  admissionStatus?: string;
  admissionCategory?: string;
  previousStudentId?: string;
  rollNumberMode?: 'auto' | 'manual';
}

export interface PersonalDetailsExtra {
  caste?: string;
  subCaste?: string;
  communityCategory?: string;
  motherTongue?: string;
  identificationMark1?: string;
  identificationMark2?: string;
}

export interface BirthCertificateDetails {
  certificateNumber?: string;
  placeOfBirth?: string;
  registrationDate?: string;
  certificateFileName?: string;
}

export interface ParentPersonExtended {
  name?: string;
  mobileNumber?: string;
  email?: string;
  occupation?: string;
  qualification?: string;
  annualIncome?: string;
  aadhaarNumber?: string;
  photoFileName?: string;
}

export interface AddressBlock {
  houseNo?: string;
  street?: string;
  area?: string;
  city?: string;
  mandal?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface StudentAddressExtended {
  present?: AddressBlock;
  permanent?: AddressBlock;
  sameAsPresent?: boolean;
}

export interface PreviousSchoolDetails {
  schoolName?: string;
  schoolCode?: string;
  board?: string;
  medium?: string;
  classLastStudied?: string;
  percentageOrGrade?: string;
  tcNumber?: string;
  tcDate?: string;
  reasonForLeaving?: string;
  tcFileName?: string;
  marksMemoFileName?: string;
}

export interface AcademicInfoDetails {
  medium?: string;
  secondLanguage?: string;
  thirdLanguage?: string;
  stream?: string;
  electiveSubjects?: string;
  scholarshipType?: string;
  scholarshipNumber?: string;
}

export interface TransportInfoDetails {
  transportRequired?: boolean;
  route?: string;
  stop?: string;
  pickupPoint?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverMobile?: string;
}

export interface HostelInfoDetails {
  hostelRequired?: boolean;
  hostelName?: string;
  roomNumber?: string;
  bedNumber?: string;
  wardenName?: string;
  wardenContact?: string;
}

export interface MedicalInfoExtended {
  height?: string;
  weight?: string;
  allergies?: string;
  conditions?: string;
  disability?: string;
  doctorName?: string;
  emergencyContactPerson?: string;
  emergencyContactNumber?: string;
}

export interface FeeInfoDetails {
  feeStructure?: string;
  admissionFee?: string;
  tuitionFee?: string;
  transportFee?: string;
  hostelFee?: string;
  discount?: string;
  scholarship?: string;
  concession?: string;
  totalFee?: string;
}

export interface BankInfoDetails {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
}

export interface DocumentUploads {
  studentPhoto?: string;
  aadhaarCard?: string;
  birthCertificate?: string;
  transferCertificate?: string;
  previousMarksMemo?: string;
  fatherAadhaar?: string;
  motherAadhaar?: string;
  addressProof?: string;
  casteCertificate?: string;
  incomeCertificate?: string;
  medicalCertificate?: string;
  passportCopy?: string;
}

export interface EmergencyContactDetails {
  name?: string;
  relationship?: string;
  mobileNumber?: string;
  alternateMobileNumber?: string;
  address?: string;
}

export interface StudentAdmissionDetails {
  admission?: AdmissionInfoDetails;
  personal?: PersonalDetailsExtra;
  birthCertificate?: BirthCertificateDetails;
  previousSchool?: PreviousSchoolDetails;
  academic?: AcademicInfoDetails;
  transport?: TransportInfoDetails;
  hostel?: HostelInfoDetails;
  fee?: FeeInfoDetails;
  bank?: BankInfoDetails;
  documents?: DocumentUploads;
  emergency?: EmergencyContactDetails;
}
