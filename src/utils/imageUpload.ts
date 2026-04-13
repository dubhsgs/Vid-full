import { supabase } from './supabase';

const MAX_UPLOAD_BYTES = 200 * 1024;
const MAX_DIMENSION = 1024;

export async function compressImageDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
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
    const filePath = `avatars/${fileName}`;

    console.log('[ImageUpload] Uploading to storage:', filePath);

    const { data, error } = await supabase.storage
      .from('v-id-images')
      .upload(filePath, blob, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('[ImageUpload] Upload failed:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('v-id-images')
      .getPublicUrl(filePath);

    console.log('[ImageUpload] Upload successful:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('[ImageUpload] Error:', error);
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
