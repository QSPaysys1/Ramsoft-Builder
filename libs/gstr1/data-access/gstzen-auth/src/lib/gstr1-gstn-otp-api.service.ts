import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  GstnEstablishSessionRequestBody,
  GstnGenerateOtpRequestBody,
} from './gstn-generate-otp.models';
import type {
  GstnCheckSessionRequestBody,
  GstnCheckSessionSuccessResponse,
} from './gstn-check-session.models';
import type { GstnRefreshSessionRequestBody } from './gstn-refresh-session.models';
import type { GstnRetStatusRequestBody } from './gstn-ret-status.models';
import type { GstnRettrackRequestBody } from './gstn-rettrack.models';
import type {
  Gstr1aDownloadRequestBody,
  Gstr1ResetRequestBody,
  Gstr1DownloadRequestBody,
} from './gstr1-download.models';
import type { Gstr2B2bRequestBody } from './gstr2-b2b.models';
import type { Gstr2B2baRequestBody } from './gstr2-b2ba.models';
import type { Gstr2ImpgRequestBody } from './gstr2-impg.models';
import type { Gstr22bRequestBody } from './gstr2-2b.models';
import type {
  Gstr3bAutoliabRequestBody,
  Gstr3bRetsaveRequestBody,
  Gstr3bRetsumRequestBody,
} from './gstr3b.models';
import type { Gstr2ImpgsezRequestBody } from './gstr2-impgsez.models';
import type { Gstr2TdstcsRequestBody } from './gstr2-tdstcs.models';
import type { Gstr2IsdRequestBody } from './gstr2-isd.models';
import type { Gstr2EcomaRequestBody } from './gstr2-ecoma.models';
import type { Gstr2EcomRequestBody } from './gstr2-ecom.models';
import type { Gstr2CdnaRequestBody } from './gstr2-cdna.models';
import type { Gstr2CdnRequestBody } from './gstr2-cdn.models';
import { GstnSessionApiService } from './gstn-session-api.service';
import { GstrReturnsApiService } from './gstr-returns-api.service';
import { Gstr1ApiService } from './gstr1-api.service';
import { Gstr1aApiService } from './gstr1a-api.service';
import { Gstr2ApiService } from './gstr2-api.service';
import { Gstr3bApiService } from './gstr3b-api.service';

/**
 * @deprecated Prefer domain services: {@link GstnSessionApiService}, {@link GstrReturnsApiService},
 * {@link Gstr1ApiService}, {@link Gstr1aApiService}, {@link Gstr2ApiService}, {@link Gstr3bApiService}.
 * This facade remains for backward compatibility during the GSTR library split.
 */
@Injectable({ providedIn: 'root' })
export class Gstr1GstnOtpApiService {
  private readonly gstn = inject(GstnSessionApiService);
  private readonly returns = inject(GstrReturnsApiService);
  private readonly gstr1 = inject(Gstr1ApiService);
  private readonly gstr1a = inject(Gstr1aApiService);
  private readonly gstr2 = inject(Gstr2ApiService);
  private readonly gstr3b = inject(Gstr3bApiService);

  generateOtp(body: GstnGenerateOtpRequestBody): Observable<unknown> {
    return this.gstn.generateOtp(body);
  }

  establishSession(body: GstnEstablishSessionRequestBody): Observable<unknown> {
    return this.gstn.establishSession(body);
  }

  checkGstinSession(
    body: GstnCheckSessionRequestBody,
  ): Observable<GstnCheckSessionSuccessResponse> {
    return this.gstn.checkGstinSession(body);
  }

  refreshGstinSession(body: GstnRefreshSessionRequestBody): Observable<unknown> {
    return this.gstn.refreshGstinSession(body);
  }

  getReturnStatus(body: GstnRetStatusRequestBody): Observable<unknown> {
    return this.returns.getReturnStatus(body);
  }

  viewAndTrackReturns(body: GstnRettrackRequestBody): Observable<unknown> {
    return this.returns.viewAndTrackReturns(body);
  }

  downloadGstr1Return(body: Gstr1DownloadRequestBody): Observable<unknown> {
    return this.gstr1.downloadGstr1Return(body);
  }

  downloadGstr1aReturn(body: Gstr1aDownloadRequestBody): Observable<unknown> {
    return this.gstr1a.downloadGstr1aReturn(body);
  }

  resetGstr1Proceed(body: Gstr1ResetRequestBody): Observable<unknown> {
    return this.gstr1.resetGstr1Proceed(body);
  }

  retsaveGstr1Return(body: Record<string, unknown>): Observable<unknown> {
    return this.gstr1.retsaveGstr1Return(body);
  }

  retsaveGstr1aReturn(body: Record<string, unknown>): Observable<unknown> {
    return this.gstr1a.retsaveGstr1aReturn(body);
  }

  fetchGstr2B2b(body: Gstr2B2bRequestBody): Observable<unknown> {
    return this.gstr2.fetchGstr2B2b(body);
  }

  fetchGstr2B2ba(body: Gstr2B2baRequestBody): Observable<unknown> {
    return this.gstr2.fetchGstr2B2ba(body);
  }

  fetchGstr2Cdna(body: Gstr2CdnaRequestBody): Observable<unknown> {
    return this.gstr2.fetchGstr2Cdna(body);
  }

  fetchGstr2Ecoma(body: Gstr2EcomaRequestBody): Observable<unknown> {
    return this.gstr2.fetchGstr2Ecoma(body);
  }

  fetchGstr2Ecom(body: Gstr2EcomRequestBody): Observable<unknown> {
    return this.gstr2.fetchGstr2Ecom(body);
  }

  fetchGstr2Isd(body: Gstr2IsdRequestBody): Observable<unknown> {
    return this.gstr2.fetchGstr2Isd(body);
  }

  fetchGstr2Tdstcs(body: Gstr2TdstcsRequestBody): Observable<unknown> {
    return this.gstr2.fetchGstr2Tdstcs(body);
  }

  fetchGstr2Impg(body: Gstr2ImpgRequestBody): Observable<unknown> {
    return this.gstr2.fetchGstr2Impg(body);
  }

  fetchGstr2Impgsez(body: Gstr2ImpgsezRequestBody): Observable<unknown> {
    return this.gstr2.fetchGstr2Impgsez(body);
  }

  fetchGstr22b(body: Gstr22bRequestBody): Observable<unknown> {
    return this.gstr2.fetchGstr22b(body);
  }

  fetchGstr2Cdn(body: Gstr2CdnRequestBody): Observable<unknown> {
    return this.gstr2.fetchGstr2Cdn(body);
  }

  fetchGstr3bAutoliab(body: Gstr3bAutoliabRequestBody): Observable<unknown> {
    return this.gstr3b.fetchGstr3bAutoliab(body);
  }

  retsaveGstr3bReturn(body: Gstr3bRetsaveRequestBody): Observable<unknown> {
    return this.gstr3b.retsaveGstr3bReturn(body);
  }

  fetchGstr3bRetsum(body: Gstr3bRetsumRequestBody): Observable<unknown> {
    return this.gstr3b.fetchGstr3bRetsum(body);
  }
}
