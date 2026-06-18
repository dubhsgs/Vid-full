import { getAuthenticatedUser, createServiceClient, isEmailConfirmed } from '../_shared/auth.ts';
import { isSha256Hash } from '../_shared/ots.ts';
import { getR2CardsConfig, signedR2Request } from '../_shared/r2.ts';

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

interface StandardCardResult {
  previewImageUrl: string | null;
  downloadImageBase64: string | null;
  error?: string;
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

function cardPreviewUrl(friendlyId: string): string {
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/card-preview?friendly_id=${encodeURIComponent(friendlyId)}`;
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

async function renderStandardCard(
  supabase: ReturnType<typeof createServiceClient>,
  friendlyId: string
): Promise<StandardCardResult> {
  const rendererUrl = (Deno.env.get('CARD_RENDERER_URL') || '').trim();
  const rendererSecret = (Deno.env.get('CARD_RENDERER_SECRET') || '').trim();
  if (!rendererUrl || !rendererSecret) {
    console.warn('[v-id-register] Card renderer env is not configured');
    return { previewImageUrl: null, downloadImageBase64: null, error: 'CARD_RENDERER_ENV_MISSING' };
  }

  try {
    const { data: record, error: recordError } = await supabase
      .from('v_ids')
      .select('id, user_id, friendly_id, character_name, image_url, created_at')
      .eq('friendly_id', friendlyId)
      .maybeSingle();

    if (recordError || !record) {
      console.warn('[v-id-register] Card renderer record lookup failed:', recordError);
      return { previewImageUrl: null, downloadImageBase64: null, error: 'CARD_RECORD_LOOKUP_FAILED' };
    }

    if (!record.user_id || !record.image_url) {
      console.warn('[v-id-register] Card renderer record is missing user_id or image_url');
      return { previewImageUrl: null, downloadImageBase64: null, error: 'CARD_RECORD_INCOMPLETE' };
    }

    const response = await fetch(rendererUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vaid-card-renderer-secret': rendererSecret,
      },
      body: JSON.stringify({
        friendly_id: record.friendly_id,
        character_name: record.character_name,
        image_url: record.image_url,
        created_at: record.created_at,
      }),
    });

    const payload = await response.json().catch(() => null) as {
      success?: boolean;
      image_base64?: string;
      image_sha256?: string;
      preview_image_base64?: string;
      preview_image_sha256?: string;
      preview_image_mime_type?: string;
      render_version?: string;
      error?: string;
    } | null;
    if (!response.ok || !payload?.success || !payload.image_base64 || !payload.image_sha256 || !payload.preview_image_base64) {
      console.warn('[v-id-register] Card renderer failed:', response.status, payload?.error);
      return { previewImageUrl: null, downloadImageBase64: null, error: payload?.error || `CARD_RENDERER_FAILED_${response.status}` };
    }

    const previewMimeType = payload.preview_image_mime_type === 'image/png' ? 'image/png' : 'image/webp';
    const previewExtension = previewMimeType === 'image/png' ? 'png' : 'webp';
    const previewBytes = Uint8Array.from(atob(payload.preview_image_base64), (char) => char.charCodeAt(0));
    const objectPath = `cards/${record.user_id}/${record.friendly_id}.${previewExtension}`;
    const uploadRequest = await signedR2Request(getR2CardsConfig(), {
      method: 'PUT',
      key: objectPath,
      body: previewBytes,
      contentType: previewMimeType,
    });
    const uploadResponse = await fetch(uploadRequest);

    if (!uploadResponse.ok) {
      console.warn('[v-id-register] Standard card preview upload failed:', uploadResponse.status);
      return { previewImageUrl: null, downloadImageBase64: payload.image_base64, error: `CARD_PREVIEW_UPLOAD_FAILED_${uploadResponse.status}` };
    }

    const cardImageUrl = cardPreviewUrl(record.friendly_id);
    const { error: updateError } = await supabase
      .from('v_ids')
      .update({
        card_image_url: cardImageUrl,
        card_render_status: 'ready',
        card_render_version: payload.render_version || 'chrome-canvas-v1',
        card_image_sha256: payload.preview_image_sha256 || payload.image_sha256,
        card_image_generated_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    if (updateError) {
      console.warn('[v-id-register] Standard card image metadata update failed:', updateError);
      return { previewImageUrl: null, downloadImageBase64: payload.image_base64, error: 'CARD_METADATA_UPDATE_FAILED' };
    }

    return {
      previewImageUrl: cardImageUrl,
      downloadImageBase64: payload.image_base64,
    };
  } catch (error) {
    console.warn('[v-id-register] Card renderer request failed:', error);
    await supabase
      .from('v_ids')
      .update({ card_render_status: 'failed' })
      .eq('friendly_id', friendlyId);
    return { previewImageUrl: null, downloadImageBase64: null, error: 'CARD_RENDER_REQUEST_FAILED' };
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
    const rendererSecret = (Deno.env.get('CARD_RENDERER_SECRET') || '').trim();
    const providedRendererSecret = (req.headers.get('x-vaid-card-renderer-secret') || '').trim();
    if (rendererSecret && providedRendererSecret === rendererSecret) {
      const supabase = createServiceClient();
      const { data: records, error: recordsError } = await supabase
        .from('v_ids')
        .select('friendly_id')
        .or('card_image_url.is.null,card_image_url.like.%/storage/v1/object/public/v-id-images/cards/%')
        .limit(1);

      if (recordsError) {
        console.error('[v-id-register] Card backfill lookup failed:', recordsError);
        return jsonResponse({ success: false, error: 'CARD_BACKFILL_LOOKUP_FAILED' }, 500);
      }

      const results = [];
      for (const record of records || []) {
        const cardResult = await renderStandardCard(supabase, record.friendly_id);
        results.push({
          friendly_id: record.friendly_id,
          success: Boolean(cardResult.previewImageUrl),
          card_image_url: cardResult.previewImageUrl,
          error: cardResult.error,
        });
      }

      return jsonResponse({
        success: true,
        processed: results.length,
        results,
      });
    }

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

      const cardResult = await renderStandardCard(supabase, result.friendly_id);

      return jsonResponse({
        success: true,
        result_status: result.result_status,
        friendly_id: result.friendly_id,
        card_image_url: cardResult.previewImageUrl,
        card_download_image_base64: cardResult.downloadImageBase64,
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
