import { createServiceClient, isInternalRequest } from '../_shared/auth.ts';
import { getR2Config, signedR2Request } from '../_shared/r2.ts';

const DEFAULT_MAX_AGE_HOURS = 24;
const DEFAULT_MAX_DELETIONS = 100;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-VAID-Internal-Secret, X-OTS-Worker-Secret',
};

interface CleanupRequest {
  max_age_hours?: number;
  max_deletions?: number;
}

interface UploadSession {
  id: string;
  object_key: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(Math.floor(parsed), max));
}

async function deleteR2Object(objectKey: string): Promise<boolean> {
  const request = await signedR2Request(getR2Config(), {
    method: 'DELETE',
    key: objectKey,
  });
  const response = await fetch(request);
  if (response.ok || response.status === 404) return true;

  console.warn('[evidence-cleanup] Failed to delete stale R2 object:', {
    status: response.status,
    objectKey,
  });
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  if (!isInternalRequest(req)) {
    return jsonResponse({ success: false, error: 'FORBIDDEN' }, 403);
  }

  try {
    const payload = await req.json().catch(() => ({})) as CleanupRequest;
    const maxAgeHours = clampNumber(payload.max_age_hours, DEFAULT_MAX_AGE_HOURS, 1, 168);
    const maxDeletions = clampNumber(payload.max_deletions, DEFAULT_MAX_DELETIONS, 1, 500);
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();
    const supabase = createServiceClient();

    const { data: sessions, error: sessionsError } = await supabase
      .from('v_id_evidence_upload_sessions')
      .select('id, object_key')
      .eq('status', 'pending')
      .or(`expires_at.lt.${new Date().toISOString()},created_at.lt.${cutoff}`)
      .order('created_at', { ascending: true })
      .limit(maxDeletions);

    if (sessionsError) {
      console.error('[evidence-cleanup] Failed to list pending R2 upload sessions:', sessionsError);
      return jsonResponse({ success: false, error: 'LIST_SESSIONS_FAILED' }, 500);
    }

    if (!sessions || sessions.length === 0) {
      return jsonResponse({ success: true, deleted: 0 });
    }

    const deletedSessionIds: string[] = [];
    for (const session of sessions as UploadSession[]) {
      if (await deleteR2Object(session.object_key)) {
        deletedSessionIds.push(session.id);
      }
    }

    if (deletedSessionIds.length > 0) {
      const { error: updateError } = await supabase
        .from('v_id_evidence_upload_sessions')
        .update({ status: 'abandoned' })
        .in('id', deletedSessionIds);

      if (updateError) {
        console.error('[evidence-cleanup] Failed to mark stale sessions abandoned:', updateError);
        return jsonResponse({ success: false, error: 'MARK_ABANDONED_FAILED' }, 500);
      }
    }

    return jsonResponse({ success: true, deleted: deletedSessionIds.length });
  } catch (error) {
    console.error('[evidence-cleanup] Unexpected error:', error);
    return jsonResponse({ success: false, error: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
