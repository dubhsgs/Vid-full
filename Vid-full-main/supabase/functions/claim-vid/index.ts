import { createServiceClient, getAuthenticatedUser, isEmailConfirmed } from '../_shared/auth.ts';
import { isSha256Hash } from '../_shared/ots.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MAX_CLAIM_FILE_BYTES = 20 * 1024 * 1024;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeFriendlyId(value: FormDataEntryValue | null): string {
  return String(value || '').trim().toUpperCase();
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256File(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return bytesToHex(new Uint8Array(digest));
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

    const formData = await req.formData();
    const friendlyId = normalizeFriendlyId(formData.get('friendly_id'));
    const file = formData.get('file');

    if (!friendlyId) {
      return jsonResponse({ success: false, error: 'FRIENDLY_ID_REQUIRED' }, 400);
    }

    if (!(file instanceof File)) {
      return jsonResponse({ success: false, error: 'ORIGINAL_FILE_REQUIRED' }, 400);
    }

    if (file.size <= 0 || file.size > MAX_CLAIM_FILE_BYTES) {
      return jsonResponse({ success: false, error: 'INVALID_FILE_SIZE' }, 400);
    }

    const sha256Hash = await sha256File(file);
    if (!isSha256Hash(sha256Hash)) {
      return jsonResponse({ success: false, error: 'HASH_CALCULATION_FAILED' }, 500);
    }

    const supabase = createServiceClient();
    const { data: resultRows, error } = await supabase.rpc('claim_legacy_v_id', {
      p_user_id: user.id,
      p_friendly_id: friendlyId,
      p_sha256_hash: sha256Hash,
    });

    if (error) {
      console.error('[claim-vid] RPC error:', error);
      const message = String(error.message || 'DATABASE_ERROR');
      const status = message.includes('EMAIL_NOT_CONFIRMED') ? 403 : 500;
      return jsonResponse({ success: false, error: message }, status);
    }

    const result = Array.isArray(resultRows) ? resultRows[0] : null;
    if (!result) {
      return jsonResponse({ success: false, error: 'CLAIM_FAILED' }, 500);
    }

    return jsonResponse({
      success: Boolean(result.claimed),
      claimed: Boolean(result.claimed),
      friendly_id: result.friendly_id,
      sha256_hash: sha256Hash,
      failure_reason: result.failure_reason ?? null,
    }, result.claimed ? 200 : 409);
  } catch (error) {
    console.error('[claim-vid] Unexpected error:', error);
    return jsonResponse({ success: false, error: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
