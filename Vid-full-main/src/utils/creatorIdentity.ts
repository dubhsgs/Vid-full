import { supabase, supabaseAnonKey, supabaseUrl } from './supabase';

export type CreatorDocumentType = 'national_id' | 'passport' | 'driver_license' | 'other';

interface CreatorIdentityRegisterResponse {
  success: boolean;
  error?: string;
}

export async function registerCreatorIdentity(
  friendlyId: string,
  countryRegion: string,
  documentType: CreatorDocumentType,
  documentNumber: string
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${supabaseUrl}/functions/v1/creator-identity-register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${session?.access_token || supabaseAnonKey}`,
    },
    body: JSON.stringify({
      friendly_id: friendlyId,
      country_region: countryRegion,
      document_type: documentType,
      document_number: documentNumber,
    }),
  });
  const data = await response.json().catch(() => null) as CreatorIdentityRegisterResponse | null;

  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `CREATOR_IDENTITY_REGISTER_FAILED_${response.status}`);
  }
}
