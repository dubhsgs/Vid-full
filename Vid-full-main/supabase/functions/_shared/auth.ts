import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  emailConfirmedAt?: string | null;
}

export function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  const authClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    }
  );

  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? undefined,
    emailConfirmedAt: data.user.email_confirmed_at ?? null,
  };
}

export function isEmailConfirmed(user: AuthenticatedUser): boolean {
  return Boolean(user.emailConfirmedAt);
}

export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

export function isInternalRequest(req: Request, envName = 'OTS_WORKER_SECRET'): boolean {
  const expectedSecret = (Deno.env.get(envName) || '').trim();
  if (!expectedSecret) {
    console.error(`[auth] Missing internal secret env: ${envName}`);
    return false;
  }

  const providedSecret = (
    req.headers.get('x-vaid-internal-secret') ||
    req.headers.get('x-ots-worker-secret') ||
    ''
  ).trim();

  return providedSecret === expectedSecret;
}
