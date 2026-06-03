import { createServiceClient, isInternalRequest } from '../_shared/auth.ts';
import { submitHashToOTS } from '../_shared/ots.ts';

const OTS_STORAGE_BUCKET = 'v-id-ots';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-VAID-Internal-Secret, X-OTS-Worker-Secret',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!isInternalRequest(req)) {
      return new Response(
        JSON.stringify({ success: false, error: 'FORBIDDEN' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServiceClient();

    const { friendly_id } = await req.json();
    const normalizedFriendlyId = String(friendly_id || '').trim().toUpperCase();

    if (!normalizedFriendlyId) {
      return new Response(
        JSON.stringify({ success: false, error: 'friendly_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: record, error: recordError } = await supabase
      .from('v_ids')
      .select('friendly_id, sha256_hash')
      .eq('friendly_id', normalizedFriendlyId)
      .maybeSingle();

    if (recordError) {
      console.error('[OTS] Failed to load record:', recordError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!record?.sha256_hash) {
      return new Response(
        JSON.stringify({ success: false, error: 'V-ID record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otsBytes = await submitHashToOTS(record.sha256_hash);
    const filePath = `ots/${normalizedFriendlyId}.ots`;

    const { error: uploadError } = await supabase.storage
      .from(OTS_STORAGE_BUCKET)
      .upload(filePath, otsBytes, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('[OTS] Storage upload error:', uploadError);
      await supabase.from('v_ids').update({ ots_status: 'failed' }).eq('friendly_id', normalizedFriendlyId);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to store OTS proof', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: dbError } = await supabase
      .from('v_ids')
      .update({ ots_status: 'stamped', ots_file_path: filePath })
      .eq('friendly_id', normalizedFriendlyId);

    if (dbError) {
      console.error('[OTS] DB update error:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update record status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otsBase64 = btoa(String.fromCharCode(...otsBytes));
    return new Response(
      JSON.stringify({ success: true, ots_status: 'stamped', ots_file_base64: otsBase64 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[OTS] Unexpected error in ots-stamp:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
