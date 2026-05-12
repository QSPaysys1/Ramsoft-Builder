import { EinvoiceEnterpriseApiError } from './einvoice-enterprise-api-error';

/** Treats GSTZen HTTP 200 JSON as failure when `Success` / `ErrorDetails` indicate an error. */
export function assertGstZenGetByIrnJsonResponse(res: Record<string, unknown>): void {
  const hasErr =
    res['Success'] === 'N' ||
    res['Success'] === false ||
    (Array.isArray(res['ErrorDetails']) && (res['ErrorDetails'] as unknown[]).length > 0);
  if (!hasErr) {
    return;
  }
  const fromList =
    Array.isArray(res['ErrorDetails']) &&
    (res['ErrorDetails'] as { ErrorMessage?: string }[])
      .map((e) => e.ErrorMessage)
      .filter(Boolean)
      .join('; ');
  const msg =
    fromList ||
    (typeof res['message'] === 'string' ? res['message'] : '') ||
    (typeof res['ErrorMessage'] === 'string' ? res['ErrorMessage'] : '') ||
    'Get e-invoice by IRN failed.';
  throw new EinvoiceEnterpriseApiError(msg, 200, res);
}
