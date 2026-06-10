/**
 * Cloudflare Images REST API helpers (server-only — uses a secret API token).
 *
 * Docs: https://developers.cloudflare.com/images/upload-images/upload-via-url/
 * Upload endpoint: POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/images/v1
 */

export interface CloudflareImagesConfig {
  accountId: string;
  apiToken: string;
  deliveryHash: string;
}

export interface CloudflareImageUploadResult {
  imageId: string;
  /** `public` variant delivery URL. */
  deliveryUrl: string;
  /** All variant URLs returned by Cloudflare (if any). */
  variants: string[];
}

/** Image MIME types routed to Cloudflare Images instead of R2. */
export function isImageMimeType(mime: string | undefined | null): boolean {
  return typeof mime === 'string' && mime.toLowerCase().startsWith('image/');
}

/**
 * Reads Cloudflare Images config from env. Returns `null` when not configured so
 * callers can fail gracefully.
 */
export function readCloudflareImagesConfig(): CloudflareImagesConfig | null {
  const accountId = process.env['CF_ACCOUNT_ID']?.trim();
  const apiToken = process.env['CF_IMAGES_API_TOKEN']?.trim();
  const deliveryHash = process.env['CF_IMAGES_DELIVERY_HASH']?.trim();
  if (!accountId || !apiToken || !deliveryHash) {
    return null;
  }
  return { accountId, apiToken, deliveryHash };
}

/**
 * Builds a Cloudflare Images delivery URL.
 * Pattern: `https://imagedelivery.net/{HASH}/{imageId}/{variant}`.
 */
export function getImageUrl(
  deliveryHash: string,
  imageId: string,
  variant = 'public',
): string {
  return `https://imagedelivery.net/${deliveryHash}/${imageId}/${variant}`;
}

/**
 * Uploads an image buffer to Cloudflare Images via `multipart/form-data`.
 * Returns the image id and `public` variant delivery URL.
 */
export async function uploadToCloudflareImages(
  config: CloudflareImagesConfig,
  file: Buffer,
  filename: string,
  contentType: string,
): Promise<CloudflareImageUploadResult> {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/images/v1`;

  const form = new FormData();
  const blob = new Blob([new Uint8Array(file)], {
    type: contentType || 'application/octet-stream',
  });
  form.append('file', blob, filename);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiToken}` },
    body: form,
  });

  const json = (await res.json().catch(() => null)) as
    | {
        success?: boolean;
        result?: { id?: string; variants?: string[] };
        errors?: { message?: string }[];
      }
    | null;

  if (!res.ok || !json?.success || !json.result?.id) {
    const message =
      json?.errors?.map((e) => e.message).filter(Boolean).join('; ') ||
      `Cloudflare Images upload failed (HTTP ${res.status}).`;
    throw new Error(message);
  }

  const imageId = json.result.id;
  const variants = json.result.variants ?? [];
  const deliveryUrl =
    variants.find((v) => v.endsWith('/public')) ??
    getImageUrl(config.deliveryHash, imageId, 'public');

  return { imageId, deliveryUrl, variants };
}
