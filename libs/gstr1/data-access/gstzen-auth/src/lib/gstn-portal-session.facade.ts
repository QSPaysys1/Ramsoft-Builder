import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Gstr1GstnSessionEnsureService,
  type EnsureGstnPortalSessionResult,
} from './gstr1-gstn-session-ensure.service';

/**
 * Facade for GST **portal** session (distinct from GSTZen JWT in `Gstr1AuthStore`).
 * Portal session state lives on GSTZen servers; the client only triggers check/refresh/OTP flows.
 */
@Injectable({ providedIn: 'root' })
export class GstnPortalSessionFacade {
  private readonly ensure = inject(Gstr1GstnSessionEnsureService);

  /**
   * Check session, then refresh only when {@link deriveGstnCheckSessionUiOutcome} is `session_expired`.
   * Call before sensitive filing APIs when auto-refresh is enabled (optional; not wired globally yet).
   */
  ensureBeforeFiling(gstin: string): Observable<EnsureGstnPortalSessionResult> {
    return this.ensure.ensureGstnPortalSession(gstin);
  }
}
