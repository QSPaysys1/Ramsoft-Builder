export interface SchoolAdminModuleTab {
  id: string;
  label: string;
  path: string;
}

export interface SchoolAdminShellConfig {
  moduleTitle: string;
  moduleDescription: string;
  basePath: string;
  tabs: readonly SchoolAdminModuleTab[];
  showNewAdmission?: boolean;
}

export const STUDENTS_SHELL_CONFIG: SchoolAdminShellConfig = {
  moduleTitle: 'Students',
  moduleDescription: 'All students, profiles, and alumni.',
  basePath: '/school-management/academics/students',
  showNewAdmission: true,
  tabs: [
    { id: 'all', label: 'All Students', path: 'all' },
    { id: 'active', label: 'Active Students', path: 'active' },
    { id: 'inactive', label: 'Inactive Students', path: 'inactive' },
    { id: 'profiles', label: 'Student Profiles', path: 'profiles' },
    { id: 'alumni', label: 'Alumni', path: 'alumni' },
  ],
};

export const TRANSFERS_SHELL_CONFIG: SchoolAdminShellConfig = {
  moduleTitle: 'Transfers',
  moduleDescription: 'Transfer requests, certificates, and history.',
  basePath: '/school-management/academics/transfers',
  tabs: [
    { id: 'requests', label: 'Transfer Requests', path: 'requests' },
    {
      id: 'issue-tc',
      label: 'Issue Transfer Certificate (TC)',
      path: 'issue-tc',
    },
    { id: 'internal', label: 'Internal Transfers', path: 'internal' },
    { id: 'outgoing', label: 'Outgoing Transfers', path: 'outgoing' },
    { id: 'history', label: 'Transfer History', path: 'history' },
  ],
};

export const PROMOTIONS_SHELL_CONFIG: SchoolAdminShellConfig = {
  moduleTitle: 'Promotions',
  moduleDescription: 'Class, section, and year promotions.',
  basePath: '/school-management/academics/promotions',
  tabs: [
    { id: 'class-promotions', label: 'Class Promotions', path: 'class-promotions' },
    { id: 'section-changes', label: 'Section Changes', path: 'section-changes' },
    {
      id: 'academic-year',
      label: 'Academic Year Promotion',
      path: 'academic-year',
    },
    { id: 'bulk', label: 'Bulk Promotion', path: 'bulk' },
    { id: 'history', label: 'Promotion History', path: 'history' },
  ],
};
