export interface GeminiConfig {
  apiKey: string;
  /** Defaults to `gemini-2.5-flash`. */
  model?: string;
  /** Defaults to the public Generative Language endpoint. */
  baseUrl?: string;
}

export type GeminiLanguage =
  | 'English'
  | 'Telugu'
  | 'Hindi'
  | 'Tamil'
  | 'Kannada'
  | string;

export type GeminiMediaKind = 'audio' | 'video';

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com';
