import { normalizeActivationCode } from '../_shared/activationCode.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
import { createServiceClient, getAuthenticatedUser, isEmailConfirmed } from '../_shared/auth.ts';

interface LicenseKeyUseRequest {
  code: string;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = createCorsHeaders(req, 'GET, POST, OPTIONS');
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
        JSON.stringify({ success: false, error: 'AUTH_REQUIRED' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!isEmailConfirmed(user)) {
      return new Response(
        JSON.stringify({ success: false, error: 'EMAIL_NOT_CONFIRMED' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createServiceClient();

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

    const { data: resultRows, error } = await supabase.rpc('redeem_license_key_to_credits', {
      p_key: normalizedCode,
      p_user_id: user.id,
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

    if (!result.redeemed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.key_status === 'revoked' ? 'Activation code revoked' : 'Activation code unavailable',
          status: result.key_status,
          added_credits: 0,
          paid_credits: result.paid_credits || 0,
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
        status: result.key_status,
        added_credits: result.added_credits,
        paid_credits: result.paid_credits,
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
