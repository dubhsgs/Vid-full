import { normalizeActivationCode } from '../_shared/activationCode.ts';
import { createServiceClient, getAuthenticatedUser, isEmailConfirmed } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface LicenseKeyStatusRequest {
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
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'AUTH_REQUIRED' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!isEmailConfirmed(user)) {
      return new Response(
        JSON.stringify({ error: 'EMAIL_NOT_CONFIRMED' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createServiceClient();

    const { code }: LicenseKeyStatusRequest = await req.json();
    const normalizedCode = normalizeActivationCode(code || '');

    if (!normalizedCode) {
      return new Response(
        JSON.stringify({ error: 'Activation code is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data, error } = await supabase
      .from('license_keys')
      .select('key, pack_size, total_uses, remaining_uses, status')
      .eq('key', normalizedCode)
      .maybeSingle();

    if (error) {
      console.error('Error fetching activation code:', error);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({
          found: false,
          usable: false,
          normalized_code: normalizedCode,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        found: true,
        usable: data.status === 'active' && data.remaining_uses > 0,
        code: data.key,
        pack_size: data.pack_size,
        total_uses: data.total_uses,
        remaining_uses: data.remaining_uses,
        status: data.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error fetching activation code status:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
