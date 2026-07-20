import { createServiceClient, getAuthenticatedUser, isEmailConfirmed } from '../_shared/auth.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
const ALLOWED_DOCUMENT_TYPES = new Set([
  'national_id',
  'passport',
]);

interface CreatorIdentityRegisterRequest {
  friendly_id: string;
  country_region: string;
  document_type: string;
  document_number: string;
}

function createJsonResponse(corsHeaders: Record<string, string>) {
  return (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function encodeBase64(value: Uint8Array): string {
  let binary = '';
  value.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function encryptDocumentNumber(value: string): Promise<string> {
  const encodedKey = (Deno.env.get('IDENTITY_ENCRYPTION_KEY') || '').trim();
  if (!encodedKey) {
    throw new Error('IDENTITY_ENCRYPTION_KEY_MISSING');
  }

  const keyBytes = decodeBase64(encodedKey);
  if (keyBytes.byteLength !== 32) {
    throw new Error('IDENTITY_ENCRYPTION_KEY_INVALID');
  }

  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(value)
  );

  return `v1:${encodeBase64(iv)}:${encodeBase64(new Uint8Array(ciphertext))}`;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = createCorsHeaders(req, 'POST, OPTIONS');
  const jsonResponse = createJsonResponse(corsHeaders);
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

    const body = await req.json() as CreatorIdentityRegisterRequest;
    const friendlyId = String(body.friendly_id || '').trim().toUpperCase();
    const countryRegion = String(body.country_region || '').trim().toUpperCase();
    const documentType = String(body.document_type || '').trim();
    const documentNumber = String(body.document_number || '').trim();

    if (!/^V[A-Z0-9]{2,4}-[A-Z0-9]{3,4}-[A-Z0-9]{3,4}$/.test(friendlyId)) {
      return jsonResponse({ success: false, error: 'INVALID_FRIENDLY_ID' }, 400);
    }

    if (!/^[A-Z]{2}$/.test(countryRegion)) {
      return jsonResponse({ success: false, error: 'INVALID_COUNTRY_REGION' }, 400);
    }

    if (!ALLOWED_DOCUMENT_TYPES.has(documentType)) {
      return jsonResponse({ success: false, error: 'INVALID_DOCUMENT_TYPE' }, 400);
    }

    if (documentNumber.length < 1 || documentNumber.length > 120) {
      return jsonResponse({ success: false, error: 'INVALID_DOCUMENT_NUMBER' }, 400);
    }

    const supabase = createServiceClient();
    const { data: record, error: recordError } = await supabase
      .from('v_ids')
      .select('id, friendly_id, user_id')
      .eq('friendly_id', friendlyId)
      .maybeSingle();

    if (recordError) {
      console.error('[creator-identity-register] Record lookup error:', recordError);
      return jsonResponse({ success: false, error: 'RECORD_LOOKUP_FAILED' }, 500);
    }

    if (!record) {
      return jsonResponse({ success: false, error: 'RECORD_NOT_FOUND' }, 404);
    }

    if (record.user_id !== user.id) {
      return jsonResponse({ success: false, error: 'FORBIDDEN' }, 403);
    }

    const encryptedDocumentNumber = await encryptDocumentNumber(documentNumber);
    const last4 = documentNumber.slice(-4);
    const { error: upsertError } = await supabase
      .from('v_id_creator_identity_claims')
      .upsert({
        v_id_id: record.id,
        friendly_id: record.friendly_id,
        user_id: user.id,
        country_region: countryRegion,
        document_type: documentType,
        document_number_encrypted: encryptedDocumentNumber,
        document_number_last4: last4,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'v_id_id',
      });

    if (upsertError) {
      console.error('[creator-identity-register] Upsert error:', upsertError);
      return jsonResponse({ success: false, error: 'IDENTITY_SAVE_FAILED' }, 500);
    }

    return jsonResponse({
      success: true,
      document_number_last4: last4,
    });
  } catch (error) {
    console.error('[creator-identity-register] Unexpected error:', error);
    return jsonResponse({ success: false, error: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
