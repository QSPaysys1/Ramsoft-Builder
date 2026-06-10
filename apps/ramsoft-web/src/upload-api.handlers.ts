import type { Express, Request, Response } from 'express';
import multer from 'multer';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isImageMimeType,
  readCloudflareImagesConfig,
  uploadToCloudflareImages,
} from './upload/cloudflare-images';
import { buildObjectKey, readR2Config, uploadToR2 } from './upload/cloudflare-r2';
import {
  getUploadsByUser,
  resolveUserIdFromToken,
  saveUploadRecord,
} from './upload/supabase-uploads';

const UPLOAD_PREFIX = '/api/upload';

/**
 * Loads `.env` / `.env.local` into `process.env` without overriding set vars.
 * Keeps Cloudflare / Supabase service secrets out of source.
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

function readBearerToken(req: Request): string | undefined {
  const header = req.headers['authorization'];
  if (typeof header !== 'string') {
    return undefined;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || undefined;
}

/**
 * Registers `POST /api/upload` before the Angular SSR fallback so the browser
 * receives JSON (not index.html). Images go to Cloudflare Images, all other
 * files go to Cloudflare R2; metadata is persisted to Supabase.
 */
export function registerUploadApiHandlers(app: Express): void {
  loadLocalEnvFiles();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 },
  });

  app.get(UPLOAD_PREFIX, async (req: Request, res: Response) => {
    try {
      const userId = await resolveUserIdFromToken(readBearerToken(req));
      if (!userId) {
        res.json({ success: true, uploads: [] });
        return;
      }
      const uploads = await getUploadsByUser(userId);
      res.json({ success: true, uploads });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load uploads.';
      res.status(502).json({ success: false, message });
    }
  });

  app.post(UPLOAD_PREFIX, upload.single('file'), async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: 'File is required.' });
      return;
    }

    const contentType = file.mimetype || 'application/octet-stream';
    const fileName = file.originalname || 'upload';

    try {
      const userId = await resolveUserIdFromToken(readBearerToken(req));

      if (isImageMimeType(contentType)) {
        const cfg = readCloudflareImagesConfig();
        if (!cfg) {
          res.status(503).json({
            success: false,
            message:
              'Cloudflare Images is not configured. Set CF_ACCOUNT_ID, CF_IMAGES_API_TOKEN and CF_IMAGES_DELIVERY_HASH.',
          });
          return;
        }
        const result = await uploadToCloudflareImages(
          cfg,
          file.buffer,
          fileName,
          contentType,
        );
        const id = await saveUploadRecord({
          userId,
          fileName,
          fileType: contentType,
          fileSize: file.size,
          storageType: 'cloudflare_images',
          cloudflareImageId: result.imageId,
          cloudflareImageUrl: result.deliveryUrl,
        });
        res.json({
          success: true,
          id,
          url: result.deliveryUrl,
          type: 'cloudflare_images',
        });
        return;
      }

      const r2cfg = readR2Config();
      if (!r2cfg) {
        res.status(503).json({
          success: false,
          message:
            'Cloudflare R2 is not configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT (or CF_ACCOUNT_ID) and R2_PUBLIC_URL.',
        });
        return;
      }
      const key = buildObjectKey(fileName);
      const result = await uploadToR2(r2cfg, file.buffer, key, contentType);
      const id = await saveUploadRecord({
        userId,
        fileName,
        fileType: contentType,
        fileSize: file.size,
        storageType: 'r2',
        r2ObjectKey: result.key,
        r2PublicUrl: result.publicUrl,
      });
      res.json({ success: true, id, url: result.publicUrl, type: 'r2' });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Upload failed. Please try again.';
      res.status(502).json({ success: false, message });
    }
  });
}
