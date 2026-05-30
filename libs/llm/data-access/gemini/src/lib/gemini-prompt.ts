import type { GeminiLanguage, GeminiMediaKind } from './gemini.config';

const NOTES_INSTRUCTION =
  'Produce clear, well-structured notes: a one-line summary, then concise bullet points of the key ideas. Use only the provided content; do not invent facts.';

export function notesFromTextPrompt(
  text: string,
  language: GeminiLanguage,
  title?: string,
): string {
  const heading = title ? `Title: ${title}\n\n` : '';
  return (
    `Summarize and turn the following content into notes. Respond in ${language}.\n` +
    `${NOTES_INSTRUCTION}\n\n${heading}Content:\n${text}`
  );
}

export function notesFromMediaPrompt(
  kind: GeminiMediaKind,
  language: GeminiLanguage,
): string {
  return (
    `Summarize this ${kind} and turn it into notes. Respond in ${language}.\n` +
    NOTES_INSTRUCTION
  );
}

export function notesFromUrlPrompt(
  kind: GeminiMediaKind,
  language: GeminiLanguage,
): string {
  return (
    `Summarize this ${kind} and turn it into notes. Respond in ${language}.\n` +
    NOTES_INSTRUCTION
  );
}
