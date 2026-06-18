const textEncoder = new TextEncoder();

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

interface PresignPutOptions {
  key: string;
  expiresSeconds?: number;
}

interface SignedRequestOptions {
  method: 'GET' | 'HEAD' | 'DELETE' | 'PUT';
  key: string;
  body?: BodyInit;
  contentType?: string;
}

function requireEnv(name: string): string {
  const value = (Deno.env.get(name) || '').trim();
  if (!value) throw new Error(`Missing R2 env: ${name}`);
  return value;
}

export function getR2Config(): R2Config {
  return {
    accountId: requireEnv('R2_ACCOUNT_ID'),
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    bucket: requireEnv('R2_EVIDENCE_BUCKET'),
  };
}

export function getR2CardsConfig(): R2Config {
  return {
    accountId: requireEnv('R2_ACCOUNT_ID'),
    accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    bucket: requireEnv('R2_CARDS_BUCKET'),
  };
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest('SHA-256', textEncoder.encode(value)));
}

async function sha256BytesHex(value: Uint8Array): Promise<string> {
  return bytesToHex(await crypto.subtle.digest('SHA-256', value));
}

async function bodyToBytes(body?: BodyInit): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  if (typeof body === 'string') return textEncoder.encode(body);
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (body instanceof Blob) return new Uint8Array(await body.arrayBuffer());
  throw new Error('Unsupported R2 request body type');
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, value: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, textEncoder.encode(value));
}

async function getSigningKey(secretAccessKey: string, dateStamp: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(textEncoder.encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, 'auto');
  const kService = await hmacSha256(kRegion, 's3');
  return await hmacSha256(kService, 'aws4_request');
}

function getAmzDate(now = new Date()): { amzDate: string; dateStamp: string } {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function encodePathPart(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, char =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function encodeObjectPath(key: string): string {
  return key.split('/').map(encodePathPart).join('/');
}

function endpointHost(config: R2Config): string {
  return `${config.accountId}.r2.cloudflarestorage.com`;
}

function canonicalQuery(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map(key => `${encodePathPart(key)}=${encodePathPart(params[key])}`)
    .join('&');
}

export async function presignR2PutObject(
  config: R2Config,
  options: PresignPutOptions
): Promise<string> {
  const expiresSeconds = Math.max(60, Math.min(options.expiresSeconds ?? 900, 900));
  const { amzDate, dateStamp } = getAmzDate();
  const host = endpointHost(config);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalUri = `/${encodePathPart(config.bucket)}/${encodeObjectPath(options.key)}`;
  const signedHeaders = 'host';
  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${config.accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
  };
  const queryString = canonicalQuery(queryParams);
  const canonicalRequest = [
    'PUT',
    canonicalUri,
    queryString,
    `host:${host}\n`,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');
  const signingKey = await getSigningKey(config.secretAccessKey, dateStamp);
  const signature = bytesToHex(await hmacSha256(signingKey, stringToSign));

  return `https://${host}${canonicalUri}?${queryString}&X-Amz-Signature=${signature}`;
}

export async function signedR2Request(
  config: R2Config,
  options: SignedRequestOptions
): Promise<Request> {
  const bodyBytes = await bodyToBytes(options.body);
  const hasBody = bodyBytes.byteLength > 0;
  const payloadHash = await sha256BytesHex(bodyBytes);
  const { amzDate, dateStamp } = getAmzDate();
  const host = endpointHost(config);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const canonicalUri = `/${encodePathPart(config.bucket)}/${encodeObjectPath(options.key)}`;
  const contentType = (options.contentType || '').trim();
  const signedHeaderParts = [
    ...(hasBody ? ['content-length'] : []),
    ...(contentType ? ['content-type'] : []),
    'host',
    'x-amz-content-sha256',
    'x-amz-date',
  ];
  const signedHeaders = signedHeaderParts.join(';');
  const canonicalHeaders = [
    ...(hasBody ? [`content-length:${bodyBytes.byteLength}`] : []),
    ...(contentType ? [`content-type:${contentType}`] : []),
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    '',
  ].join('\n');
  const canonicalRequest = [
    options.method,
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');
  const signingKey = await getSigningKey(config.secretAccessKey, dateStamp);
  const signature = bytesToHex(await hmacSha256(signingKey, stringToSign));
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(', ');

  return new Request(`https://${host}${canonicalUri}`, {
    method: options.method,
    headers: {
      Authorization: authorization,
      ...(hasBody ? { 'Content-Length': String(bodyBytes.byteLength) } : {}),
      ...(contentType ? { 'Content-Type': contentType } : {}),
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
    body: hasBody ? bodyBytes : undefined,
  });
}
