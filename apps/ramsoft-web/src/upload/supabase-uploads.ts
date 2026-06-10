/**
 * Server-only Supabase access for the uploads table. Uses the service-role key,
 * so it MUST never be imported into browser code.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type UploadStorageType = 'cloudflare_images' | 'r2';

export interface UploadRecord {
  userId: string | null;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  storageType: UploadStorageType;
  cloudflareImageId?: string | null;
  cloudflareImageUrl?: string | null;
  r2ObjectKey?: string | null;
  r2PublicUrl?: string | null;
}

function readSupabaseUrl(): string | undefined {
  return (
    process.env['SUPABASE_URL']?.trim() ||
    process.env['NEXT_PUBLIC_SUPABASE_URL']?.trim() ||
    undefined
  );
}

let cachedClient: SupabaseClient | null = null;

/** Returns a service-role Supabase client, or `null` when not configured. */
export function getServiceRoleClient(): SupabaseClient | null {
  if (cachedClient) {
    return cachedClient;
  }
  const url = readSupabaseUrl();
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']?.trim();
  if (!url || !serviceRoleKey) {
    return null;
  }
  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

/**
 * Resolves the authenticated user id from a Supabase access token. Returns
 * `null` when the token is missing or invalid (uploads remain allowed but
 * unattributed). Verifying server-side prevents clients from spoofing user ids.
 */
export async function resolveUserIdFromToken(
  accessToken: string | undefined,
): Promise<string | null> {
  const token = accessToken?.trim();
  if (!token) {
    return null;
  }
  const client = getServiceRoleClient();
  if (!client) {
    return null;
  }
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }
  return data.user.id;
}

/** Inserts an upload record and returns the new row id. */
export async function saveUploadRecord(record: UploadRecord): Promise<string> {
  const client = getServiceRoleClient();
  if (!client) {
    throw new Error(
      'Supabase service-role client is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  const { data, error } = await client
    .from('uploads')
    .insert({
      user_id: record.userId,
      file_name: record.fileName,
      file_type: record.fileType,
      file_size: record.fileSize,
      storage_type: record.storageType,
      cloudflare_image_id: record.cloudflareImageId ?? null,
      cloudflare_image_url: record.cloudflareImageUrl ?? null,
      r2_object_key: record.r2ObjectKey ?? null,
      r2_public_url: record.r2PublicUrl ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to save upload record.');
  }
  return data.id as string;
}

/** Fetches a user's uploads, most recent first. */
export async function getUploadsByUser(userId: string): Promise<unknown[]> {
  const client = getServiceRoleClient();
  if (!client) {
    throw new Error('Supabase service-role client is not configured.');
  }
  const { data, error } = await client
    .from('uploads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}
