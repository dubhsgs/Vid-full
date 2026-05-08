import { createServiceClient, getAuthenticatedUser, isEmailConfirmed } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface QueryOrderRequest {
  out_trade_no: string;
}

interface OrderStatusInfo {
  out_trade_no: string;
  status: 'pending' | 'paid' | 'cancelled';
  pack_size: number;
  amount: number;
  paid_at: string | null;
  user_id: string | null;
}

interface AlipayTradeQueryResponse {
  code?: string;
  msg?: string;
  sub_code?: string;
  sub_msg?: string;
  out_trade_no?: string;
  trade_no?: string;
  trade_status?: string;
  total_amount?: string;
  seller_id?: string;
}

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
    .filter((key) => params[key] !== '' && params[key] !== null && params[key] !== undefined)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  const pemContents = privateKeyPem
    .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, '')
    .replace(/-----END (RSA )?PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signStr));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchOrderCompat(
  supabase: ReturnType<typeof createServiceClient>,
  outTradeNo: string
): Promise<{ order: OrderStatusInfo | null; error: { message?: string } | null }> {
  const baseSelect = 'out_trade_no, status, pack_size, amount, paid_at, user_id';
  const result = await supabase
    .from('alipay_orders')
    .select(baseSelect)
    .eq('out_trade_no', outTradeNo)
    .maybeSingle();

  if (result.error) {
    return { order: null, error: result.error as { message?: string } };
  }

  return { order: (result.data as OrderStatusInfo | null) ?? null, error: null };
}

