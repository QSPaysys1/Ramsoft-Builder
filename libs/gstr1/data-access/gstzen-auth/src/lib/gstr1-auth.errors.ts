export class Gstr1AuthError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'Gstr1AuthError';
  }
}
