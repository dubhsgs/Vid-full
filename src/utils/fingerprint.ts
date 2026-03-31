import FingerprintJS from '@fingerprintjs/fingerprintjs';

let clientIdCache: string | null = null;
let fpPromise: Promise<any> | null = null;

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
    clientIdCache = result.visitorId;

    return clientIdCache;
  } catch (error) {
    console.error('Error generating fingerprint:', error);
    const fallbackId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('fallback_client_id', fallbackId);
    return fallbackId;
  }
}

export function getCachedClientId(): string | null {
  return clientIdCache || sessionStorage.getItem('fallback_client_id');
}

export function clearClientIdCache(): void {
  clientIdCache = null;
  fpPromise = null;
}
