import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

function toAmount(value?: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

async function verifySignature(params: Record<string, string>, sign: string, publicKey: string): Promise<boolean> {
  try {
    const sortedParams = Object.keys(params)
      .filter(key => key !== 'sign' && key !== 'sign_type' && params[key] !== '' && params[key] !== null)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const encoder = new TextEncoder();
    const data = encoder.encode(sortedParams);

    const pemHeader = '-----BEGIN PUBLIC KEY-----';
    const pemFooter = '-----END PUBLIC KEY-----';
    const pemContents = publicKey.replace(pemHeader, '').replace(pemFooter, '').replace(/\s/g, '');

    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const key = await crypto.subtle.importKey(
      'spki',
      binaryKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    );

    const signatureBytes = Uint8Array.from(atob(sign), c => c.charCodeAt(0));

    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      signatureBytes,
      data
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('fail', {
      status: 405,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const formData = await req.formData();
    const params: Record<string, string> = {};

    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    console.log('Received notification:', params);

    const sign = params.sign;
    const publicKey = Deno.env.get('ALIPAY_PUBLIC_KEY');

    if (!publicKey) {
      console.error('ALIPAY_PUBLIC_KEY is not configured — refusing to process order');
      return new Response('fail', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (!sign) {
      console.error('Missing signature in notification — refusing to process order');
      return new Response('fail', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const isValid = await verifySignature(params, sign, publicKey);
    if (!isValid) {
      console.error('Signature verification failed — refusing to process order');
      return new Response('fail', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const {
      out_trade_no,
      trade_no,
      trade_status,
      app_id,
      total_amount,
      seller_id,
      seller_email,
    } = params;

    if (!out_trade_no || !trade_no) {
      console.error('Missing out_trade_no or trade_no in notification');
      return new Response('fail', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (trade_status !== 'TRADE_SUCCESS' && trade_status !== 'TRADE_FINISHED') {
      console.log('Trade not successful yet:', trade_status);
      return new Response('success', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const expectedAppId = (Deno.env.get('ALIPAY_APP_ID') || '').trim();
    const expectedSellerId = (Deno.env.get('ALIPAY_SELLER_ID') || '').trim();
    const expectedSellerEmail = (Deno.env.get('ALIPAY_SELLER_EMAIL') || '').trim().toLowerCase();

    if (!expectedAppId) {
      console.error('ALIPAY_APP_ID is not configured — refusing to process order');
      return new Response('fail', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (!expectedSellerId && !expectedSellerEmail) {
      console.error('ALIPAY_SELLER_ID or ALIPAY_SELLER_EMAIL must be configured — refusing to process order');
      return new Response('fail', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (!app_id || app_id !== expectedAppId) {
      console.error('app_id mismatch in notification:', { got: app_id, expected: expectedAppId, out_trade_no });
      return new Response('fail', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (expectedSellerId && seller_id !== expectedSellerId) {
      console.error('seller_id mismatch in notification:', { got: seller_id, expected: expectedSellerId, out_trade_no });
      return new Response('fail', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (expectedSellerEmail) {
      const normalizedSellerEmail = (seller_email || '').trim().toLowerCase();
      if (!normalizedSellerEmail || normalizedSellerEmail !== expectedSellerEmail) {
        console.error('seller_email mismatch in notification:', {
          got: seller_email,
          expected: expectedSellerEmail,
          out_trade_no,
        });
        return new Response('fail', {
          status: 400,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }

    const paidAmount = toAmount(total_amount);
    if (paidAmount === null) {
      console.error('Invalid total_amount in notification:', { total_amount, out_trade_no });
      return new Response('fail', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const { data: orderRow, error: orderLookupError } = await supabase
      .from('alipay_orders')
      .select('amount')
      .eq('out_trade_no', out_trade_no)
      .maybeSingle();

    if (orderLookupError) {
      console.error('Failed to load order for amount verification:', orderLookupError);
      return new Response('fail', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (!orderRow) {
      console.error('Order not found while verifying amount:', out_trade_no);
      return new Response('fail', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const expectedAmount = Number(orderRow.amount);
    if (!Number.isFinite(expectedAmount)) {
      console.error('Order amount is invalid in database:', { out_trade_no, amount: orderRow.amount });
      return new Response('fail', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (Math.abs(paidAmount - expectedAmount) > 0.000001) {
      console.error('total_amount mismatch in notification:', {
        out_trade_no,
        got: paidAmount,
        expected: expectedAmount,
      });
      return new Response('fail', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const { data: markResult, error: markError } = await supabase.rpc('mark_alipay_order_paid_to_credits', {
      p_out_trade_no: out_trade_no,
      p_trade_no: trade_no,
      p_paid_at: new Date().toISOString(),
    });

    if (markError) {
      console.error('Failed to mark order as paid safely:', markError);
      return new Response('fail', {
        status: markError.message?.includes('ORDER_NOT_FOUND') ? 404 : 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const result = Array.isArray(markResult) ? markResult[0] : null;
    if (!result) {
      console.error('Order processing returned no result:', out_trade_no);
      return new Response('fail', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (result.already_processed) {
      console.log('Order already processed:', out_trade_no);
      return new Response('success', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    console.log('Payment processed successfully:', out_trade_no, result);

    return new Response('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response('fail', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
});
