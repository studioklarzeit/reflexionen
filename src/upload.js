import { sb } from './config.js';

const BUCKET = 'images';

/**
 * Upload a file to Supabase Storage and return the public URL.
 * @param {File} file - The file to upload
 * @param {string} folder - Subfolder (e.g. 'courses' or 'chapters')
 * @returns {Promise<string>} Public URL of the uploaded image
 */
export async function uploadImage(file, folder = 'general') {
  const ext = file.name.split('.').pop().toLowerCase();
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
  if (!allowed.includes(ext)) {
    throw new Error('Nur Bilder erlaubt: ' + allowed.join(', '));
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Bild darf maximal 5 MB gross sein.');
  }

  const name = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;

  const { error } = await sb.storage.from(BUCKET).upload(name, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = sb.storage.from(BUCKET).getPublicUrl(name);
  return data.publicUrl;
}

/**
 * Delete an image from Supabase Storage by its public URL.
 * @param {string} url - The full public URL
 */
export async function deleteImage(url) {
  if (!url) return;
  try {
    const path = url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
    if (path) await sb.storage.from(BUCKET).remove([path]);
  } catch (e) {
    console.warn('Image delete failed:', e);
  }
}
