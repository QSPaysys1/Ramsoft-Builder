import type { LlmLanguage, LlmUrlSource } from '@ramsoft-builder/llm/models/api';

export type LlmEnvironment = {
  audioToTextUrl: string;
  videoToTextUrl: string;
  generateTextUrl: string;
  urlToTextUrl: string;
};

export type LlmEnvironmentConfig = Readonly<LlmEnvironment>;

export function isSupportedAudioFile(file: File): boolean {
  if (file.type.startsWith('audio/')) {
    return true;
  }
  return /\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i.test(file.name);
}

export function isSupportedVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) {
    return true;
  }
  return /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(file.name);
}

export function isLlmLanguage(value: string): value is LlmLanguage {
  return (
    value === 'English' ||
    value === 'Telugu' ||
    value === 'Hindi' ||
    value === 'Tamil' ||
    value === 'Kannada'
  );
}

export function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Best-effort guess of media kind from a URL; defaults to video (covers YouTube and most links). */
export function detectUrlSource(value: string): LlmUrlSource {
  const lower = value.toLowerCase();
  if (/\.(mp3|wav|m4a|ogg|aac|flac)(\?|#|$)/.test(lower)) {
    return 'audio';
  }
  if (
    /soundcloud\.com|spotify\.com|podcasts\.|anchor\.fm/.test(lower)
  ) {
    return 'audio';
  }
  return 'video';
}
