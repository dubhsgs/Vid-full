import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const OTS_CALENDAR_URLS = [
  'https://a.pool.opentimestamps.org',
  'https://b.pool.opentimestamps.org',
  'https://c.pool.opentimestamps.org',
];

async function submitHashToOTS(hashHex: string): Promise<Uint8Array> {
  const hashBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    hashBytes[i] = parseInt(hashHex.slice(i * 2, i * 2 + 2), 16);
  }

  const header = new Uint8Array([
    0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00,
    0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94, 0x00,
  ]);

  const version = new Uint8Array([0x01]);

  const sha256Op = new Uint8Array([0x08]);

  const digestTag = new Uint8Array([0x20]);

  const calendarTag = new Uint8Array([0x83]);

  const errors: string[] = [];
  for (const calUrl of OTS_CALENDAR_URLS) {
    try {
      const submitUrl = `${calUrl}/digest`;
      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: hashBytes,
      });

      if (!response.ok) {
        errors.push(`${calUrl}: HTTP ${response.status}`);
        continue;
      }

      const calendarResponse = await response.arrayBuffer();
      const calBytes = new Uint8Array(calendarResponse);

      const calUrlBytes = new TextEncoder().encode(calUrl);
      const calUrlLen = new Uint8Array([calUrlBytes.length]);

      const otsFile = new Uint8Array(
        header.length + version.length + sha256Op.length + digestTag.length + hashBytes.length +
        calendarTag.length + calUrlLen.length + calUrlBytes.length + calBytes.length
      );

      let offset = 0;
      otsFile.set(header, offset); offset += header.length;
      otsFile.set(version, offset); offset += version.length;
      otsFile.set(sha256Op, offset); offset += sha256Op.length;
      otsFile.set(digestTag, offset); offset += digestTag.length;
      otsFile.set(hashBytes, offset); offset += hashBytes.length;
      otsFile.set(calendarTag, offset); offset += calendarTag.length;
      otsFile.set(calUrlLen, offset); offset += calUrlLen.length;
      otsFile.set(calUrlBytes, offset); offset += calUrlBytes.length;
      otsFile.set(calBytes, offset);

      return otsFile;
    } catch (err) {
      errors.push(`${calUrl}: ${err}`);
    }
  }

  throw new Error(`All OTS calendars failed: ${errors.join('; ')}`);
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

    const { friendly_id, sha256_hash } = await req.json();

    if (!friendly_id || !sha256_hash) {
      return new Response(
        JSON.stringify({ error: 'friendly_id and sha256_hash are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otsBytes = await submitHashToOTS(sha256_hash);

    const filePath = `ots/${friendly_id}.ots`;
    const { error: uploadError } = await supabase.storage
      .from('v-id-images')
      .upload(filePath, otsBytes, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      await supabase.from('v_ids').update({ ots_status: 'failed' }).eq('friendly_id', friendly_id);
      return new Response(
        JSON.stringify({ error: 'Failed to store OTS proof', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: dbError } = await supabase
      .from('v_ids')
      .update({ ots_status: 'stamped', ots_file_path: filePath })
      .eq('friendly_id', friendly_id);

    if (dbError) {
      console.error('DB update error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to update record status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otsBase64 = btoa(String.fromCharCode(...otsBytes));

    return new Response(
      JSON.stringify({ success: true, ots_status: 'stamped', ots_file_base64: otsBase64 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in ots-stamp:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
