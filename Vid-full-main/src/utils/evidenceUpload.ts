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

type EvidenceUploadPhase = 'hashing' | 'preparing' | 'uploading' | 'confirming' | 'complete';

export type EvidenceUploadProgress = {
  phase: EvidenceUploadPhase;
  percent: number;
  loadedBytes?: number;
  totalBytes?: number;
};

type EvidenceUploadProgressHandler = (progress: EvidenceUploadProgress) => void;

export function isAllowedEvidenceFile(file: File): boolean {
  return ALLOWED_EVIDENCE_TYPES.has(file.type) && file.size > 0 && file.size <= MAX_EVIDENCE_FILE_BYTES;
}

function uploadToR2(
  uploadUrl: string,
  method: 'PUT',
  headers: Record<string, string>,
  file: File,
  onProgress?: EvidenceUploadProgressHandler
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, uploadUrl);

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      const totalBytes = event.lengthComputable ? event.total : file.size;
      const loadedBytes = event.loaded;
      const uploadPercent = totalBytes > 0 ? loadedBytes / totalBytes : 0;
      onProgress?.({
        phase: 'uploading',
        percent: 15 + Math.min(uploadPercent, 1) * 80,
        loadedBytes,
        totalBytes,
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error('EVIDENCE_R2_UPLOAD_FAILED'));
    };
    xhr.onerror = () => reject(new Error('EVIDENCE_R2_UPLOAD_FAILED'));
    xhr.onabort = () => reject(new Error('EVIDENCE_R2_UPLOAD_ABORTED'));
    xhr.send(file);
  });
}

export async function uploadEvidenceMaterial(
  friendlyId: string,
  file: File,
  onProgress?: EvidenceUploadProgressHandler
): Promise<EvidenceUploadCompleteResponse> {
  onProgress?.({ phase: 'hashing', percent: 0 });
  const sha256Hash = await calculateSHA256(file);
  onProgress?.({ phase: 'preparing', percent: 10 });

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

  onProgress?.({ phase: 'uploading', percent: 15, loadedBytes: 0, totalBytes: file.size });
  await uploadToR2(initData.upload.upload_url, initData.upload.method, {
    'Content-Type': file.type,
    ...(initData.upload.headers || {}),
  }, file, onProgress);
  onProgress?.({ phase: 'confirming', percent: 95 });

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

  onProgress?.({ phase: 'complete', percent: 100 });
  return completeData;
}
