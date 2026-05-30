export class LlmApiError extends Error {
  constructor(
    message: string,
    readonly code: 'file_required' | 'unsupported_file' | 'api_error' = 'api_error',
  ) {
    super(message);
    this.name = 'LlmApiError';
  }
}
