import { createServiceClient, isInternalRequest } from '../_shared/auth.ts';
import { submitHashToOTS } from '../_shared/ots.ts';

const OTS_STORAGE_BUCKET = 'v-id-ots';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-VAID-Internal-Secret, X-OTS-Worker-Secret',
};

interface OTSJobPayload {
  id?: string;
  friendly_id?: string;
  record?: {
    id?: string;
    friendly_id?: string;
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getJobSelector(payload: OTSJobPayload): { id?: string; friendlyId?: string } {
  return {
    id: payload.id || payload.record?.id,
    friendlyId: payload.friendly_id || payload.record?.friendly_id,
  };
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

  const supabase = createServiceClient();
  let jobId: string | null = null;
  let friendlyId: string | null = null;
  let jobAttemptCount = 0;

  try {
    const payload = await req.json() as OTSJobPayload;
    const selector = getJobSelector(payload);

    let jobQuery = supabase
      .from('ots_jobs')
      .select('id, friendly_id, status, attempt_count')
      .limit(1);

    if (selector.id) {
      jobQuery = jobQuery.eq('id', selector.id);
    } else if (selector.friendlyId) {
      jobQuery = jobQuery.eq('friendly_id', selector.friendlyId.toUpperCase());
    } else {
      jobQuery = jobQuery.eq('status', 'pending').order('created_at', { ascending: true });
    }

    const { data: jobs, error: jobError } = await jobQuery;
    if (jobError) {
      console.error('[ots-worker] Failed to load job:', jobError);
      return jsonResponse({ success: false, error: 'JOB_QUERY_FAILED' }, 500);
    }

    const job = Array.isArray(jobs) ? jobs[0] : null;
    if (!job) {
      return jsonResponse({ success: true, processed: false, reason: 'NO_JOB_FOUND' });
    }

    jobId = job.id;
    friendlyId = String(job.friendly_id || '').toUpperCase();
    jobAttemptCount = Number(job.attempt_count || 0);

    const { error: lockError } = await supabase
      .from('ots_jobs')
      .update({
        status: 'processing',
        locked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (lockError) {
      console.error('[ots-worker] Failed to lock job:', lockError);
      return jsonResponse({ success: false, error: 'JOB_LOCK_FAILED' }, 500);
    }

    const { data: record, error: recordError } = await supabase
      .from('v_ids')
      .select('friendly_id, sha256_hash')
      .eq('friendly_id', friendlyId)
      .maybeSingle();

    if (recordError || !record?.sha256_hash) {
      throw new Error(recordError?.message || 'V_ID_RECORD_NOT_FOUND');
    }

    const otsBytes = await submitHashToOTS(record.sha256_hash);
    const filePath = `ots/${friendlyId}.ots`;

    const { error: uploadError } = await supabase.storage
      .from(OTS_STORAGE_BUCKET)
      .upload(filePath, otsBytes, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`OTS_UPLOAD_FAILED: ${uploadError.message}`);
    }

    const { error: recordUpdateError } = await supabase
      .from('v_ids')
      .update({ ots_status: 'stamped', ots_file_path: filePath })
      .eq('friendly_id', friendlyId);

    if (recordUpdateError) {
      throw new Error(`V_ID_UPDATE_FAILED: ${recordUpdateError.message}`);
    }

    const { error: jobUpdateError } = await supabase
      .from('ots_jobs')
      .update({
        status: 'stamped',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', jobId);

    if (jobUpdateError) {
      throw new Error(`JOB_UPDATE_FAILED: ${jobUpdateError.message}`);
    }

    return jsonResponse({ success: true, processed: true, friendly_id: friendlyId, ots_status: 'stamped' });
  } catch (error) {
    console.error('[ots-worker] Unexpected processing error:', error);

    if (jobId) {
      await supabase
        .from('ots_jobs')
        .update({
          status: 'failed',
          attempt_count: jobAttemptCount + 1,
          last_error: String(error),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    }

    if (friendlyId) {
      await supabase.from('v_ids').update({ ots_status: 'failed' }).eq('friendly_id', friendlyId);
    }

    return jsonResponse({ success: false, error: 'OTS_WORKER_FAILED', details: String(error) }, 500);
  }
});