function publicOrder(order: OrderStatusInfo) {
  return {
    out_trade_no: order.out_trade_no,
    status: order.status,
    pack_size: order.pack_size,
    amount: order.amount,
    paid_at: order.paid_at,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ success: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return jsonResponse({ success: false, error: 'AUTH_REQUIRED' }, 401);
    }

    if (!isEmailConfirmed(user)) {
      return jsonResponse({ success: false, error: 'EMAIL_NOT_CONFIRMED' }, 403);
    }

    const supabase = createServiceClient();

    const body = await req.json() as QueryOrderRequest;
    const outTradeNo = body?.out_trade_no?.trim();
    if (!outTradeNo) {
      return jsonResponse({ success: false, error: 'out_trade_no is required' }, 400);
    }

    const appId = Deno.env.get('ALIPAY_APP_ID');
    const privateKey = Deno.env.get('ALIPAY_PRIVATE_KEY') || '';
    const sellerId = Deno.env.get('ALIPAY_SELLER_ID') || Deno.env.get('ALIPAY_SELLER_EMAIL') || '';

    if (!appId || !privateKey) {
      return jsonResponse({ success: false, error: 'Alipay configuration missing' }, 500);
    }

    const { order: existingOrder, error: orderError } = await fetchOrderCompat(supabase, outTradeNo);

    if (orderError) {
      console.error('Failed to fetch order:', orderError);
      return jsonResponse({ success: false, error: 'Failed to fetch order' }, 500);
    }

    if (!existingOrder) {
      return jsonResponse({ success: false, error: 'ORDER_NOT_FOUND' }, 404);
    }

    if (existingOrder.user_id !== user.id) {
      return jsonResponse({ success: false, error: 'ORDER_FORBIDDEN' }, 403);
    }

    if (existingOrder.status === 'paid') {
      return jsonResponse({
        success: true,
        paid: true,
        source: 'database',
        order: publicOrder(existingOrder),
      });
    }

    const bizContent = JSON.stringify({ out_trade_no: outTradeNo });
    const params: Record<string, string> = {
      app_id: appId,
      method: 'alipay.trade.query',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: getBeijingTimestamp(),
      version: '1.0',
      biz_content: bizContent,
    };

    const sign = await generateSignature(params, privateKey);
    params.sign = sign;

    const formBody = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    const alipayHttpRes = await fetch('https://openapi.alipay.com/gateway.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: formBody,
    });

    const alipayRaw = await alipayHttpRes.text();
    let alipayPayload: Record<string, unknown>;
    try {
      alipayPayload = JSON.parse(alipayRaw) as Record<string, unknown>;
    } catch {
      console.error('Invalid Alipay query response:', alipayRaw);
      return jsonResponse({ success: false, error: 'Invalid Alipay response' }, 502);
    }

    const queryResp = alipayPayload.alipay_trade_query_response as AlipayTradeQueryResponse | undefined;
    if (!queryResp) {
      console.error('Missing query response payload:', alipayPayload);
      return jsonResponse({ success: false, error: 'Missing Alipay query payload' }, 502);
    }

    if (queryResp.code !== '10000') {
      return jsonResponse({
        success: true,
        paid: false,
        source: 'alipay',
        trade_status: queryResp.trade_status || null,
        alipay_code: queryResp.code || null,
        alipay_msg: queryResp.sub_msg || queryResp.msg || null,
        order: publicOrder(existingOrder),
      });
    }

    if (queryResp.out_trade_no !== outTradeNo) {
      console.error('out_trade_no mismatch:', { expected: outTradeNo, actual: queryResp.out_trade_no });
      return jsonResponse({ success: false, error: 'ORDER_NO_MISMATCH' }, 400);
    }

    const tradeStatus = queryResp.trade_status || '';
    if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') {
      return jsonResponse({
        success: true,
        paid: false,
        source: 'alipay',
        trade_status: tradeStatus,
        order: publicOrder(existingOrder),
      });
    }

    const alipayAmount = Number(queryResp.total_amount || 0);
    const localAmount = Number(existingOrder.amount || 0);
    if (!Number.isFinite(alipayAmount) || Math.abs(alipayAmount - localAmount) > 0.000001) {
      console.error('Amount mismatch:', {
        outTradeNo,
        alipayAmount,
        localAmount,
      });
      return jsonResponse({ success: false, error: 'AMOUNT_MISMATCH' }, 400);
    }

    if (sellerId && queryResp.seller_id && queryResp.seller_id !== sellerId) {
      console.error('seller_id mismatch:', {
        outTradeNo,
        expected: sellerId,
        actual: queryResp.seller_id,
      });
      return jsonResponse({ success: false, error: 'SELLER_MISMATCH' }, 400);
    }

    const tradeNo = queryResp.trade_no || '';
    if (!tradeNo) {
      return jsonResponse({ success: false, error: 'MISSING_TRADE_NO' }, 400);
    }

    const { data: markResult, error: markError } = await supabase.rpc('mark_alipay_order_paid_to_credits', {
      p_out_trade_no: outTradeNo,
      p_trade_no: tradeNo,
      p_paid_at: new Date().toISOString(),
    });

    if (markError) {
      console.error('Failed to mark order paid via query:', markError);
      return jsonResponse({ success: false, error: 'MARK_ORDER_FAILED', details: markError.message }, 500);
    }

    const { order: refreshedOrder, error: refreshError } = await fetchOrderCompat(supabase, outTradeNo);

    if (refreshError || !refreshedOrder) {
      console.error('Failed to fetch refreshed order:', refreshError);
      return jsonResponse({ success: false, error: 'REFRESH_ORDER_FAILED' }, 500);
    }

    const markRow = Array.isArray(markResult) && markResult.length > 0 ? markResult[0] as Record<string, unknown> : null;

    return jsonResponse({
      success: true,
      paid: refreshedOrder.status === 'paid',
      source: 'alipay_query_settlement',
      already_processed: Boolean(markRow?.already_processed),
      order: publicOrder(refreshedOrder as OrderStatusInfo),
      added_credits: Number(markRow?.added_credits || 0),
      paid_credits: Number(markRow?.paid_credits || 0),
      trade_status: tradeStatus,
    });
  } catch (error) {
    console.error('Unexpected error in alipay-query-order:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return jsonResponse({ success: false, error: message }, 500);
  }
});
