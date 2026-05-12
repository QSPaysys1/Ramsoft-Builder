export class EinvoiceApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'EinvoiceApiError';
  }
}
