import { createServiceClient, getAuthenticatedUser, isEmailConfirmed } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateOrderRequest {
  pack_size: number;
  return_url?: string;
  is_mobile?: boolean;
}

const PACK_PRICES: Record<number, number> = {
  1: 9.9,
  5: 39.9,
  10: 69.9,
};

const DEFAULT_ALLOWED_RETURN_ORIGINS = new Set<string>([
  'https://vaid.top',
  'https://www.vaid.top',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5175',
  'http://127.0.0.1:5175',
]);

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

function getDefaultReturnUrl(): string {
  const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('PUBLIC_SITE_URL');

  if (!siteUrl) {
    throw new Error('SITE_URL is not configured');
  }

  return new URL('/payment-success', siteUrl).toString();
}

function addOriginIfValid(origins: Set<string>, rawUrl: string, source: string): void {
  try {
    origins.add(new URL(rawUrl).origin);
  } catch {
    console.warn(`Skipping invalid URL from ${source}`);
  }
}

function getAllowedReturnOrigins(): Set<string> {
  const origins = new Set<string>(DEFAULT_ALLOWED_RETURN_ORIGINS);

  const siteUrl = Deno.env.get('SITE_URL');
  const publicSiteUrl = Deno.env.get('PUBLIC_SITE_URL');
  const extraAllowlist = Deno.env.get('ALIPAY_RETURN_URL_ALLOWLIST');

  if (siteUrl) {
    addOriginIfValid(origins, siteUrl, 'SITE_URL');
  }

  if (publicSiteUrl) {
    addOriginIfValid(origins, publicSiteUrl, 'PUBLIC_SITE_URL');
  }

  if (extraAllowlist) {
    for (const rawUrl of extraAllowlist.split(',').map(v => v.trim()).filter(Boolean)) {
      addOriginIfValid(origins, rawUrl, 'ALIPAY_RETURN_URL_ALLOWLIST');
    }
  }

  return origins;
}

function resolveReturnUrl(returnUrl?: string): string {
  if (!returnUrl) {
    return getDefaultReturnUrl();
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(returnUrl);
  } catch {
    throw new Error('INVALID_RETURN_URL');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('INVALID_RETURN_URL_PROTOCOL');
  }

  const allowedOrigins = getAllowedReturnOrigins();
  if (!allowedOrigins.has(parsedUrl.origin)) {
    throw new Error(`RETURN_URL_ORIGIN_NOT_ALLOWED:${parsedUrl.origin}`);
  }

  return parsedUrl.toString();
}

function isMobileUserAgent(userAgent: string): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Mobi/i.test(userAgent);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'AUTH_REQUIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isEmailConfirmed(user)) {
      return new Response(
        JSON.stringify({ error: 'EMAIL_NOT_CONFIRMED' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServiceClient();

    const { pack_size, return_url, is_mobile }: CreateOrderRequest = await req.json();

    if (!pack_size || !PACK_PRICES[pack_size]) {
      return new Response(
        JSON.stringify({ error: 'Invalid request parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let actualReturnUrl = '';
    try {
      actualReturnUrl = resolveReturnUrl(return_url);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Invalid return_url',
          details: error instanceof Error ? error.message : 'UNKNOWN_RETURN_URL_ERROR',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const appId = (Deno.env.get('ALIPAY_APP_ID') || '').trim();
    const privateKey = (Deno.env.get('ALIPAY_PRIVATE_KEY') || '').trim();
    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/alipay-notify`;

    if (!appId || !privateKey) {
      console.error('Alipay payment configuration missing');
      return new Response(
        JSON.stringify({ error: 'PAYMENT_CONFIG_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amount = PACK_PRICES[pack_size];
    const outTradeNo = `VID_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const useMobilePayment = is_mobile === true || isMobileUserAgent(req.headers.get('user-agent') || '');
    const alipayMethod = useMobilePayment ? 'alipay.trade.wap.pay' : 'alipay.trade.page.pay';
    const productCode = useMobilePayment ? 'QUICK_WAP_WAY' : 'FAST_INSTANT_TRADE_PAY';

    const { data: order, error: orderError } = await supabase
      .from('alipay_orders')
      .insert({
        out_trade_no: outTradeNo,
        user_id: user.id,
        client_id: user.id,
        pack_size,
        amount,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bizContent = {
      out_trade_no: outTradeNo,
      total_amount: amount.toFixed(2),
      subject: `VAID 证书生成次数包 x${pack_size}`,
      product_code: productCode,
    };

    const params: Record<string, string> = {
      app_id: appId,
      method: alipayMethod,
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: getBeijingTimestamp(),
      version: '1.0',
      notify_url: notifyUrl,
      return_url: actualReturnUrl,
      biz_content: JSON.stringify(bizContent),
    };

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
