const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2000;
const MIN_IMAGE_DIMENSION = 500;

export function validateImageFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return 'Use uma imagem JPG, PNG, WebP ou AVIF.';
  if (file.size > MAX_IMAGE_BYTES) return 'A imagem deve ter no máximo 8 MB.';
  return null;
}

export async function prepareProductImage(file: File): Promise<File> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const bitmap = await createImageBitmap(file);
  if (bitmap.width < MIN_IMAGE_DIMENSION || bitmap.height < MIN_IMAGE_DIMENSION) {
    bitmap.close();
    throw new Error(`A imagem deve ter pelo menos ${MIN_IMAGE_DIMENSION}×${MIN_IMAGE_DIMENSION} pixels.`);
  }

  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
  if (!blob) throw new Error('Não foi possível otimizar a imagem.');
  const basename = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-');
  return new File([blob], `${basename}.webp`, { type: 'image/webp', lastModified: Date.now() });
}
