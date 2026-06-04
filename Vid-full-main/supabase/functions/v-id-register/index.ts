import { getAuthenticatedUser, createServiceClient, isEmailConfirmed } from '../_shared/auth.ts';
import { isSha256Hash } from '../_shared/ots.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RegisterRequest {
  character_name: string;
  creator_name: string;
  sha256_hash: string;
  image_url: string;
  original_file_path: string;
}

const IMAGE_STORAGE_BUCKET = 'v-id-images';
const ORIGINAL_STORAGE_BUCKET = 'v-id-originals';
const MAX_ORIGINAL_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_ORIGINAL_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeStoragePath(path: string): string {
  return path.trim().replace(/^\/+/, '');
}

function isOwnedStoragePath(path: string, userId: string, folder: string): boolean {
  const parts = normalizeStoragePath(path).split('/');
  return parts.length >= 3
    && parts[0] === folder
    && parts[1] === userId
    && !parts.some(part => part === '' || part === '.' || part === '..');
}

function extractPublicStoragePath(imageUrl: string): string | null {
  try {
    const supabaseOrigin = new URL(Deno.env.get('SUPABASE_URL')!).origin;
    const parsedUrl = new URL(imageUrl);
    if (parsedUrl.origin !== supabaseOrigin) {
      return null;
    }

    const prefix = `/storage/v1/object/public/${IMAGE_STORAGE_BUCKET}/`;
    if (!parsedUrl.pathname.startsWith(prefix)) {
      return null;
    }

    return decodeURIComponent(parsedUrl.pathname.slice(prefix.length));
  } catch {
    return null;
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Blob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return bytesToHex(new Uint8Array(digest));
}

async function cleanupOriginalFile(
  supabase: ReturnType<typeof createServiceClient>,
  originalFilePath: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(ORIGINAL_STORAGE_BUCKET)
    .remove([originalFilePath]);

  if (error) {
    console.warn('[v-id-register] Original file cleanup failed:', error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ success: false, error: 'AUTH_REQUIRED' }, 401);
    }

    if (!isEmailConfirmed(user)) {
      return jsonResponse({ success: false, error: 'EMAIL_NOT_CONFIRMED' }, 403);
    }

    const body = await req.json() as RegisterRequest;
    const characterName = String(body.character_name || '').trim();
    const creatorName = String(body.creator_name || '').trim();
    const sha256Hash = String(body.sha256_hash || '').trim().toLowerCase();
    const imageUrl = String(body.image_url || '').trim();
    const originalFilePath = normalizeStoragePath(String(body.original_file_path || ''));

    if (!characterName || !creatorName) {
      return jsonResponse({ success: false, error: 'NAME_REQUIRED' }, 400);
    }

    if (!isSha256Hash(sha256Hash)) {
      return jsonResponse({ success: false, error: 'INVALID_SHA256_HASH' }, 400);
    }

    if (!imageUrl) {
      return jsonResponse({ success: false, error: 'IMAGE_URL_REQUIRED' }, 400);
    }

    const imagePath = extractPublicStoragePath(imageUrl);
    if (!imagePath || !isOwnedStoragePath(imagePath, user.id, 'avatars')) {
      return jsonResponse({ success: false, error: 'INVALID_IMAGE_URL' }, 400);
    }

    if (!originalFilePath || !isOwnedStoragePath(originalFilePath, user.id, 'originals')) {
      return jsonResponse({ success: false, error: 'INVALID_ORIGINAL_FILE_PATH' }, 400);
    }

    const supabase = createServiceClient();
    try {
      const { data: originalFile, error: originalFileError } = await supabase.storage
        .from(ORIGINAL_STORAGE_BUCKET)
        .download(originalFilePath);

      if (originalFileError || !originalFile) {
        console.error('[v-id-register] Original file download error:', originalFileError);
        return jsonResponse({ success: false, error: 'ORIGINAL_FILE_NOT_FOUND' }, 400);
      }

      if (originalFile.size <= 0 || originalFile.size > MAX_ORIGINAL_FILE_BYTES) {
        return jsonResponse({ success: false, error: 'INVALID_ORIGINAL_FILE_SIZE' }, 400);
      }

      if (originalFile.type && !ALLOWED_ORIGINAL_IMAGE_TYPES.has(originalFile.type)) {
        return jsonResponse({ success: false, error: 'INVALID_ORIGINAL_FILE_TYPE' }, 400);
      }

      const verifiedSha256Hash = await sha256Blob(originalFile);
      if (verifiedSha256Hash !== sha256Hash) {
        return jsonResponse({ success: false, error: 'ORIGINAL_HASH_MISMATCH' }, 400);
      }

      const { data: resultRows, error } = await supabase.rpc('register_v_id', {
        p_user_id: user.id,
        p_character_name: characterName,
        p_creator_name: creatorName,
        p_sha256_hash: verifiedSha256Hash,
        p_image_url: imageUrl,
      });

      if (error) {
        console.error('[v-id-register] RPC error:', error);
        const message = String(error.message || 'DATABASE_ERROR');
        const status = message.includes('EMAIL_NOT_CONFIRMED') || message.includes('AUTH_REQUIRED') ? 403
          : message.includes('INSUFFICIENT_CREDITS') ? 402
            : 500;
        return jsonResponse({ success: false, error: message }, status);
      }

      const result = Array.isArray(resultRows) ? resultRows[0] : null;
      if (!result?.friendly_id) {
        return jsonResponse({ success: false, error: 'REGISTRATION_FAILED' }, 500);
      }

      return jsonResponse({
        success: true,
        result_status: result.result_status,
        friendly_id: result.friendly_id,
        free_credits: result.free_credits,
        paid_credits: result.paid_credits,
        total_used: result.total_used,
        credit_consumed: result.credit_consumed,
      });
    } finally {
      await cleanupOriginalFile(supabase, originalFilePath);
    }
  } catch (error) {
    console.error('[v-id-register] Unexpected error:', error);
    return jsonResponse({ success: false, error: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
