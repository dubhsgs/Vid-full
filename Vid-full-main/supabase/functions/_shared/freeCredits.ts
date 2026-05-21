export const FREE_TRIAL_CREDITS = 2;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function getHashSalt(): string {
  return Deno.env.get('FREE_CREDIT_CLAIM_SALT')
    || Deno.env.get('CONTACT_RATE_LIMIT_SALT')
    || Deno.env.get('SUPABASE_URL')
    || 'vaid-free-credit';
}

async function hashValue(value: string, purpose: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${getHashSalt()}:${purpose}:${value}`)
  );
  return bytesToHex(new Uint8Array(digest));
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

export async function getClientIpHash(req: Request): Promise<string | null> {
  const clientIp = getClientIp(req);
  return clientIp ? hashValue(clientIp, 'ip') : null;
}

export async function getDeviceFingerprintHash(rawFingerprint: unknown): Promise<string | null> {
  const fingerprint = String(rawFingerprint || '').trim();
  if (fingerprint.length < 8 || fingerprint.length > 256) {
    return null;
  }

  return hashValue(fingerprint, 'device');
}
