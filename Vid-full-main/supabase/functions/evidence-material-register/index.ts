import { getAuthenticatedUser, createServiceClient, isEmailConfirmed } from '../_shared/auth.ts';

const EVIDENCE_STORAGE_BUCKET = 'v-id-evidence-temp';
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

interface EvidenceRegisterRequest {
  friendly_id: string;
  material_path: string;
  file_name?: string;
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

function normalizeStoragePath(path: string): string {
  return path.trim().replace(/^\/+/, '');
}

function isOwnedEvidencePath(path: string, userId: string): boolean {
  const parts = normalizeStoragePath(path).split('/');
  return parts.length >= 3
    && parts[0] === 'evidence'
    && parts[1] === userId
    && !parts.some(part => part === '' || part === '.' || part === '..');
}

function normalizeFriendlyId(value: string): string {
  return value.trim().toUpperCase();
}

function sanitizeFileName(value: string): string {
  const trimmed = value.trim().replace(/[/\\]/g, '').replace(/\s+/g, ' ');
  return trimmed.slice(0, 240) || 'evidence-material';
}

function fileNameFromPath(path: string): string {
  return sanitizeFileName(path.split('/').pop() || 'evidence-material');
}

function getMaterialType(mimeType: string): 'video' | 'image' | 'pdf' | null {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  return null;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Blob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return bytesToHex(new Uint8Array(digest));
}

async function cleanupEvidenceFile(
  supabase: ReturnType<typeof createServiceClient>,
  materialPath: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(EVIDENCE_STORAGE_BUCKET)
    .remove([materialPath]);

  if (error) {
    console.warn('[evidence-material-register] Temporary evidence cleanup failed:', error);
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

    const body = await req.json() as EvidenceRegisterRequest;
    const friendlyId = normalizeFriendlyId(String(body.friendly_id || ''));
    const materialPath = normalizeStoragePath(String(body.material_path || ''));
    const fileName = sanitizeFileName(String(body.file_name || fileNameFromPath(materialPath)));

    if (!friendlyId) {
      return jsonResponse({ success: false, error: 'FRIENDLY_ID_REQUIRED' }, 400);
    }

    if (!materialPath || !isOwnedEvidencePath(materialPath, user.id)) {
      return jsonResponse({ success: false, error: 'INVALID_MATERIAL_PATH' }, 400);
    }

    const supabase = createServiceClient();
    try {
      const { data: vIdRecord, error: vIdError } = await supabase
        .from('v_ids')
        .select('id, friendly_id, user_id')
        .eq('friendly_id', friendlyId)
        .maybeSingle();

      if (vIdError) {
        console.error('[evidence-material-register] v_id lookup error:', vIdError);
        return jsonResponse({ success: false, error: 'RECORD_LOOKUP_FAILED' }, 500);
      }

      if (!vIdRecord) {
        return jsonResponse({ success: false, error: 'RECORD_NOT_FOUND' }, 404);
      }

      if (vIdRecord.user_id !== user.id) {
        return jsonResponse({ success: false, error: 'FORBIDDEN' }, 403);
      }

      const { data: materialFile, error: materialFileError } = await supabase.storage
        .from(EVIDENCE_STORAGE_BUCKET)
        .download(materialPath);

      if (materialFileError || !materialFile) {
        console.error('[evidence-material-register] Material download error:', materialFileError);
        return jsonResponse({ success: false, error: 'MATERIAL_FILE_NOT_FOUND' }, 400);
      }

      if (materialFile.size <= 0 || materialFile.size > MAX_EVIDENCE_FILE_BYTES) {
        return jsonResponse({ success: false, error: 'INVALID_MATERIAL_FILE_SIZE' }, 400);
      }

      if (!materialFile.type || !ALLOWED_EVIDENCE_MIME_TYPES.has(materialFile.type)) {
        return jsonResponse({ success: false, error: 'INVALID_MATERIAL_FILE_TYPE' }, 400);
      }

      const materialType = getMaterialType(materialFile.type);
      if (!materialType) {
        return jsonResponse({ success: false, error: 'INVALID_MATERIAL_TYPE' }, 400);
      }

      const verifiedSha256Hash = await sha256Blob(materialFile);

      const { data: existing, error: existingError } = await supabase
        .from('v_id_evidence_materials')
        .select('id, material_type, file_name, mime_type, file_size_bytes, sha256_hash, created_at')
        .eq('v_id_id', vIdRecord.id)
        .eq('sha256_hash', verifiedSha256Hash)
        .maybeSingle();

      if (existingError) {
        console.error('[evidence-material-register] Existing material lookup error:', existingError);
        return jsonResponse({ success: false, error: 'MATERIAL_LOOKUP_FAILED' }, 500);
      }

      if (existing) {
        return jsonResponse({
          success: true,
          result_status: 'duplicate',
          material: existing as EvidenceRecord,
        });
      }

      const { data: inserted, error: insertError } = await supabase
        .from('v_id_evidence_materials')
        .insert({
          v_id_id: vIdRecord.id,
          friendly_id: vIdRecord.friendly_id,
          user_id: user.id,
          material_type: materialType,
          file_name: fileName,
          mime_type: materialFile.type,
          file_size_bytes: materialFile.size,
          sha256_hash: verifiedSha256Hash,
        })
        .select('id, material_type, file_name, mime_type, file_size_bytes, sha256_hash, created_at')
        .single();

      if (insertError || !inserted) {
        console.error('[evidence-material-register] Insert error:', insertError);
        return jsonResponse({ success: false, error: 'MATERIAL_REGISTER_FAILED' }, 500);
      }

      return jsonResponse({
        success: true,
        result_status: 'created',
        material: inserted as EvidenceRecord,
      });
    } finally {
      await cleanupEvidenceFile(supabase, materialPath);
    }
  } catch (error) {
    console.error('[evidence-material-register] Unexpected error:', error);
    return jsonResponse({ success: false, error: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
