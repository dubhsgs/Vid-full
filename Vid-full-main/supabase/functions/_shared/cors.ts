const DEFAULT_ORIGIN = 'https://vaid.top';
const DEFAULT_ALLOWED_HEADERS = 'Content-Type, Authorization, X-Client-Info, Apikey';

const ALLOWED_ORIGINS = new Set([
  'https://vaid.top',
  'https://www.vaid.top',
  'http://localhost:5173',
  'http://localhost:4173',
]);

/**
 * Returns the request's Origin if it is on the allowlist, otherwise the
 * production origin. Browsers enforce CORS by comparing this response header
 * against the requesting origin, so non-allowlisted sites fail the check.
 * Server-to-server callers (no Origin header) are unaffected by CORS.
 */
export function resolveCorsOrigin(req: Request): string {
  const origin = (req.headers.get('origin') || '').trim();
  return ALLOWED_ORIGINS.has(origin) ? origin : DEFAULT_ORIGIN;
}

export function createCorsHeaders(
  req: Request,
  allowedMethods: string,
  allowedHeaders = DEFAULT_ALLOWED_HEADERS
): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveCorsOrigin(req),
    'Access-Control-Allow-Methods': allowedMethods,
    'Access-Control-Allow-Headers': allowedHeaders,
    'Vary': 'Origin',
  };
}
