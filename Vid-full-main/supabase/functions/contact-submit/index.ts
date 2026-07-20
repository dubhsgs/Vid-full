import { createServiceClient } from '../_shared/auth.ts';
import { createCorsHeaders } from '../_shared/cors.ts';

interface ContactRequest {
  name?: string;
  email?: string;
  message?: string;
  page_url?: string;
  language?: string;
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_PER_WINDOW = 3;

function createJsonResponse(corsHeaders: Record<string, string>) {
  return (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for') || '';
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    forwardedFor.split(',')[0] ||
    ''
  ).trim();
}

async function getClientIpHash(req: Request): Promise<string | null> {
  const clientIp = getClientIp(req);
  if (!clientIp) return null;

  const salt = Deno.env.get('CONTACT_RATE_LIMIT_SALT') || Deno.env.get('SUPABASE_URL') || 'vaid-contact';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${clientIp}`));
  return bytesToHex(new Uint8Array(digest));
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
  const corsHeaders = createCorsHeaders(req, 'POST, OPTIONS');
  const jsonResponse = createJsonResponse(corsHeaders);
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

    const supabase = createServiceClient();
    const clientIpHash = await getClientIpHash(req);

    if (clientIpHash) {
      const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const { count, error: limitError } = await supabase
        .from('contact_messages')
        .select('id', { count: 'exact', head: true })
        .eq('client_ip_hash', clientIpHash)
        .gte('created_at', since);

      if (limitError) {
        console.error('Failed to check contact rate limit:', limitError);
        return jsonResponse({ success: false, error: 'RATE_LIMIT_CHECK_FAILED' }, 500);
      }

      if ((count || 0) >= RATE_LIMIT_MAX_PER_WINDOW) {
        return jsonResponse({ success: false, error: 'RATE_LIMITED' }, 429);
      }
    }

    const deliveryStatus = await forwardEmail({ name, email, message });
    const { error } = await supabase.from('contact_messages').insert({
      name,
      reply_email: email,
      message,
      page_url: pageUrl || null,
      language: language || null,
      user_agent: req.headers.get('user-agent') || null,
      client_ip_hash: clientIpHash,
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
