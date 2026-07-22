/** Compressão de foto no cliente: check-ins e avatares não precisam de 12MP. */

/**
 * Redimensiona pra caber em maxDim e recomprime como JPEG.
 * Falha de decode (formato exótico) rejeita — o chamador mostra o erro.
 */
export async function compressImage(
  file: File | Blob,
  maxDim = 1080,
  quality = 0.82
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas indisponível");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) throw new Error("falha ao comprimir a imagem");
    return blob;
  } finally {
    bitmap.close();
  }
}
