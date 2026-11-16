/**
 * Decodificador de Archivos RAW de Cámara (Nikon .NEF, Canon .CR2, Sony .ARW, .DNG)
 * Extrae la vista previa JPEG comprimida de alta calidad empotrada por la cámara
 * leyendo por bloques de 4 MB y devolviendo una referencia directa sin duplicar RAM.
 */

const RAW_SCAN_CHUNK_BYTES = 4 * 1024 * 1024;
const RAW_SCAN_OVERLAP_BYTES = 3;

export async function getDrawableImageUrl(file: File): Promise<string> {
  const isRaw = /\.(cr2|nef|arw|dng|raf|orf|pef)$/i.test(file.name);

  // Si es un formato web normal (.jpg, .png, .webp), usar URL directa
  if (!isRaw) {
    return URL.createObjectURL(file);
  }

  try {
    const jpegBlob = await extractEmbeddedJpeg(file);
    if (jpegBlob) {
      return URL.createObjectURL(jpegBlob);
    }
  } catch (err) {
    console.warn(`[RAW Decoder] No se pudo extraer JPEG del archivo RAW ${file.name}:`, err);
  }

  // Fallback si no encuentra JPEG empotrado
  return URL.createObjectURL(file);
}

/**
 * Escanea el archivo RAW por bloques de 4 MB usando Uint8Array.indexOf nativo
 * para localizar el segmento JPEG completo más grande sin cargar todo el archivo a la vez en RAM.
 */
async function extractEmbeddedJpeg(file: File): Promise<Blob | null> {
  const fileSize = file.size;
  if (fileSize < 10000) return null;

  let bestStart = -1;
  let bestLength = 0;

  let currentStart = -1;
  let jpegDepth = 0;
  let offset = 0;

  while (offset < fileSize) {
    const end = Math.min(fileSize, offset + RAW_SCAN_CHUNK_BYTES);
    const isLastChunk = end === fileSize;
    const buffer = await file.slice(offset, end).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const scanLimit = isLastChunk ? bytes.length - 1 : bytes.length - RAW_SCAN_OVERLAP_BYTES;

    let pos = 0;
    while (pos < scanLimit) {
      const ffIdx = bytes.indexOf(0xff, pos);
      if (ffIdx === -1 || ffIdx >= scanLimit) break;

      const nextByte = bytes[ffIdx + 1];

      // SOI: 0xFF 0xD8 0xFF
      if (nextByte === 0xd8 && ffIdx + 2 < bytes.length && bytes[ffIdx + 2] === 0xff) {
        if (currentStart === -1) {
          currentStart = offset + ffIdx;
          jpegDepth = 1;
        } else {
          // Evita truncar la vista previa Full-HD si contiene un thumbnail EXIF interno
          jpegDepth++;
        }
        pos = ffIdx + 3;
        continue;
      }

      // EOI: 0xFF 0xD9
      if (nextByte === 0xd9 && currentStart !== -1) {
        jpegDepth--;
        if (jpegDepth <= 0) {
          const globalEnd = offset + ffIdx + 2;
          const length = globalEnd - currentStart;
          if (length > bestLength) {
            bestStart = currentStart;
            bestLength = length;
          }
          currentStart = -1;
          jpegDepth = 0;
        }
        pos = ffIdx + 2;
        continue;
      }

      pos = ffIdx + 1;
    }

    if (isLastChunk) break;
    offset = end - RAW_SCAN_OVERLAP_BYTES;
  }

  // Referencia directa al segmento JPEG dentro del File original (cero copias extra en RAM)
  if (bestStart !== -1 && bestLength > 10000) {
    return file.slice(bestStart, bestStart + bestLength, 'image/jpeg');
  }

  return null;
}
