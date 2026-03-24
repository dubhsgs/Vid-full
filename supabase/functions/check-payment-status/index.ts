import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const orderNo = url.searchParams.get('order_no');

    if (!orderNo) {
      return new Response(
        JSON.stringify({ error: 'Missing order_no parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: order, error: fetchError } = await supabase
      .from('payment_orders')
      .select(`
        id,
        order_no,
        amount,
        payment_method,
        status,
        expires_at,
        paid_at,
        created_at,
        license_keys (
          license_key,
          certificate_count
        )
      `)
      .eq('order_no', orderNo)
      .single();

    if (fetchError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const now = new Date();
    const expiresAt = new Date(order.expires_at);

    if (order.status === 'pending' && now > expiresAt) {
      await supabase
        .from('payment_orders')
        .update({ status: 'expired' })
        .eq('order_no', orderNo);

      order.status = 'expired';
    }

    return new Response(
      JSON.stringify({
        order_no: order.order_no,
        amount: order.amount,
        payment_method: order.payment_method,
        status: order.status,
        expires_at: order.expires_at,
        paid_at: order.paid_at,
        created_at: order.created_at,
        license_key: order.license_keys?.[0]?.license_key,
        certificate_count: order.license_keys?.[0]?.certificate_count,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in check-payment-status:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
