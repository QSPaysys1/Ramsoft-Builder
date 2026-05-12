import type { EinvoiceGenerateResponse } from '@ramsoft-builder/einvoice/models/nic';

export class EinvoiceEnterpriseApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'EinvoiceEnterpriseApiError';
  }
}

export function assertGstZenGenerateSuccess(
  res: EinvoiceGenerateResponse,
): EinvoiceGenerateResponse {
  const raw = res as Record<string, unknown>;
  const irn =
    res.Irn?.trim() ||
    (typeof raw['irn'] === 'string' ? (raw['irn'] as string).trim() : '');
  if (irn) {
    return { ...res, Irn: irn };
  }

  const fromList =
    res.ErrorDetails?.map((e) => e.ErrorMessage)
      .filter(Boolean)
      .join('; ') ?? '';
  const msg =
    fromList ||
    res.ErrorMessage ||
    res.message ||
    'E-invoice generation failed (no IRN in response).';

  const failed =
    res.Success === 'N' ||
    res.Success === false ||
    Boolean(res.ErrorDetails?.length) ||
    Boolean(msg);

  if (failed) {
    throw new EinvoiceEnterpriseApiError(msg, 200, res);
  }

  return res;
}
