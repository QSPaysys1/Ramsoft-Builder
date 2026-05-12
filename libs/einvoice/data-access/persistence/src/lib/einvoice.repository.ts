import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import type {
  EinvoiceGenerateRequest,
  EinvoiceGenerateResponse,
} from '@ramsoft-builder/einvoice/models/nic';
import { sanitizeUndefinedDeep } from '@ramsoft-builder/einvoice/utils/core';
import { SUPABASE_CLIENT } from '@ramsoft-builder/shared/data-access/supabase';

@Injectable({ providedIn: 'root' })
export class EinvoiceRepository {
  private readonly client = inject(SUPABASE_CLIENT);
  private readonly platformId = inject(PLATFORM_ID);

  async saveGenerated(
    userId: string,
    payload: EinvoiceGenerateRequest,
    response: EinvoiceGenerateResponse,
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const c = this.client;
    if (!c) {
      return;
    }
    const sortDate2 = Date.now();
    const base = sanitizeUndefinedDeep(payload) as Record<string, unknown>;
    const gst = sanitizeUndefinedDeep(response) as Record<string, unknown>;
    const { error } = await c.from('einvoices').insert({
      user_id: userId,
      base_object: base,
      gstzen_response: gst,
      sort_date_2: sortDate2,
    });
    if (error) {
      throw error;
    }
  }
}
