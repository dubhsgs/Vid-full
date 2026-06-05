import { createServiceClient, getAuthenticatedUser, isEmailConfirmed } from '../_shared/auth.ts';
import { getR2Config, signedR2Request } from '../_shared/r2.ts';

const MAX_EVIDENCE_FILE_BYTES = 300 * 1024 * 1024;
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EvidenceUploadCompleteRequest {
  session_id: string;
  sha256_hash: string;
}

interface EvidenceRecord {
  id: string;
  material_type: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  created_at: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeSha256Hash(value: string): string {
  return value.trim().toLowerCase();
}

function getMaterialType(mimeType: string): 'video' | 'image' | 'pdf' | null {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  return null;
}

function normalizeMimeType(value: string | null): string {
  return (value || '').split(';')[0].trim().toLowerCase();
}

async function deleteR2Object(objectKey: string): Promise<void> {
  const request = await signedR2Request(getR2Config(), {
    method: 'DELETE',
    key: objectKey,
  });
  const response = await fetch(request);
  if (!response.ok && response.status !== 404) {
    console.warn('[evidence-upload-complete] R2 delete failed:', {
      status: response.status,
      objectKey,
    });
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

    const body = await req.json() as EvidenceUploadCompleteRequest;
    const sessionId = String(body.session_id || '').trim();
    const sha256Hash = normalizeSha256Hash(String(body.sha256_hash || ''));

    if (!sessionId) {
      return jsonResponse({ success: false, error: 'SESSION_ID_REQUIRED' }, 400);
    }

    if (!/^[a-f0-9]{64}$/.test(sha256Hash)) {
      return jsonResponse({ success: false, error: 'INVALID_SHA256_HASH' }, 400);
    }

    const supabase = createServiceClient();
    const { data: session, error: sessionError } = await supabase
      .from('v_id_evidence_upload_sessions')
      .select('id, v_id_id, friendly_id, user_id, object_key, file_name, declared_mime_type, declared_size_bytes, status, expires_at')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error('[evidence-upload-complete] Session lookup error:', sessionError);
      return jsonResponse({ success: false, error: 'UPLOAD_SESSION_LOOKUP_FAILED' }, 500);
    }

    if (!session) {
      return jsonResponse({ success: false, error: 'UPLOAD_SESSION_NOT_FOUND' }, 404);
    }

    if (session.user_id !== user.id) {
      return jsonResponse({ success: false, error: 'FORBIDDEN' }, 403);
    }

    if (session.status !== 'pending') {
      return jsonResponse({ success: false, error: 'UPLOAD_SESSION_NOT_PENDING' }, 409);
    }

    if (Date.parse(session.expires_at) < Date.now()) {
      await deleteR2Object(session.object_key);
      await supabase
        .from('v_id_evidence_upload_sessions')
        .update({ status: 'abandoned' })
        .eq('id', session.id);
      return jsonResponse({ success: false, error: 'UPLOAD_SESSION_EXPIRED' }, 410);
    }

    try {
      const headRequest = await signedR2Request(getR2Config(), {
        method: 'HEAD',
        key: session.object_key,
      });
      const headResponse = await fetch(headRequest);

      if (!headResponse.ok) {
        return jsonResponse({ success: false, error: 'MATERIAL_FILE_NOT_FOUND' }, 400);
      }

      const contentLength = Number(headResponse.headers.get('content-length') || '0');
      const contentType = normalizeMimeType(headResponse.headers.get('content-type'));

      if (!Number.isFinite(contentLength) || contentLength <= 0 || contentLength > MAX_EVIDENCE_FILE_BYTES) {
        return jsonResponse({ success: false, error: 'INVALID_MATERIAL_FILE_SIZE' }, 400);
      }

      if (contentLength !== Number(session.declared_size_bytes)) {
        return jsonResponse({ success: false, error: 'MATERIAL_FILE_SIZE_MISMATCH' }, 400);
      }

      if (!ALLOWED_EVIDENCE_MIME_TYPES.has(contentType) || contentType !== session.declared_mime_type) {
        return jsonResponse({ success: false, error: 'INVALID_MATERIAL_FILE_TYPE' }, 400);
      }

      const materialType = getMaterialType(contentType);
      if (!materialType) {
        return jsonResponse({ success: false, error: 'INVALID_MATERIAL_TYPE' }, 400);
      }

      const { data: existing, error: existingError } = await supabase
        .from('v_id_evidence_materials')
        .select('id, material_type, file_name, mime_type, file_size_bytes, sha256_hash, created_at')
        .eq('v_id_id', session.v_id_id)
        .eq('sha256_hash', sha256Hash)
        .maybeSingle();

      if (existingError) {
        console.error('[evidence-upload-complete] Existing material lookup error:', existingError);
        return jsonResponse({ success: false, error: 'MATERIAL_LOOKUP_FAILED' }, 500);
      }

      if (existing) {
        await supabase
          .from('v_id_evidence_upload_sessions')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', session.id);

        return jsonResponse({
          success: true,
          result_status: 'duplicate',
          material: existing as EvidenceRecord,
        });
      }

      const { data: inserted, error: insertError } = await supabase
        .from('v_id_evidence_materials')
        .insert({
          v_id_id: session.v_id_id,
          friendly_id: session.friendly_id,
          user_id: user.id,
          material_type: materialType,
          file_name: session.file_name,
          mime_type: contentType,
          file_size_bytes: contentLength,
          sha256_hash: sha256Hash,
        })
        .select('id, material_type, file_name, mime_type, file_size_bytes, sha256_hash, created_at')
        .single();

      if (insertError || !inserted) {
        console.error('[evidence-upload-complete] Insert error:', insertError);
        return jsonResponse({ success: false, error: 'MATERIAL_REGISTER_FAILED' }, 500);
      }

      await supabase
        .from('v_id_evidence_upload_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', session.id);

      return jsonResponse({
        success: true,
        result_status: 'created',
        material: inserted as EvidenceRecord,
      });
    } finally {
      await deleteR2Object(session.object_key);
    }
  } catch (error) {
    console.error('[evidence-upload-complete] Unexpected error:', error);
    return jsonResponse({ success: false, error: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
