export type SchoolMenuId =
  | 'home'
  | 'finance'
  | 'tax-gst'
  | 'academics'
  | 'administration'
  | 'settings';

export interface SchoolSubMenu {
  id: string;
  label: string;
  route?: string;
  comingSoon?: boolean;
}

export interface SchoolSubMenuGroup {
  id: string;
  label: string;
  items: readonly SchoolSubMenu[];
}

export interface SchoolMainMenu {
  id: SchoolMenuId;
  title: string;
  purpose: string;
  submenus: readonly SchoolSubMenu[];
  submenuGroups?: readonly SchoolSubMenuGroup[];
}
