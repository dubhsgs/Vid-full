import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface QuotaCheckRequest {
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

    const { client_id }: QuotaCheckRequest = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let { data: quota, error } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching quota:', error);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!quota) {
      const { data: newQuota, error: insertError } = await supabase
        .from('user_quotas')
        .insert({
          client_id,
          remaining_credits: 3,
          total_used: 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating quota:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create quota' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      quota = newQuota;
    }

    return new Response(
      JSON.stringify({
        client_id: quota.client_id,
        remaining_credits: quota.remaining_credits,
        total_used: quota.total_used,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
