import { createServiceClient } from '../_shared/auth.ts';
import { getR2CardsConfig, signedR2Request } from '../_shared/r2.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function response(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function normalizeFriendlyId(value: string): string {
  return value.trim().toUpperCase();
}

function previewObjectKey(userId: string, friendlyId: string, cardImageUrl: string | null): string {
  const extension = cardImageUrl?.includes('.png') ? 'png' : 'webp';
  return `cards/${userId}/${friendlyId}.${extension}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return response('METHOD_NOT_ALLOWED', 405);
  }

  try {
    const friendlyId = normalizeFriendlyId(new URL(req.url).searchParams.get('friendly_id') || '');
    if (!friendlyId) {
      return response('FRIENDLY_ID_REQUIRED', 400);
    }

    const supabase = createServiceClient();
    const { data: record, error } = await supabase
      .from('v_ids')
      .select('friendly_id, user_id, card_image_url, card_render_status')
      .eq('friendly_id', friendlyId)
      .maybeSingle();

    if (error) {
      console.error('[card-preview] Record lookup failed:', error);
      return response('DATABASE_ERROR', 500);
    }

    if (!record || record.card_render_status !== 'ready' || !record.user_id) {
      return response('CARD_NOT_READY', 404);
    }

    const objectKey = previewObjectKey(record.user_id, record.friendly_id, record.card_image_url);
    const r2Request = await signedR2Request(getR2CardsConfig(), {
      method: 'GET',
      key: objectKey,
    });
    const r2Response = await fetch(r2Request);

    if (!r2Response.ok || !r2Response.body) {
      console.warn('[card-preview] R2 object unavailable:', { friendlyId, status: r2Response.status });
      return response('CARD_NOT_FOUND', 404);
    }

    const contentType = r2Response.headers.get('content-type') || (
      objectKey.endsWith('.png') ? 'image/png' : 'image/webp'
    );

    return new Response(r2Response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[card-preview] Unexpected error:', error);
    return response('INTERNAL_SERVER_ERROR', 500);
  }
});
