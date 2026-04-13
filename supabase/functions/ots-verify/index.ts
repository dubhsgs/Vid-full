import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function upgradeOTSProof(otsBytes: Uint8Array, calendarUrl: string): Promise<{ upgraded: boolean; confirmed: boolean }> {
  try {
    const upgradeUrl = `${calendarUrl}/timestamp/upgrade`;
    const response = await fetch(upgradeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: otsBytes,
    });

    if (response.status === 200) {
      return { upgraded: true, confirmed: true };
    }
    if (response.status === 304) {
      return { upgraded: false, confirmed: false };
    }
    return { upgraded: false, confirmed: false };
  } catch {
    return { upgraded: false, confirmed: false };
  }
}

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

    if (record.ots_status !== 'stamped' || !record.ots_file_path) {
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

    const calendarUrls = [
      'https://a.pool.opentimestamps.org',
      'https://b.pool.opentimestamps.org',
      'https://c.pool.opentimestamps.org',
    ];

    let confirmed = false;
    let upgradedBytes: Uint8Array | null = null;

    for (const calUrl of calendarUrls) {
      const result = await upgradeOTSProof(otsBytes, calUrl);
      if (result.confirmed) {
        confirmed = true;
        break;
      }
    }

    if (confirmed) {
      await supabase
        .from('v_ids')
        .update({ ots_status: 'confirmed' })
        .eq('friendly_id', friendly_id);

      if (upgradedBytes) {
        await supabase.storage
          .from('v-id-images')
          .upload(record.ots_file_path, upgradedBytes, {
            contentType: 'application/octet-stream',
            upsert: true,
          });
      }

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
