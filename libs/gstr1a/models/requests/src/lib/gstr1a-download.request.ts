import type { Gstr1aDownloadApiName } from '@ramsoft-builder/gstr1a/models/entities';

export interface Gstr1aDownloadRequestBody {
  readonly gstin: string;
  readonly ret_period: string;
  readonly api_name: Gstr1aDownloadApiName;
}
