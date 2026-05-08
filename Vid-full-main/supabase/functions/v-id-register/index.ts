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
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

    if (!characterName || !creatorName) {
      return jsonResponse({ success: false, error: 'NAME_REQUIRED' }, 400);
    }

    if (!isSha256Hash(sha256Hash)) {
      return jsonResponse({ success: false, error: 'INVALID_SHA256_HASH' }, 400);
    }

    if (!imageUrl) {
      return jsonResponse({ success: false, error: 'IMAGE_URL_REQUIRED' }, 400);
    }

    const supabase = createServiceClient();
    const { data: resultRows, error } = await supabase.rpc('register_v_id', {
      p_user_id: user.id,
      p_character_name: characterName,
      p_creator_name: creatorName,
      p_sha256_hash: sha256Hash,
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
  } catch (error) {
    console.error('[v-id-register] Unexpected error:', error);
    return jsonResponse({ success: false, error: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
