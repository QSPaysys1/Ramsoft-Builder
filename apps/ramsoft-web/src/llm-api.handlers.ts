import express from 'express';
import type { Express, Request, Response } from 'express';
import multer from 'multer';
import { existsSync, readFileSync } from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { resolve } from 'node:path';
import {
  GeminiError,
  GeminiLlmClient,
  type GeminiMediaKind,
} from '@ramsoft-builder/llm/data-access/gemini';

const LLM_PREFIX = '/api/llm';

/**
 * Loads `.env` (and `.env.local`) from the working directory into `process.env`
 * without overriding already-set variables. Keeps secrets like `GEMINI_API_KEY`
 * out of source. No-op when the files are absent.
 */
function loadLocalEnvFiles(): void {
  for (const file of ['.env', '.env.local']) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) {
      continue;
    }
    try {
      for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) {
          continue;
        }
        const eq = line.indexOf('=');
        if (eq === -1) {
          continue;
        }
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    } catch {
      // ignore unreadable env file
    }
  }
}

function drainRequestBody(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.on('error', reject);
    req.on('end', resolve);
    req.resume();
  });
}

function mockTranscript(label: string, language?: string): string {
  const lang = language?.trim() || 'English';
  return `[${lang}] Mock ${label} transcript — connect LLM_API_UPSTREAM to use a real backend.`;
}

function registerDevMocks(app: Express): void {
  app.post(
    `${LLM_PREFIX}/generate-text`,
    express.json({ limit: '2mb' }),
    (req: Request, res: Response) => {
      const body = req.body as {
        text?: string;
        language?: string;
        title?: string;
      };
      const text = body.text?.trim();
      if (!text) {
        res.status(400).json({
          success: false,
          message: 'Text is required.',
        });
        return;
      }
      const language = body.language?.trim() || 'English';
      const title = body.title?.trim();
      res.json({
        success: true,
        text: title
          ? `[${language}] ${title}\n\n${text}`
          : `[${language}] ${text}`,
      });
    },
  );

  app.post(`${LLM_PREFIX}/audio-to-text`, async (req, res) => {
    await drainRequestBody(req);
    const language =
      typeof req.query['language'] === 'string'
        ? req.query['language']
        : undefined;
    res.json({
      success: true,
      text: mockTranscript('audio', language),
    });
  });

  app.post(`${LLM_PREFIX}/video-to-text`, async (req, res) => {
    await drainRequestBody(req);
    const language =
      typeof req.query['language'] === 'string'
        ? req.query['language']
        : undefined;
    res.json({
      success: true,
      text: mockTranscript('video', language),
    });
  });

  app.post(
    `${LLM_PREFIX}/url-to-text`,
    express.json({ limit: '1mb' }),
    (req: Request, res: Response) => {
      const body = req.body as {
        url?: string;
        language?: string;
        source?: string;
      };
      const url = body.url?.trim();
      if (!url) {
        res.status(400).json({
          success: false,
          message: 'URL is required.',
        });
        return;
      }
      const language = body.language?.trim() || 'English';
      const source = body.source === 'audio' ? 'audio' : 'video';
      res.json({
        success: true,
        text: `[${language}] Mock ${source} transcript for ${url} — connect LLM_API_UPSTREAM to use a real backend.`,
      });
    },
  );
}

function registerGeminiHandlers(app: Express, client: GeminiLlmClient): void {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 },
  });

  const sendError = (res: Response, err: unknown): void => {
    const status = err instanceof GeminiError && err.status ? err.status : 502;
    const message =
      err instanceof Error ? err.message : 'LLM generation failed.';
    res.status(status).json({ success: false, message });
  };

  app.post(
    `${LLM_PREFIX}/generate-text`,
    express.json({ limit: '2mb' }),
    async (req: Request, res: Response) => {
      const body = req.body as {
        text?: string;
        language?: string;
        title?: string;
      };
      const text = body.text?.trim();
      if (!text) {
        res.status(400).json({ success: false, message: 'Text is required.' });
        return;
      }
      try {
        const out = await client.generateNotesFromText(
          text,
          body.language?.trim() || 'English',
          body.title?.trim() || undefined,
        );
        res.json({ success: true, text: out });
      } catch (err) {
        sendError(res, err);
      }
    },
  );

  app.post(
    `${LLM_PREFIX}/url-to-text`,
    express.json({ limit: '1mb' }),
    async (req: Request, res: Response) => {
      const body = req.body as {
        url?: string;
        language?: string;
        source?: string;
      };
      const url = body.url?.trim();
      if (!url) {
        res.status(400).json({ success: false, message: 'URL is required.' });
        return;
      }
      const kind: GeminiMediaKind = body.source === 'audio' ? 'audio' : 'video';
      try {
        const out = await client.summarizeYoutubeUrl(
          url,
          body.language?.trim() || 'English',
          kind,
        );
        res.json({ success: true, text: out });
      } catch (err) {
        sendError(res, err);
      }
    },
  );

  const mediaHandler =
    (kind: GeminiMediaKind) => async (req: Request, res: Response) => {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, message: 'File is required.' });
        return;
      }
      const language =
        (req.body as { language?: string }).language?.trim() || 'English';
      try {
        const out = await client.summarizeMedia(
          file.buffer,
          file.mimetype || (kind === 'audio' ? 'audio/mpeg' : 'video/mp4'),
          language,
          kind,
        );
        res.json({ success: true, text: out });
      } catch (err) {
        sendError(res, err);
      }
    };

  app.post(
    `${LLM_PREFIX}/audio-to-text`,
    upload.single('file'),
    mediaHandler('audio'),
  );
  app.post(
    `${LLM_PREFIX}/video-to-text`,
    upload.single('file'),
    mediaHandler('video'),
  );
}

function registerUnavailableHandler(app: Express): void {
  app.use(LLM_PREFIX, (_req, res) => {
    res.status(503).json({
      success: false,
      message: 'LLM API is not configured. Set LLM_API_UPSTREAM on the server.',
    });
  });
}

function registerUpstreamProxy(app: Express, upstream: string): void {
  const target = new URL(upstream);

  app.use(LLM_PREFIX, (req, res) => {
    const pathWithQuery = req.originalUrl.slice(LLM_PREFIX.length) || '/';
    const transport = target.protocol === 'https:' ? https : http;

    const proxyReq = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: `${target.pathname.replace(/\/$/, '')}${pathWithQuery}`,
        method: req.method,
        headers: {
          ...req.headers,
          host: target.host,
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on('error', () => {
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          message: 'LLM API upstream unavailable.',
        });
      }
    });

    req.pipe(proxyReq);
  });
}

/**
 * Register `/api/llm/**` before Angular SSR fallback so HttpClient gets JSON, not index.html.
 */
export function registerLlmApiHandlers(app: Express): void {
  loadLocalEnvFiles();

  const upstream = process.env['LLM_API_UPSTREAM']?.trim();
  if (upstream) {
    registerUpstreamProxy(app, upstream);
    return;
  }

  const geminiKey = process.env['GEMINI_API_KEY']?.trim();
  if (geminiKey) {
    registerGeminiHandlers(
      app,
      new GeminiLlmClient({
        apiKey: geminiKey,
        model: process.env['GEMINI_MODEL']?.trim() || undefined,
      }),
    );
    return;
  }

  const useDevMock =
    process.env['NODE_ENV'] !== 'production' ||
    process.env['LLM_API_MOCK'] === 'true';

  if (useDevMock) {
    registerDevMocks(app);
    return;
  }

  registerUnavailableHandler(app);
}
