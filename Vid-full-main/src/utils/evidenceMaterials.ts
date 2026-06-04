import { supabase } from './supabase';

export const MAX_EVIDENCE_FILE_BYTES = 300 * 1024 * 1024;
export const MAX_EVIDENCE_FILE_MB = MAX_EVIDENCE_FILE_BYTES / (1024 * 1024);
export const MAX_EVIDENCE_FILES = 3;

export const ALLOWED_EVIDENCE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
]);

const EVIDENCE_STORAGE_BUCKET = 'v-id-evidence-temp';

const EVIDENCE_FILE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'application/pdf': 'pdf',
};

export function isAllowedEvidenceFile(file: File): boolean {
  return ALLOWED_EVIDENCE_TYPES.has(file.type);
}

export function getEvidenceMaterialType(file: File): 'video' | 'image' | 'pdf' {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('image/')) return 'image';
  return 'pdf';
}

export function formatEvidenceFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export async function uploadEvidenceMaterialToStorage(file: File): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      console.error('[EvidenceMaterials] Upload requires an authenticated user');
      return null;
    }

    const extension = EVIDENCE_FILE_EXTENSIONS[file.type];
    if (!extension) {
      console.error('[EvidenceMaterials] Unsupported evidence file type:', file.type);
      return null;
    }

    const filePath = `evidence/${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(EVIDENCE_STORAGE_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('[EvidenceMaterials] Upload failed:', error);
      return null;
    }

    return filePath;
  } catch (error) {
    console.error('[EvidenceMaterials] Upload error:', error);
    return null;
  }
}
