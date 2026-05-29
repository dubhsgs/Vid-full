import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { upgradeDetachedOTS } from '../_shared/ots.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { friendly_id } = await req.json();

    if (!friendly_id) {
      return new Response(
        JSON.stringify({ error: 'friendly_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: record, error: fetchError } = await supabase
      .from('v_ids')
      .select('friendly_id, ots_status, ots_file_path, sha256_hash')
      .eq('friendly_id', friendly_id)
      .maybeSingle();

    if (fetchError || !record) {
      return new Response(
        JSON.stringify({ error: 'Record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (record.ots_status === 'confirmed') {
      return new Response(
        JSON.stringify({ success: true, ots_status: 'confirmed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!record.ots_file_path) {
      return new Response(
        JSON.stringify({ success: true, ots_status: record.ots_status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: otsData, error: downloadError } = await supabase.storage
      .from('v-id-images')
      .download(record.ots_file_path);

    if (downloadError || !otsData) {
      return new Response(
        JSON.stringify({ success: true, ots_status: record.ots_status, note: 'Could not fetch OTS file' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otsBytes = new Uint8Array(await otsData.arrayBuffer());
    const upgraded = await upgradeDetachedOTS(otsBytes, record.sha256_hash);

    if (upgraded.changed) {
      await supabase.storage
        .from('v-id-images')
        .upload(record.ots_file_path, upgraded.upgradedBytes, {
          contentType: 'application/octet-stream',
          upsert: true,
        });
    }

    if (upgraded.confirmed) {
      await supabase
        .from('v_ids')
        .update({ ots_status: 'confirmed' })
        .eq('friendly_id', friendly_id);

      return new Response(
        JSON.stringify({ success: true, ots_status: 'confirmed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, ots_status: record.ots_status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in ots-verify:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
