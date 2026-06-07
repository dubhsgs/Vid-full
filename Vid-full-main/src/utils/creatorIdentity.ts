import { supabase } from './supabase';

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
  const { data, error } = await supabase.functions.invoke<CreatorIdentityRegisterResponse>(
    'creator-identity-register',
    {
      body: {
        friendly_id: friendlyId,
        country_region: countryRegion,
        document_type: documentType,
        document_number: documentNumber,
      },
    }
  );

  if (error || !data?.success) {
    throw new Error(data?.error || error?.message || 'CREATOR_IDENTITY_REGISTER_FAILED');
  }
}
