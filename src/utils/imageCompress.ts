/**
 * Compresses an uploaded image file to JPEG base64 <= 35KB (raw base64 without data: prefix)
 * so it syncs seamlessly across Android and Web inside Firestore module documents.
 */
export async function compressImageToBase64(
  file: File,
  maxBytes = 35 * 1024
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('File bukan gambar yang valid.'));
    image.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser tidak mendukung pemrosesan kanvas gambar.');
  }

  let maxDim = 800;
  let quality = 0.82;

  for (let attempt = 0; attempt < 12; attempt++) {
    const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
    const targetW = Math.max(64, Math.round(img.width * ratio));
    const targetH = Math.max(64, Math.round(img.height * ratio));

    canvas.width = targetW;
    canvas.height = targetH;
    ctx.fillStyle = '#090B10';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const outDataUrl = canvas.toDataURL('image/jpeg', quality);
    const rawBase64 = outDataUrl.split(',')[1] || '';

    // Check UTF-8 byte length of raw base64 string (stored directly in Firestore)
    if (rawBase64.length <= maxBytes) {
      return rawBase64;
    }

    if (quality > 0.32) {
      quality -= 0.14;
    } else {
      maxDim = Math.round(maxDim * 0.72);
      quality = 0.65;
    }
  }

  // Final aggressive pass
  const ratio = Math.min(1, 240 / Math.max(img.width, img.height));
  canvas.width = Math.max(48, Math.round(img.width * ratio));
  canvas.height = Math.max(48, Math.round(img.height * ratio));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const finalBase64 = (canvas.toDataURL('image/jpeg', 0.25).split(',')[1] || '').slice(
    0,
    maxBytes
  );
  return finalBase64;
}

export function resolveImageSrc(urlOrUri?: string, b64?: string): string | null {
  if (b64 && b64.trim().length > 0) {
    const clean = b64.trim();
    return clean.startsWith('data:') ? clean : `data:image/jpeg;base64,${clean}`;
  }
  if (urlOrUri && urlOrUri.trim().length > 0) {
    const clean = urlOrUri.trim();
    if (
      clean.startsWith('http://') ||
      clean.startsWith('https://') ||
      clean.startsWith('data:image/')
    ) {
      return clean;
    }
  }
  return null;
}
