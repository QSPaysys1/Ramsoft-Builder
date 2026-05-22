export const GSTR2A_RETURN_PERIOD_STORAGE_KEY = 'gstr2a-workspace-filters-v1';

export interface Gstr2aWorkspaceQueryParams {
  readonly gstin?: string;
  readonly ret_period?: string;
  readonly filing_status?: string;
}
