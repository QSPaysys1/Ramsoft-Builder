export const ACADEMIC_YEARS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => {
    const start = y - 1 + i;
    return `${start}-${start + 1}`;
  });
})();

export const CLASS_OPTIONS = [
  'Nursery',
  'LKG',
  'UKG',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
];

export const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E'];
export const HOUSE_OPTIONS = ['Red', 'Blue', 'Green', 'Yellow'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];
export const CASTES = ['General', 'OBC', 'SC', 'ST', 'Other'];
export const COMMUNITY_CATEGORIES = ['OC', 'BC', 'SC', 'ST', 'OBC'];
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Telangana',
  'Karnataka',
  'Tamil Nadu',
  'Kerala',
  'Maharashtra',
  'Delhi',
  'Other',
];
export const BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'Other'];
export const MEDIUMS = ['English', 'Telugu', 'Hindi', 'Tamil', 'Bilingual'];
export const STREAMS = ['Science', 'Commerce', 'Arts', 'General'];

export const ADMISSION_SECTIONS = [
  { id: 'admission', label: '1. Admission Information' },
  { id: 'personal', label: '2. Student Personal Information' },
  { id: 'birth', label: '3. Birth Certificate Details' },
  { id: 'parents', label: '4. Parent / Guardian Information' },
  { id: 'address', label: '5. Address Details' },
  { id: 'previousSchool', label: '6. Previous School Information' },
  { id: 'academic', label: '7. Academic Information' },
  { id: 'transport', label: '8. Transport Information' },
  { id: 'hostel', label: '9. Hostel Information' },
  { id: 'medical', label: '10. Medical Information' },
  { id: 'fee', label: '11. Fee Information' },
  { id: 'bank', label: '12. Bank Information' },
  { id: 'documents', label: '13. Document Uploads' },
  { id: 'emergency', label: '14. Emergency Contact' },
  { id: 'system', label: '15. System Fields' },
] as const;
