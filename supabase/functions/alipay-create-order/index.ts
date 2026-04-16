import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateOrderRequest {
  client_id: string;
  pack_size: number;
  return_url?: string;
}

const PACK_PRICES: Record<number, number> = {
  10: 9.9,
  50: 39.9,
  100: 69.9,
};

function getBeijingTimestamp(): string {
  const now = new Date();
  const beijingOffset = 8 * 60;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const beijingMs = utcMs + beijingOffset * 60000;
  const d = new Date(beijingMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function generateSignature(params: Record<string, string>, privateKeyPem: string): Promise<string> {
  const signStr = Object.keys(params)
    .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  const pemContents = privateKeyPem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (RSA )?PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signStr)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { client_id, pack_size, return_url }: CreateOrderRequest = await req.json();

    if (!client_id || !pack_size || !PACK_PRICES[pack_size]) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amount = PACK_PRICES[pack_size];
    const outTradeNo = `VID_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data: order, error: orderError } = await supabase
      .from('alipay_orders')
      .insert({ out_trade_no: outTradeNo, client_id, pack_size, amount, status: 'pending' })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appId = Deno.env.get('ALIPAY_APP_ID') || '2021006140690444';
    const privateKey = Deno.env.get('ALIPAY_PRIVATE_KEY') || '';
    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/alipay-notify`;
    const actualReturnUrl = return_url || `${Deno.env.get('SUPABASE_URL')}/payment-success`;

    const bizContent = {
      out_trade_no: outTradeNo,
      total_amount: amount.toFixed(2),
      subject: `V-ID 证书生成次数包 x${pack_size}`,
      product_code: 'FAST_INSTANT_TRADE_PAY',
    };

    const params: Record<string, string> = {
      app_id: appId,
      method: 'alipay.trade.page.pay',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: getBeijingTimestamp(),
      version: '1.0',
      notify_url: notifyUrl,
      return_url: actualReturnUrl,
      biz_content: JSON.stringify(bizContent),
    };

    if (!privateKey) {
      return new Response(
        JSON.stringify({ error: 'Payment configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sign = await generateSignature(params, privateKey);
    params.sign = sign;

    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const paymentUrl = `https://openapi.alipay.com/gateway.do?${queryString}`;

    return new Response(
      JSON.stringify({ success: true, order_id: order.id, out_trade_no: outTradeNo, payment_url: paymentUrl, amount, pack_size }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
