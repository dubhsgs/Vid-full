import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface QuotaUseRequest {
  client_id: string;
  amount?: number;
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

    const { client_id, amount }: QuotaUseRequest = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const consumeAmount = Number.isFinite(amount) ? Math.max(1, Math.floor(Number(amount))) : 1;

    const consumeViaFallback = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data: quota, error: quotaError } = await supabase
          .from('user_quotas')
          .select('client_id, remaining_credits, total_used')
          .eq('client_id', client_id)
          .maybeSingle();

        if (quotaError) {
          console.error('Error reading quota (fallback):', quotaError);
          return {
            ok: false as const,
            status: 500,
            body: { success: false, error: 'Database error' },
          };
        }

        if (!quota) {
          const { error: insertError } = await supabase.from('user_quotas').insert({
            client_id,
            remaining_credits: 3,
            total_used: 0,
          });

          if (insertError) {
            console.error('Error creating quota row (fallback):', insertError);
            return {
              ok: false as const,
              status: 500,
              body: { success: false, error: 'Database error' },
            };
          }

          continue;
        }

        if (quota.remaining_credits < consumeAmount) {
          return {
            ok: false as const,
            status: 403,
            body: { success: false, error: 'Insufficient credits' },
          };
        }

        const nextRemaining = quota.remaining_credits - consumeAmount;
        const nextUsed = quota.total_used + consumeAmount;

        const { data: updatedRow, error: updateError } = await supabase
          .from('user_quotas')
          .update({
            remaining_credits: nextRemaining,
            total_used: nextUsed,
            updated_at: new Date().toISOString(),
          })
          .eq('client_id', client_id)
          .eq('remaining_credits', quota.remaining_credits)
          .eq('total_used', quota.total_used)
          .select('remaining_credits, total_used')
          .maybeSingle();

        if (updateError) {
          console.error('Error updating quota (fallback):', updateError);
          return {
            ok: false as const,
            status: 500,
            body: { success: false, error: 'Database error' },
          };
        }

        if (updatedRow) {
          return {
            ok: true as const,
            status: 200,
            body: {
              success: true,
              remaining_credits: updatedRow.remaining_credits,
              total_used: updatedRow.total_used,
            },
          };
        }
      }

      return {
        ok: false as const,
        status: 409,
        body: { success: false, error: 'Quota conflict, retry' },
      };
    };

    const rpcResult = consumeAmount === 1
      ? await supabase.rpc('consume_user_credit', { p_client_id: client_id })
      : { data: null, error: { message: 'RPC only supports amount=1' } };

    if (!rpcResult.error) {
      const quotaRows = rpcResult.data;
      const updatedQuota = Array.isArray(quotaRows) ? quotaRows[0] : null;
      if (updatedQuota) {
        return new Response(
          JSON.stringify({
            success: true,
            remaining_credits: updatedQuota.remaining_credits,
            total_used: updatedQuota.total_used,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (rpcResult.error) {
      console.error('Error consuming quota via RPC, using fallback:', rpcResult.error);
    }

    const fallbackResult = await consumeViaFallback();
    if (fallbackResult.ok) {
      return new Response(
        JSON.stringify(fallbackResult.body),
        {
          status: fallbackResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify(fallbackResult.body),
      {
        status: fallbackResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
