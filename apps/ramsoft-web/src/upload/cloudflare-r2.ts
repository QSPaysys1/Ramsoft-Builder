/**
 * Cloudflare R2 helpers (server-only) using the S3-compatible API.
 *
 * Docs: https://developers.cloudflare.com/r2/api/s3/api/
 * Endpoint: https://{ACCOUNT_ID}.r2.cloudflarestorage.com
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

export interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Custom domain or public bucket URL used to build object URLs. */
  publicUrl: string;
}

export interface R2UploadResult {
  key: string;
  publicUrl: string;
}

/**
 * Reads R2 config from env. Returns `null` when not configured so callers can
 * fail gracefully.
 */
export function readR2Config(): R2Config | null {
  const accessKeyId = process.env['R2_ACCESS_KEY_ID']?.trim();
  const secretAccessKey = process.env['R2_SECRET_ACCESS_KEY']?.trim();
  const bucket = process.env['R2_BUCKET_NAME']?.trim();
  const publicUrl = process.env['R2_PUBLIC_URL']?.trim();
  const accountId = process.env['CF_ACCOUNT_ID']?.trim();
  const endpoint =
    process.env['R2_ENDPOINT']?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint || !publicUrl) {
    return null;
  }
  return { endpoint, accessKeyId, secretAccessKey, bucket, publicUrl };
}

/** Builds a unique object key: `uploads/{uuid}-{filename}`. */
export function buildObjectKey(filename: string): string {
  const safeName = filename.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_');
  return `uploads/${randomUUID()}-${safeName}`;
}

let cachedClient: { endpoint: string; client: S3Client } | null = null;

function getClient(config: R2Config): S3Client {
  if (cachedClient && cachedClient.endpoint === config.endpoint) {
    return cachedClient.client;
  }
  const client = new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  cachedClient = { endpoint: config.endpoint, client };
  return client;
}

/** Uploads a buffer to R2 and returns its key and public URL. */
export async function uploadToR2(
  config: R2Config,
  file: Buffer,
  key: string,
  contentType: string,
): Promise<R2UploadResult> {
  const client = getClient(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: file,
      ContentType: contentType || 'application/octet-stream',
    }),
  );

  const base = config.publicUrl.replace(/\/+$/, '');
  return { key, publicUrl: `${base}/${key}` };
}
