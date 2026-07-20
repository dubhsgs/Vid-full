import { createServiceClient, getAuthenticatedUser, isEmailConfirmed } from '../_shared/auth.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
import { getR2Config, presignR2PutObject } from '../_shared/r2.ts';

const MAX_EVIDENCE_FILE_BYTES = 300 * 1024 * 1024;
const MAX_EVIDENCE_MATERIALS_PER_RECORD = 3;
const UPLOAD_EXPIRES_SECONDS = 15 * 60;
const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
]);

interface EvidenceUploadInitRequest {
  friendly_id: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
}

function createJsonResponse(corsHeaders: Record<string, string>) {
  return (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeFriendlyId(value: string): string {
  return value.trim().toUpperCase();
}

function sanitizeFileName(value: string): string {
  const trimmed = value.trim().replace(/[/\\]/g, '').replace(/\s+/g, ' ');
  return trimmed.slice(0, 240) || 'evidence-material';
}

function isValidFileSize(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= MAX_EVIDENCE_FILE_BYTES;
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

    const body = await req.json() as EvidenceUploadInitRequest;
    const friendlyId = normalizeFriendlyId(String(body.friendly_id || ''));
    const fileName = sanitizeFileName(String(body.file_name || 'evidence-material'));
    const mimeType = String(body.mime_type || '').trim().toLowerCase();
    const fileSizeBytes = Number(body.file_size_bytes);

    if (!friendlyId) {
      return jsonResponse({ success: false, error: 'FRIENDLY_ID_REQUIRED' }, 400);
    }

    if (!ALLOWED_EVIDENCE_MIME_TYPES.has(mimeType)) {
      return jsonResponse({ success: false, error: 'INVALID_MATERIAL_FILE_TYPE' }, 400);
    }

    if (!isValidFileSize(fileSizeBytes)) {
      return jsonResponse({ success: false, error: 'INVALID_MATERIAL_FILE_SIZE' }, 400);
    }

    const supabase = createServiceClient();
    const { data: vIdRecord, error: vIdError } = await supabase
      .from('v_ids')
      .select('id, friendly_id, user_id')
      .eq('friendly_id', friendlyId)
      .maybeSingle();

    if (vIdError) {
      console.error('[evidence-upload-init] v_id lookup error:', vIdError);
      return jsonResponse({ success: false, error: 'RECORD_LOOKUP_FAILED' }, 500);
    }

    if (!vIdRecord) {
      return jsonResponse({ success: false, error: 'RECORD_NOT_FOUND' }, 404);
    }

    if (vIdRecord.user_id !== user.id) {
      return jsonResponse({ success: false, error: 'FORBIDDEN' }, 403);
    }

    const { count: materialCount, error: countError } = await supabase
      .from('v_id_evidence_materials')
      .select('id', { count: 'exact', head: true })
      .eq('v_id_id', vIdRecord.id);

    if (countError) {
      console.error('[evidence-upload-init] Material count error:', countError);
      return jsonResponse({ success: false, error: 'MATERIAL_COUNT_FAILED' }, 500);
    }

    if ((materialCount || 0) >= MAX_EVIDENCE_MATERIALS_PER_RECORD) {
      return jsonResponse({ success: false, error: 'MATERIAL_LIMIT_REACHED' }, 409);
    }

    const sessionId = crypto.randomUUID();
    const objectKey = `evidence/${user.id}/${sessionId}/${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + UPLOAD_EXPIRES_SECONDS * 1000).toISOString();

    const { data: session, error: sessionError } = await supabase
      .from('v_id_evidence_upload_sessions')
      .insert({
        id: sessionId,
        v_id_id: vIdRecord.id,
        friendly_id: vIdRecord.friendly_id,
        user_id: user.id,
        object_key: objectKey,
        file_name: fileName,
        declared_mime_type: mimeType,
        declared_size_bytes: fileSizeBytes,
        expires_at: expiresAt,
      })
      .select('id, object_key, expires_at')
      .single();

    if (sessionError || !session) {
      console.error('[evidence-upload-init] Session insert error:', sessionError);
      return jsonResponse({ success: false, error: 'UPLOAD_SESSION_CREATE_FAILED' }, 500);
    }

    const uploadUrl = await presignR2PutObject(getR2Config(), {
      key: objectKey,
      expiresSeconds: UPLOAD_EXPIRES_SECONDS,
    });

    return jsonResponse({
      success: true,
      upload: {
        session_id: session.id,
        upload_url: uploadUrl,
        object_key: session.object_key,
        expires_at: session.expires_at,
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
        },
      },
    });
  } catch (error) {
    console.error('[evidence-upload-init] Unexpected error:', error);
    return jsonResponse({ success: false, error: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
