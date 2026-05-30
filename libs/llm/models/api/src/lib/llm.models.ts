export type LlmLanguage =
  | 'English'
  | 'Telugu'
  | 'Hindi'
  | 'Tamil'
  | 'Kannada';

export const LLM_LANGUAGES: readonly LlmLanguage[] = [
  'English',
  'Telugu',
  'Hindi',
  'Tamil',
  'Kannada',
] as const;

export interface LlmTextResponse {
  success: boolean;
  text: string;
}

export interface GenerateTextPayload {
  text: string;
  language: LlmLanguage;
  title?: string;
}

export type LlmUrlSource = 'video' | 'audio';

export interface UrlToTextPayload {
  url: string;
  language: LlmLanguage;
  source?: LlmUrlSource;
}
