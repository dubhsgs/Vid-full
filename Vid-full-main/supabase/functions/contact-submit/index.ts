import { createServiceClient } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ContactRequest {
  name?: string;
  email?: string;
  message?: string;
  page_url?: string;
  language?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320;
}

async function forwardEmail(input: Required<Pick<ContactRequest, 'name' | 'email' | 'message'>>) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('CONTACT_TO_EMAIL');
  const from = Deno.env.get('CONTACT_FROM_EMAIL') || 'VAID Contact <onboarding@resend.dev>';

  if (!apiKey || !to) {
    return 'stored' as const;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: input.email,
      subject: `VAID contact: ${input.name}`,
      text: `Name: ${input.name}\nReply email: ${input.email}\n\n${input.message}`,
    }),
  });

  return res.ok ? 'sent' as const : 'send_failed' as const;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  try {
    const body = await req.json() as ContactRequest;
    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const message = (body.message || '').trim();
    const pageUrl = (body.page_url || '').trim().slice(0, 1000);
    const language = (body.language || '').trim().slice(0, 32);

    if (!name || name.length > 120) {
      return jsonResponse({ success: false, error: 'INVALID_NAME' }, 400);
    }

    if (!isValidEmail(email)) {
      return jsonResponse({ success: false, error: 'INVALID_EMAIL' }, 400);
    }

    if (!message || message.length > 4000) {
      return jsonResponse({ success: false, error: 'INVALID_MESSAGE' }, 400);
    }

    const deliveryStatus = await forwardEmail({ name, email, message });
    const supabase = createServiceClient();
    const { error } = await supabase.from('contact_messages').insert({
      name,
      reply_email: email,
      message,
      page_url: pageUrl || null,
      language: language || null,
      user_agent: req.headers.get('user-agent') || null,
      delivery_status: deliveryStatus,
    });

    if (error) {
      console.error('Failed to store contact message:', error);
      return jsonResponse({ success: false, error: 'STORE_FAILED' }, 500);
    }

    return jsonResponse({ success: true, delivery_status: deliveryStatus });
  } catch (error) {
    console.error('Unexpected contact-submit error:', error);
    return jsonResponse({ success: false, error: 'INTERNAL_ERROR' }, 500);
  }
});
