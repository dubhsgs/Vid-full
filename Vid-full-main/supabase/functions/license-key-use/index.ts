import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { normalizeActivationCode } from '../_shared/activationCode.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface LicenseKeyUseRequest {
  code: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { code }: LicenseKeyUseRequest = await req.json();
    const normalizedCode = normalizeActivationCode(code || '');

    if (!normalizedCode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Activation code is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: resultRows, error } = await supabase.rpc('consume_license_key_use', {
      p_key: normalizedCode,
    });

    if (error) {
      console.error('Error consuming activation code:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = Array.isArray(resultRows) ? resultRows[0] : null;
    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: 'Activation code not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!result.consumed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.status === 'revoked' ? 'Activation code revoked' : 'Activation code exhausted',
          code: result.key,
          pack_size: result.pack_size,
          total_uses: result.total_uses,
          remaining_uses: result.remaining_uses,
          status: result.status,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        code: result.key,
        pack_size: result.pack_size,
        total_uses: result.total_uses,
        remaining_uses: result.remaining_uses,
        status: result.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error consuming activation code:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
