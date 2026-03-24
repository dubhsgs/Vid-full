import { supabase } from './supabase';

export async function uploadImageToStorage(dataUrl: string, filename?: string): Promise<string | null> {
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
    const blob = new Blob([byteArray], { type: mimeType });

    const fileExt = mimeType.split('/')[1];
    const fileName = filename || `${crypto.randomUUID()}.${fileExt}`;
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
