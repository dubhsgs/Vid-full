import { supabase } from './supabase';
import { calculateSHA256 } from './sha256';

export const MAX_EVIDENCE_FILE_BYTES = 300 * 1024 * 1024;
export const MAX_EVIDENCE_FILES = 3;

export const ALLOWED_EVIDENCE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
]);

interface EvidenceUploadInitResponse {
  success: boolean;
  error?: string;
  upload?: {
    session_id: string;
    upload_url: string;
    method: 'PUT';
    headers?: Record<string, string>;
  };
}

interface EvidenceUploadCompleteResponse {
  success: boolean;
  error?: string;
  result_status?: 'created' | 'duplicate';
  material?: {
    id: string;
    material_type: 'video' | 'image' | 'pdf';
    file_name: string;
    mime_type: string;
    file_size_bytes: number;
    sha256_hash: string;
    created_at: string;
  };
}

export function isAllowedEvidenceFile(file: File): boolean {
  return ALLOWED_EVIDENCE_TYPES.has(file.type) && file.size > 0 && file.size <= MAX_EVIDENCE_FILE_BYTES;
}

export async function uploadEvidenceMaterial(friendlyId: string, file: File): Promise<EvidenceUploadCompleteResponse> {
  const sha256Hash = await calculateSHA256(file);
  const { data: initData, error: initError } = await supabase.functions.invoke<EvidenceUploadInitResponse>(
    'evidence-upload-init',
    {
      body: {
        friendly_id: friendlyId,
        file_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
      },
    }
  );

  if (initError || !initData?.success || !initData.upload?.upload_url) {
    throw new Error(initData?.error || initError?.message || 'EVIDENCE_UPLOAD_INIT_FAILED');
  }

  const uploadResponse = await fetch(initData.upload.upload_url, {
    method: initData.upload.method,
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('EVIDENCE_R2_UPLOAD_FAILED');
  }

  const { data: completeData, error: completeError } = await supabase.functions.invoke<EvidenceUploadCompleteResponse>(
    'evidence-upload-complete',
    {
      body: {
        session_id: initData.upload.session_id,
        sha256_hash: sha256Hash,
      },
    }
  );

  if (completeError || !completeData?.success) {
    throw new Error(completeData?.error || completeError?.message || 'EVIDENCE_UPLOAD_COMPLETE_FAILED');
  }

  return completeData;
}
