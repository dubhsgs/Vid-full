import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PaymentWebhookData {
  order_no: string;
  status: 'paid' | 'cancelled';
  paid_at?: string;
}

function generateLicenseKey(): string {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    const segment = Math.random().toString(36).substring(2, 7).toUpperCase();
    segments.push(segment);
  }
  return segments.join('-');
}

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

    const { order_no, status, paid_at }: PaymentWebhookData = await req.json();

    if (!order_no || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: order, error: fetchError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_no', order_no)
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

    if (order.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Order already processed', current_status: order.status }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let licenseKeyId = null;

    if (status === 'paid') {
      const licenseKey = generateLicenseKey();
      const certificateCount = Math.floor(order.amount / 10);

      const { data: newLicense, error: licenseError } = await supabase
        .from('license_keys')
        .insert({
          license_key: licenseKey,
          certificate_count: certificateCount,
          is_active: true,
        })
        .select()
        .single();

      if (licenseError) {
        console.error('Error creating license key:', licenseError);
        return new Response(
          JSON.stringify({ error: 'Failed to create license key' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      licenseKeyId = newLicense.id;
    }

    const { error: updateError } = await supabase
      .from('payment_orders')
      .update({
        status,
        paid_at: status === 'paid' ? (paid_at || new Date().toISOString()) : null,
        license_key_id: licenseKeyId,
      })
      .eq('order_no', order_no);

    if (updateError) {
      console.error('Error updating order:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update order' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_no,
        status,
        license_key_id: licenseKeyId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in payment-webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
