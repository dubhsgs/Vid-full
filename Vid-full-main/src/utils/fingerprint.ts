import FingerprintJS from '@fingerprintjs/fingerprintjs';

let clientIdCache: string | null = null;
let fpPromise: Promise<any> | null = null;
const FALLBACK_CLIENT_ID_KEY = 'fallback_client_id';

export async function getClientId(): Promise<string> {
  if (clientIdCache) {
    return clientIdCache;
  }

  try {
    if (!fpPromise) {
      fpPromise = FingerprintJS.load();
    }

    const fp = await fpPromise;
    const result = await fp.get();
    const visitorId = result.visitorId || `fp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    clientIdCache = visitorId;

    return visitorId;
  } catch (error) {
    console.error('Error generating fingerprint:', error);
    const existingFallbackId = localStorage.getItem(FALLBACK_CLIENT_ID_KEY);
    const fallbackId = existingFallbackId || `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(FALLBACK_CLIENT_ID_KEY, fallbackId);
    clientIdCache = fallbackId;
    return fallbackId;
  }
}

export function getCachedClientId(): string | null {
  return clientIdCache || localStorage.getItem(FALLBACK_CLIENT_ID_KEY);
}

export function clearClientIdCache(): void {
  clientIdCache = null;
  fpPromise = null;
}
