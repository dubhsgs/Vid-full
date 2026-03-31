import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface QuotaUseRequest {
  client_id: string;
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

    const { client_id }: QuotaUseRequest = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: quota, error: fetchError } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching quota:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Database error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!quota) {
      return new Response(
        JSON.stringify({ success: false, error: 'No quota found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (quota.remaining_credits <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient credits' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: updatedQuota, error: updateError } = await supabase
      .from('user_quotas')
      .update({
        remaining_credits: quota.remaining_credits - 1,
        total_used: quota.total_used + 1,
      })
      .eq('client_id', client_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating quota:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update quota' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
