import { createClient } from 'npm:@supabase/supabase-js@2';
import * as crypto from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AfdianWebhookData {
  ec: number;
  em: string;
  data: {
    type: string;
    order: {
      out_trade_no: string;
      user_id: string;
      plan_id: string;
      plan_title?: string;
      month: number;
      total_amount: string;
      show_amount: string;
      status: number;
      remark: string;
      redeem_id: string;
      product_type: number;
      discount: string;
      sku_detail: Array<{
        sku_id: string;
        count: number;
        name: string;
      }>;
      address_person: string;
      address_phone: string;
      address_address: string;
    };
  };
}

function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = 'VID-';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) key += '-';
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

function verifyAfdianSignature(data: string, signature: string, token: string): boolean {
  const params = JSON.parse(data);
  const signStr = `${token}params${data}ts${params.ts}user_id${params.user_id}`;
  const hash = crypto.createHash('md5').update(signStr).digest('hex');
  return hash === signature;
}

function getPlanPackSize(planTitle: string): number {
  if (planTitle.includes('10') || planTitle.includes('十')) return 10;
  if (planTitle.includes('5') || planTitle.includes('五')) return 5;
  return 1;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ message: 'Afdian webhook endpoint is ready', status: 'ok' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    const webhookData: AfdianWebhookData = JSON.parse(body);

    if (webhookData.data.type !== 'order') {
      return new Response(
        JSON.stringify({ ec: 200, em: 'Not an order event' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const order = webhookData.data.order;

    const { data: existingOrder } = await supabase
      .from('afdian_orders')
      .select('id, status, license_key')
      .eq('order_id', order.out_trade_no)
      .maybeSingle();

    if (existingOrder) {
      if (existingOrder.status === 'paid') {
        return new Response(
          JSON.stringify({
            ec: 200,
            em: 'Order already processed',
            license_key: existingOrder.license_key
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    if (order.status === 2) {
      const licenseKey = generateLicenseKey();
      const packSize = getPlanPackSize(order.plan_title || '');

      const orderData = {
        order_id: order.out_trade_no,
        user_id: order.user_id,
        plan_id: order.plan_id,
        plan_title: order.plan_title || '',
        total_amount: parseFloat(order.total_amount),
        pack_size: packSize,
        status: 'paid',
        license_key: licenseKey,
        webhook_data: webhookData,
        paid_at: new Date().toISOString(),
      };

      if (existingOrder) {
        const { error: updateError } = await supabase
          .from('afdian_orders')
          .update(orderData)
          .eq('order_id', order.out_trade_no);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('afdian_orders')
          .insert(orderData);

        if (insertError) throw insertError;
      }

      return new Response(
        JSON.stringify({
          ec: 200,
          em: 'success',
          license_key: licenseKey,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ ec: 200, em: 'Order not paid yet' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ ec: 200, em: error.message }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
