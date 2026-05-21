import { createServiceClient, getAuthenticatedUser, isEmailConfirmed } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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
      const { data: insertedCredits, error: insertError } = await supabase
        .from('user_credits')
        .insert({
          user_id: user.id,
          free_credits: 3,
          paid_credits: 0,
          total_used: 0,
        })
        .select('free_credits, paid_credits, total_used')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          const { data: racedCredits, error: rereadError } = await supabase
            .from('user_credits')
            .select('free_credits, paid_credits, total_used')
            .eq('user_id', user.id)
            .maybeSingle();

          if (rereadError || !racedCredits) {
            console.error('[quota-check] Error loading raced credits:', rereadError);
            return jsonResponse({ success: false, error: 'DATABASE_ERROR' }, 500);
          }

          credits = racedCredits;
        } else {
          console.error('[quota-check] Error initializing credits:', insertError);
          return jsonResponse({ success: false, error: 'DATABASE_ERROR' }, 500);
        }
      } else {
        credits = insertedCredits;
      }
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
