import type { SchoolMainMenu, SchoolMenuId } from '../models/school-menu.model';

const soon = { comingSoon: true as const };

const academicsBase = '/school-management/academics';
const studentsBase = `${academicsBase}/students`;

export const SCHOOL_MAIN_MENUS: readonly SchoolMainMenu[] = [
  {
    id: 'home',
    title: 'Home',
    purpose: 'Dashboard & analytics',
    submenus: [
      { id: 'dashboard', label: 'Dashboard', ...soon },
      { id: 'notifications', label: 'Notifications', ...soon },
      { id: 'calendar', label: 'Calendar', ...soon },
      { id: 'recent-activities', label: 'Recent Activities', ...soon },
      { id: 'analytics', label: 'Analytics', ...soon },
      { id: 'quick-actions', label: 'Quick Actions', ...soon },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    purpose: 'Fees & accounting',
    submenus: [
      { id: 'fee-management', label: 'Fee Management', ...soon },
      { id: 'fee-collection', label: 'Fee Collection', ...soon },
      { id: 'expenses', label: 'Expenses', ...soon },
      { id: 'income', label: 'Income', ...soon },
      { id: 'payroll', label: 'Payroll', ...soon },
      { id: 'scholarships', label: 'Scholarships', ...soon },
      { id: 'fine-management', label: 'Fine Management', ...soon },
      { id: 'receipts', label: 'Receipts', ...soon },
      { id: 'reports', label: 'Reports', ...soon },
    ],
  },
  {
    id: 'tax-gst',
    title: 'Tax & GST',
    purpose: 'GST filing & tax',
    submenus: [
      { id: 'gstr-1', label: 'GSTR-1', route: '/gstr1' },
      { id: 'gstr-1a', label: 'GSTR-1A', route: '/gstr1a' },
      { id: 'gstr-2a', label: 'GSTR-2A', route: '/gstr2a' },
      { id: 'gstr-2b', label: 'GSTR-2B', route: '/gstr2b' },
      { id: 'gstr-3b', label: 'GSTR-3B', route: '/gstr3b' },
      { id: 'gst-reports', label: 'GST Reports', ...soon },
      { id: 'gst-invoices', label: 'GST Invoices', route: '/e-invoice/create' },
      { id: 'tax-summary', label: 'Tax Summary', ...soon },
      { id: 'reconciliation', label: 'Reconciliation', ...soon },
      { id: 'e-invoices', label: 'E-Invoices', route: '/e-invoices/einvoiceslist' },
    ],
  },
  {
    id: 'academics',
    title: 'Academics',
    purpose: 'Students, classes & learning',
    submenus: [
      { id: 'students', label: 'Students', route: `${studentsBase}/all` },
      {
        id: 'admissions',
        label: 'Admissions',
        route: `${studentsBase}/admission/new`,
      },
      { id: 'classes-sections', label: 'Classes & Sections', ...soon },
      { id: 'subjects', label: 'Subjects', ...soon },
      { id: 'syllabus', label: 'Syllabus', ...soon },
      { id: 'homework-diary', label: 'Homework / Diary', ...soon },
      { id: 'attendance', label: 'Attendance', ...soon },
      { id: 'exams', label: 'Exams', ...soon },
      { id: 'grading', label: 'Grading', ...soon },
      { id: 'results', label: 'Results', ...soon },
      { id: 'timetable', label: 'Timetable', ...soon },
      { id: 'study-materials', label: 'Study Materials', ...soon },
      { id: 'certificates', label: 'Certificates', ...soon },
    ],
  },
  {
    id: 'administration',
    title: 'Administration',
    purpose: 'Staff & school operations',
    submenus: [
      { id: 'teachers', label: 'Teachers', ...soon },
      { id: 'staff-management', label: 'Staff Management', ...soon },
      { id: 'roles-permissions', label: 'Roles & Permissions', ...soon },
      { id: 'library', label: 'Library', ...soon },
      { id: 'transport', label: 'Transport', ...soon },
      { id: 'hostel', label: 'Hostel', ...soon },
      { id: 'inventory', label: 'Inventory', ...soon },
      { id: 'events', label: 'Events', ...soon },
      { id: 'announcements', label: 'Announcements', ...soon },
      { id: 'visitor-management', label: 'Visitor Management', ...soon },
      { id: 'id-cards', label: 'ID Cards', ...soon },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    purpose: 'System configuration',
    submenus: [
      { id: 'school-settings', label: 'School Settings', ...soon },
      { id: 'academic-years', label: 'Academic Years', ...soon },
      { id: 'grading-settings', label: 'Grading Settings', ...soon },
      { id: 'fee-settings', label: 'Fee Settings', ...soon },
      { id: 'notification-settings', label: 'Notification Settings', ...soon },
      { id: 'payment-settings', label: 'Payment Settings', ...soon },
      { id: 'sms-whatsapp', label: 'SMS / WhatsApp Setup', ...soon },
      { id: 'user-management', label: 'User Management', ...soon },
      { id: 'backup-security', label: 'Backup & Security', ...soon },
      { id: 'audit-logs', label: 'Audit Logs', ...soon },
      { id: 'integrations', label: 'Integrations', ...soon },
    ],
  },
] as const;

export const SCHOOL_MENU_IDS: readonly SchoolMenuId[] = SCHOOL_MAIN_MENUS.map(
  (m) => m.id,
);

export function getSchoolMainMenu(menuId: string): SchoolMainMenu | undefined {
  return SCHOOL_MAIN_MENUS.find((m) => m.id === menuId);
}

export function isSchoolMenuId(id: string): id is SchoolMenuId {
  return (SCHOOL_MENU_IDS as readonly string[]).includes(id);
}
