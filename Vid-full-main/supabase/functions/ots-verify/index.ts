import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { createCorsHeaders } from '../_shared/cors.ts';
import { isInternalRequest } from '../_shared/auth.ts';
import { upgradeDetachedOTS } from '../_shared/ots.ts';

const OTS_STORAGE_BUCKET = 'v-id-ots';
const LEGACY_OTS_STORAGE_BUCKET = 'v-id-images';

function getAcceptedPublicKeys(): Set<string> {
  const keys = new Set<string>();
  const legacyKeys = [
    Deno.env.get('SUPABASE_ANON_KEY'),
    Deno.env.get('VAID_BROWSER_PUBLIC_KEY'),
  ];

  for (const key of legacyKeys) {
    if (key?.trim()) keys.add(key.trim());
  }

  const encodedPublishableKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (encodedPublishableKeys) {
    try {
      const publishableKeys = JSON.parse(encodedPublishableKeys) as Record<string, unknown>;
      for (const key of Object.values(publishableKeys)) {
        if (typeof key === 'string' && key.trim()) keys.add(key.trim());
      }
    } catch {
      console.error('[ots-verify] SUPABASE_PUBLISHABLE_KEYS is invalid JSON');
    }
  }

  return keys;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = createCorsHeaders(
    req,
    'GET, POST, OPTIONS',
    'Content-Type, Authorization, X-Client-Info, Apikey, X-VAID-Internal-Secret, X-OTS-Worker-Secret'
  );
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const bearerToken = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const apiKey = (req.headers.get('apikey') || '').trim();
    const acceptedPublicKeys = getAcceptedPublicKeys();
    const hasValidPublicKey = acceptedPublicKeys.has(bearerToken) || acceptedPublicKeys.has(apiKey);
    if (!isInternalRequest(req) && !hasValidPublicKey) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      .select('friendly_id, ots_status, ots_file_path, sha256_hash, archive_confirmed_at')
      .eq('friendly_id', friendly_id)
      .maybeSingle();

    if (fetchError || !record) {
      return new Response(
        JSON.stringify({ error: 'Record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (record.ots_status === 'confirmed') {
      if (!record.archive_confirmed_at) {
        await supabase
          .from('v_ids')
          .update({ archive_confirmed_at: new Date().toISOString() })
          .eq('friendly_id', friendly_id)
          .is('archive_confirmed_at', null);
      }

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
      return new Response(
        JSON.stringify({ success: true, ots_status: record.ots_status, note: 'Could not fetch OTS file' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otsBytes = new Uint8Array(await otsData.arrayBuffer());
    const upgraded = await upgradeDetachedOTS(otsBytes, record.sha256_hash);

    if (upgraded.changed) {
      await supabase.storage
        .from(OTS_STORAGE_BUCKET)
        .upload(record.ots_file_path, upgraded.upgradedBytes, {
          contentType: 'application/octet-stream',
          upsert: true,
        });
    }

    if (upgraded.confirmed) {
      await supabase
        .from('v_ids')
        .update({
          ots_status: 'confirmed',
          archive_confirmed_at: new Date().toISOString(),
        })
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
