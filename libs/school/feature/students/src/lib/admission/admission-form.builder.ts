import { FormBuilder, ValidatorFn, Validators } from '@angular/forms';

const phone: ValidatorFn[] = [Validators.pattern(/^\d{10}$/)];

function addressGroup(fb: FormBuilder) {
  return fb.nonNullable.group({
    houseNo: [''],
    street: [''],
    area: [''],
    city: [''],
    mandal: [''],
    district: [''],
    state: [''],
    country: ['India'],
    pincode: [''],
  });
}

function parentGroup(fb: FormBuilder, nameRequired = false) {
  return fb.nonNullable.group({
    name: ['', nameRequired ? Validators.required : []],
    mobileNumber: [
      '',
      nameRequired ? [Validators.required, ...phone] : phone,
    ],
    email: [''],
    occupation: [''],
    qualification: [''],
    annualIncome: [''],
    aadhaarNumber: [''],
    photoFileName: [''],
  });
}

export function buildAdmissionForm(fb: FormBuilder) {
  const currentYear = new Date().getFullYear();
  return fb.nonNullable.group({
    admission: fb.nonNullable.group({
      admissionDate: [
        new Date().toISOString().slice(0, 10),
        Validators.required,
      ],
      academicYear: [`${currentYear}-${currentYear + 1}`, Validators.required],
      admissionType: ['new_admission', Validators.required],
      admissionStatus: ['pending', Validators.required],
      className: ['', Validators.required],
      section: [''],
      rollNumberMode: ['auto' as 'auto' | 'manual'],
      rollNumber: [''],
      house: [''],
      admissionCategory: ['regular'],
      previousStudentId: [''],
    }),
    personal: fb.nonNullable.group({
      firstName: ['', Validators.required],
      middleName: [''],
      lastName: ['', Validators.required],
      gender: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      bloodGroup: [''],
      religion: [''],
      caste: [''],
      subCaste: [''],
      communityCategory: [''],
      nationality: ['India'],
      motherTongue: [''],
      aadhaarNumber: [''],
      identificationMark1: [''],
      identificationMark2: [''],
      studentPhotoFileName: [''],
      mobileNumber: ['', [Validators.required, ...phone]],
      email: [''],
    }),
    birthCertificate: fb.nonNullable.group({
      certificateNumber: [''],
      placeOfBirth: [''],
      registrationDate: [''],
      certificateFileName: [''],
    }),
    parents: fb.nonNullable.group({
      father: parentGroup(fb, true),
      mother: parentGroup(fb),
      guardian: fb.nonNullable.group({
        name: [''],
        relationship: [''],
        mobileNumber: ['', phone],
        occupation: [''],
        address: [''],
        aadhaarNumber: [''],
        photoFileName: [''],
      }),
    }),
    address: fb.nonNullable.group({
      sameAsPresent: [false],
      present: addressGroup(fb),
      permanent: addressGroup(fb),
    }),
    previousSchool: fb.nonNullable.group({
      schoolName: [''],
      schoolCode: [''],
      board: [''],
      medium: [''],
      classLastStudied: [''],
      percentageOrGrade: [''],
      tcNumber: [''],
      tcDate: [''],
      reasonForLeaving: [''],
      tcFileName: [''],
      marksMemoFileName: [''],
    }),
    academic: fb.nonNullable.group({
      medium: [''],
      secondLanguage: [''],
      thirdLanguage: [''],
      stream: [''],
      electiveSubjects: [''],
      scholarshipType: [''],
      scholarshipNumber: [''],
    }),
    transport: fb.nonNullable.group({
      transportRequired: [false],
      route: [''],
      stop: [''],
      pickupPoint: [''],
      vehicleNumber: [''],
      driverName: [''],
      driverMobile: ['', phone],
    }),
    hostel: fb.nonNullable.group({
      hostelRequired: [false],
      hostelName: [''],
      roomNumber: [''],
      bedNumber: [''],
      wardenName: [''],
      wardenContact: ['', phone],
    }),
    medical: fb.nonNullable.group({
      bloodGroup: [''],
      height: [''],
      weight: [''],
      allergies: [''],
      conditions: [''],
      disability: [''],
      doctorName: [''],
      emergencyContactPerson: [''],
      emergencyContactNumber: ['', phone],
    }),
    fee: fb.nonNullable.group({
      feeStructure: [''],
      admissionFee: [''],
      tuitionFee: [''],
      transportFee: [''],
      hostelFee: [''],
      discount: [''],
      scholarship: [''],
      concession: [''],
      totalFee: [''],
    }),
    bank: fb.nonNullable.group({
      bankName: [''],
      accountNumber: [''],
      ifscCode: [''],
      branchName: [''],
    }),
    documents: fb.nonNullable.group({
      studentPhoto: [''],
      aadhaarCard: [''],
      birthCertificate: [''],
      transferCertificate: [''],
      previousMarksMemo: [''],
      fatherAadhaar: [''],
      motherAadhaar: [''],
      addressProof: [''],
      casteCertificate: [''],
      incomeCertificate: [''],
      medicalCertificate: [''],
      passportCopy: [''],
    }),
    emergency: fb.nonNullable.group({
      name: [''],
      relationship: [''],
      mobileNumber: ['', phone],
      alternateMobileNumber: ['', phone],
      address: [''],
    }),
    system: fb.nonNullable.group({
      remarks: [''],
    }),
  });
}

export type AdmissionFormGroup = ReturnType<typeof buildAdmissionForm>;
export type AdmissionFormValue = AdmissionFormGroup['value'];
