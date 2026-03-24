import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import QRCode from 'npm:qrcode@1.5.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PaymentRequest {
  amount: number;
  payment_method: 'alipay' | 'wechat';
  user_contact?: string;
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

    const { amount, payment_method, user_contact }: PaymentRequest = await req.json();

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!['alipay', 'wechat'].includes(payment_method)) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment method' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const orderNo = `VID${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const mockPaymentUrl = `https://payment.example.com/pay?order=${orderNo}&amount=${amount}&method=${payment_method}`;

    const qrCodeDataUrl = await QRCode.toDataURL(mockPaymentUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    const { data: order, error: insertError } = await supabase
      .from('payment_orders')
      .insert({
        order_no: orderNo,
        amount,
        payment_method,
        qr_code_url: qrCodeDataUrl,
        status: 'pending',
        user_contact,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating order:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        order_no: order.order_no,
        qr_code_url: order.qr_code_url,
        amount: order.amount,
        payment_method: order.payment_method,
        expires_at: order.expires_at,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-payment-order:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
