import { createServiceClient, getAuthenticatedUser, isEmailConfirmed } from '../_shared/auth.ts';

const OTS_STORAGE_BUCKET = 'v-id-ots';
const LEGACY_OTS_STORAGE_BUCKET = 'v-id-images';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
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

    const { friendly_id } = await req.json();
    const friendlyId = String(friendly_id || '').trim().toUpperCase();

    if (!friendlyId) {
      return jsonResponse({ success: false, error: 'FRIENDLY_ID_REQUIRED' }, 400);
    }

    const supabase = createServiceClient();
    const { data: record, error: recordError } = await supabase
      .from('v_ids')
      .select('friendly_id, user_id, ots_file_path')
      .eq('friendly_id', friendlyId)
      .maybeSingle();

    if (recordError) {
      console.error('[ots-download] Record query failed:', recordError);
      return jsonResponse({ success: false, error: 'DATABASE_ERROR' }, 500);
    }

    if (!record) {
      return jsonResponse({ success: false, error: 'RECORD_NOT_FOUND' }, 404);
    }

    if (record.user_id !== user.id) {
      return jsonResponse({ success: false, error: 'FORBIDDEN' }, 403);
    }

    if (!record.ots_file_path) {
      return jsonResponse({ success: false, error: 'OTS_FILE_NOT_READY' }, 404);
    }

    let { data: otsData, error: downloadError } = await supabase.storage
      .from(OTS_STORAGE_BUCKET)
      .download(record.ots_file_path);

    if (downloadError || !otsData) {
      const legacyResult = await supabase.storage
        .from(LEGACY_OTS_STORAGE_BUCKET)
        .download(record.ots_file_path);
      otsData = legacyResult.data;
      downloadError = legacyResult.error;
    }

    if (downloadError || !otsData) {
      console.warn('[ots-download] OTS file unavailable:', { friendlyId, error: downloadError?.message });
      return jsonResponse({ success: false, error: 'OTS_FILE_NOT_FOUND' }, 404);
    }

    const bytes = new Uint8Array(await otsData.arrayBuffer());
    return jsonResponse({
      success: true,
      file_name: `${friendlyId}.ots`,
      ots_file_base64: toBase64(bytes),
    });
  } catch (error) {
    console.error('[ots-download] Unexpected error:', error);
    return jsonResponse({ success: false, error: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
