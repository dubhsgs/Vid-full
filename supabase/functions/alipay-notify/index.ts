import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    if (!sign) {
      console.error('Missing signature in notification — refusing to process order');
      return new Response('fail', {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    const isValid = await verifySignature(params, sign, publicKey);
    if (!isValid) {
      console.error('Signature verification failed — refusing to process order');
      return new Response('fail', {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    const {
      out_trade_no,
      trade_no,
      trade_status,
    } = params;

    if (trade_status !== 'TRADE_SUCCESS' && trade_status !== 'TRADE_FINISHED') {
      console.log('Trade not successful yet:', trade_status);
      return new Response('success', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    const { data: order, error: fetchError } = await supabase
      .from('alipay_orders')
      .select('*')
      .eq('out_trade_no', out_trade_no)
      .maybeSingle();

    if (fetchError || !order) {
      console.error('Order not found:', out_trade_no);
      return new Response('fail', {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    if (order.status === 'paid') {
      console.log('Order already processed:', out_trade_no);
      return new Response('success', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    const { error: updateOrderError } = await supabase
      .from('alipay_orders')
      .update({
        status: 'paid',
        trade_no,
        paid_at: new Date().toISOString(),
      })
      .eq('out_trade_no', out_trade_no);

    if (updateOrderError) {
      console.error('Error updating order:', updateOrderError);
      return new Response('fail', {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    const { data: quota, error: quotaFetchError } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('client_id', order.client_id)
      .maybeSingle();

    if (quotaFetchError && quotaFetchError.code !== 'PGRST116') {
      console.error('Error fetching quota:', quotaFetchError);
      return new Response('fail', {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    if (!quota) {
      const { error: createQuotaError } = await supabase
        .from('user_quotas')
        .insert({
          client_id: order.client_id,
          remaining_credits: order.pack_size,
          total_used: 0,
        });

      if (createQuotaError) {
        console.error('Error creating quota:', createQuotaError);
        return new Response('fail', {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        });
      }
    } else {
      const { error: updateQuotaError } = await supabase
        .from('user_quotas')
        .update({
          remaining_credits: quota.remaining_credits + order.pack_size,
        })
        .eq('client_id', order.client_id);

      if (updateQuotaError) {
        console.error('Error updating quota:', updateQuotaError);
        return new Response('fail', {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        });
      }
    }

    console.log('Payment processed successfully:', out_trade_no);

    return new Response('success', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response('fail', {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });
  }
});
