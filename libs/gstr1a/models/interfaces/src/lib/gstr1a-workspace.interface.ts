import type { Gstr1aDownloadApiName } from '@ramsoft-builder/gstr1a/models/entities';

export interface Gstr1aWorkspaceQueryParams {
  readonly gstin?: string;
  readonly ret_period?: string;
  readonly filing_status?: string;
  readonly api_name?: Gstr1aDownloadApiName;
}
