export interface AcademicsPrimaryTab {
  id: 'students' | 'transfers' | 'promotions';
  label: string;
  path: string;
}

export const ACADEMICS_PRIMARY_TABS: readonly AcademicsPrimaryTab[] = [
  {
    id: 'students',
    label: 'Students',
    path: '/school-management/academics/students',
  },
  {
    id: 'transfers',
    label: 'Transfers',
    path: '/school-management/academics/transfers',
  },
  {
    id: 'promotions',
    label: 'Promotions',
    path: '/school-management/academics/promotions',
  },
] as const;
