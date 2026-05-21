import { createServiceClient, getAuthenticatedUser, isEmailConfirmed } from '../_shared/auth.ts';
import { FREE_TRIAL_CREDITS, getClientIpHash, getDeviceFingerprintHash } from '../_shared/freeCredits.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface QuotaCheckRequest {
  device_fingerprint?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ success: false, error: 'AUTH_REQUIRED' }, 401);
    }

    if (!isEmailConfirmed(user)) {
      return jsonResponse({ success: false, error: 'EMAIL_NOT_CONFIRMED' }, 403);
    }

    const supabase = createServiceClient();
    let body: QuotaCheckRequest = {};
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({} as QuotaCheckRequest)) as QuotaCheckRequest;
    }

    const { data: existingCredits, error: readError } = await supabase
      .from('user_credits')
      .select('free_credits, paid_credits, total_used')
      .eq('user_id', user.id)
      .maybeSingle();

    if (readError) {
      console.error('[quota-check] Error fetching credits:', readError);
      return jsonResponse({ success: false, error: 'DATABASE_ERROR' }, 500);
    }

    let credits = existingCredits;
    if (!credits) {
      const [clientIpHash, deviceFingerprintHash] = await Promise.all([
        getClientIpHash(req),
        getDeviceFingerprintHash(body.device_fingerprint),
      ]);

      const { data: claimRows, error: claimError } = await supabase.rpc('claim_free_credits', {
        p_user_id: user.id,
        p_ip_hash: clientIpHash,
        p_device_fingerprint_hash: deviceFingerprintHash,
        p_granted_credits: FREE_TRIAL_CREDITS,
      });

      if (claimError) {
        console.error('[quota-check] Error claiming free credits:', claimError);
        return jsonResponse({ success: false, error: 'DATABASE_ERROR' }, 500);
      }

      const claimResult = Array.isArray(claimRows) ? claimRows[0] : null;
      credits = {
        free_credits: Number(claimResult?.free_credits || 0),
        paid_credits: Number(claimResult?.paid_credits || 0),
        total_used: Number(claimResult?.total_used || 0),
      };
    }

    const freeCredits = Number(credits?.free_credits || 0);
    const paidCredits = Number(credits?.paid_credits || 0);

    return jsonResponse({
      success: true,
      client_id: user.id,
      remaining_credits: freeCredits + paidCredits,
      free_credits: freeCredits,
      paid_credits: paidCredits,
      total_used: Number(credits?.total_used || 0),
    });
  } catch (error) {
    console.error('[quota-check] Unexpected error:', error);
    return jsonResponse({ success: false, error: 'INTERNAL_SERVER_ERROR' }, 500);
  }
});
