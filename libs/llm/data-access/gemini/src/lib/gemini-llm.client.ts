import {
  DEFAULT_GEMINI_BASE_URL,
  DEFAULT_GEMINI_MODEL,
  type GeminiConfig,
  type GeminiLanguage,
  type GeminiMediaKind,
} from './gemini.config';
import {
  notesFromMediaPrompt,
  notesFromTextPrompt,
  notesFromUrlPrompt,
} from './gemini-prompt';

interface GeminiPart {
  text?: string;
  fileData?: { fileUri: string; mimeType?: string };
  inlineData?: { mimeType: string; data: string };
}

interface GenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

interface UploadedFile {
  uri: string;
  name: string;
  mimeType: string;
  state: string;
}

export class GeminiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'GeminiError';
  }
}

/**
 * Minimal server-side Gemini client for note generation from text, YouTube URLs,
 * and uploaded audio/video. Uses global `fetch` (Node 18+).
 */
export class GeminiLlmClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config: GeminiConfig) {
    if (!config.apiKey?.trim()) {
      throw new GeminiError('Gemini API key is required.');
    }
    this.apiKey = config.apiKey.trim();
    this.model = config.model?.trim() || DEFAULT_GEMINI_MODEL;
    this.baseUrl = (config.baseUrl?.trim() || DEFAULT_GEMINI_BASE_URL).replace(
      /\/$/,
      '',
    );
  }

  async generateNotesFromText(
    text: string,
    language: GeminiLanguage,
    title?: string,
  ): Promise<string> {
    return this.generateContent([
      { text: notesFromTextPrompt(text, language, title) },
    ]);
  }

  async summarizeYoutubeUrl(
    url: string,
    language: GeminiLanguage,
    kind: GeminiMediaKind = 'video',
  ): Promise<string> {
    return this.generateContent([
      { text: notesFromUrlPrompt(kind, language) },
      { fileData: { fileUri: url, mimeType: 'video/mp4' } },
    ]);
  }

  async summarizeMedia(
    bytes: Uint8Array,
    mimeType: string,
    language: GeminiLanguage,
    kind: GeminiMediaKind,
  ): Promise<string> {
    const file = await this.uploadFile(bytes, mimeType);
    await this.waitForActive(file);
    return this.generateContent([
      { text: notesFromMediaPrompt(kind, language) },
      { fileData: { fileUri: file.uri, mimeType: file.mimeType } },
    ]);
  }

  private async generateContent(parts: GeminiPart[]): Promise<string> {
    const url =
      `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=` +
      encodeURIComponent(this.apiKey);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
    });

    if (!res.ok) {
      throw new GeminiError(await this.readError(res), res.status);
    }

    const body = (await res.json()) as GenerateContentResponse;
    const blockReason = body.promptFeedback?.blockReason;
    if (blockReason) {
      throw new GeminiError(`Request blocked by Gemini: ${blockReason}`);
    }

    const text = (body.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('')
      .trim();

    if (!text) {
      throw new GeminiError('Gemini returned an empty response.');
    }
    return text;
  }

  private async uploadFile(
    bytes: Uint8Array,
    mimeType: string,
  ): Promise<UploadedFile> {
    const startUrl =
      `${this.baseUrl}/upload/v1beta/files?key=` +
      encodeURIComponent(this.apiKey);

    const startRes = await fetch(startUrl, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(bytes.byteLength),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: 'notes-ai-upload' } }),
    });

    if (!startRes.ok) {
      throw new GeminiError(await this.readError(startRes), startRes.status);
    }

    const uploadUrl = startRes.headers.get('x-goog-upload-url');
    if (!uploadUrl) {
      throw new GeminiError('Gemini upload session did not return an upload URL.');
    }

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Length': String(bytes.byteLength),
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize',
      },
      body: bytes as unknown as BodyInit,
    });

    if (!uploadRes.ok) {
      throw new GeminiError(await this.readError(uploadRes), uploadRes.status);
    }

    const json = (await uploadRes.json()) as {
      file?: { uri?: string; name?: string; mimeType?: string; state?: string };
    };
    const file = json.file;
    if (!file?.uri || !file.name) {
      throw new GeminiError('Gemini upload did not return a file reference.');
    }
    return {
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType ?? mimeType,
      state: file.state ?? 'PROCESSING',
    };
  }

  private async waitForActive(file: UploadedFile): Promise<void> {
    if (file.state === 'ACTIVE') {
      return;
    }
    const getUrl =
      `${this.baseUrl}/v1beta/${file.name}?key=` +
      encodeURIComponent(this.apiKey);

    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.delay(2000);
      const res = await fetch(getUrl);
      if (!res.ok) {
        throw new GeminiError(await this.readError(res), res.status);
      }
      const json = (await res.json()) as { state?: string };
      const state = json.state ?? 'PROCESSING';
      if (state === 'ACTIVE') {
        return;
      }
      if (state === 'FAILED') {
        throw new GeminiError('Gemini failed to process the uploaded media.');
      }
    }
    throw new GeminiError('Timed out waiting for Gemini to process the media.');
  }

  private async readError(res: Response): Promise<string> {
    try {
      const body = (await res.json()) as {
        error?: { message?: string };
      };
      if (body?.error?.message) {
        return body.error.message;
      }
    } catch {
      // ignore parse failure
    }
    return `Gemini API error (HTTP ${res.status}).`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
