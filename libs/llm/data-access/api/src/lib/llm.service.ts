import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import type {
  GenerateTextPayload,
  LlmLanguage,
  LlmTextResponse,
  UrlToTextPayload,
} from '@ramsoft-builder/llm/models/api';
import { LlmApiError } from './llm-api-error';
import { LLM_API_CONFIG } from './llm-api.config';

@Injectable({ providedIn: 'root' })
export class LlmService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(LLM_API_CONFIG);

  uploadAudio(file: File, language: LlmLanguage): Observable<LlmTextResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    return this.postForm(this.config.audioToTextUrl, formData);
  }

  uploadVideo(file: File, language: LlmLanguage): Observable<LlmTextResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    return this.postForm(this.config.videoToTextUrl, formData);
  }

  generateText(payload: GenerateTextPayload): Observable<LlmTextResponse> {
    return this.http
      .post<LlmTextResponse>(this.config.generateTextUrl, payload)
      .pipe(
        map((res) => this.assertSuccess(res)),
        catchError((err: unknown) => throwError(() => this.mapHttpError(err))),
      );
  }

  extractFromUrl(payload: UrlToTextPayload): Observable<LlmTextResponse> {
    return this.http
      .post<LlmTextResponse>(this.config.urlToTextUrl, payload)
      .pipe(
        map((res) => this.assertSuccess(res)),
        catchError((err: unknown) => throwError(() => this.mapHttpError(err))),
      );
  }

  private postForm(
    url: string,
    formData: FormData,
  ): Observable<LlmTextResponse> {
    return this.http.post<LlmTextResponse>(url, formData).pipe(
      map((res) => this.assertSuccess(res)),
      catchError((err: unknown) => throwError(() => this.mapHttpError(err))),
    );
  }

  private assertSuccess(res: LlmTextResponse): LlmTextResponse {
    if (!res?.success || !res.text?.trim()) {
      throw new LlmApiError('Generation failed. Please try again.');
    }
    return res;
  }

  private mapHttpError(err: unknown): LlmApiError {
    if (err instanceof LlmApiError) {
      return err;
    }
    if (err instanceof HttpErrorResponse) {
      if (this.isHtmlErrorBody(err.error)) {
        return new LlmApiError(
          'LLM API is unavailable. The server returned HTML instead of JSON.',
          'api_error',
        );
      }
      const message =
        typeof err.error === 'object' &&
        err.error !== null &&
        'message' in err.error &&
        typeof (err.error as { message: unknown }).message === 'string'
          ? (err.error as { message: string }).message
          : typeof err.error === 'string' && err.error.trim()
            ? err.error
            : err.statusText || 'API error';
      return new LlmApiError(message, 'api_error');
    }
    if (err instanceof SyntaxError) {
      return new LlmApiError(
        'LLM API returned an invalid response. Check that /api/llm is configured on the server.',
        'api_error',
      );
    }
    return new LlmApiError('Generation failed. Please try again.');
  }

  private isHtmlErrorBody(body: unknown): boolean {
    return (
      typeof body === 'string' &&
      (body.trimStart().startsWith('<!DOCTYPE') ||
        body.trimStart().startsWith('<html'))
    );
  }
}
