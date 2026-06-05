import { supabase, supabaseAnonKey, supabaseUrl } from './supabase';

const MAX_UPLOAD_BYTES = 200 * 1024;
const MAX_DIMENSION = 1024;
const RESUMABLE_ORIGINAL_THRESHOLD_BYTES = 6 * 1024 * 1024;
const ORIGINAL_STORAGE_BUCKET = 'v-id-originals';
const ORIGINAL_FILE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function compressImageDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      let result = canvas.toDataURL('image/jpeg', quality);
      while (result.length * 0.75 > MAX_UPLOAD_BYTES && quality > 0.3) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(result);
    };
    img.onerror = () => reject(new Error('Failed to load image for compression.'));
    img.src = dataUrl;
  });
}

export async function uploadImageToStorage(dataUrl: string, filename?: string): Promise<string | null> {
  try {
    const compressed = await compressImageDataUrl(dataUrl);
    const base64Data = compressed.split(',')[1];

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });

    const fileName = filename
      ? filename.replace(/\.\w+$/, '.jpg')
      : `${crypto.randomUUID()}.jpg`;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      console.error('[ImageUpload] Upload requires an authenticated user');
      return null;
    }

    const filePath = `avatars/${user.id}/${fileName}`;

    const { error } = await supabase.storage
      .from('v-id-images')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('[ImageUpload] Upload failed:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('v-id-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('[ImageUpload] Error:', error);
    return null;
  }
}

async function uploadOriginalFileResumable(file: File, filePath: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.error('[ImageUpload] Resumable original upload requires an authenticated session');
    return false;
  }

  const { Upload: TusUpload } = await import('tus-js-client');

  return new Promise((resolve) => {
    const upload = new TusUpload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      chunkSize: RESUMABLE_ORIGINAL_THRESHOLD_BYTES,
      retryDelays: [0, 1000, 3000, 5000],
      removeFingerprintOnSuccess: true,
      uploadDataDuringCreation: true,
      metadata: {
        bucketName: ORIGINAL_STORAGE_BUCKET,
        objectName: filePath,
        contentType: file.type,
      },
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'false',
      },
      onError: (error) => {
        console.error('[ImageUpload] Resumable original upload failed:', error);
        resolve(false);
      },
      onSuccess: () => {
        resolve(true);
      },
    });

    upload.start();
  });
}

export async function uploadOriginalFileToStorage(file: File): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      console.error('[ImageUpload] Original upload requires an authenticated user');
      return null;
    }

    const extension = ORIGINAL_FILE_EXTENSIONS[file.type];
    if (!extension) {
      console.error('[ImageUpload] Unsupported original image type:', file.type);
      return null;
    }

    const filePath = `originals/${user.id}/${crypto.randomUUID()}.${extension}`;

    if (file.size > RESUMABLE_ORIGINAL_THRESHOLD_BYTES) {
      const success = await uploadOriginalFileResumable(file, filePath);
      return success ? filePath : null;
    }

    const { error } = await supabase.storage
      .from(ORIGINAL_STORAGE_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('[ImageUpload] Original upload failed:', error);
      return null;
    }

    return filePath;
  } catch (error) {
    console.error('[ImageUpload] Original upload error:', error);
    return null;
  }
}

export function dataURLtoBlob(dataUrl: string): Blob | null {
  try {
    const base64Data = dataUrl.split(',')[1];
    const mimeMatch = dataUrl.match(/data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  } catch (error) {
    console.error('[ImageUpload] dataURLtoBlob error:', error);
    return null;
  }
}
