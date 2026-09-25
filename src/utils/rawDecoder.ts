/**
 * Decodificador de Archivos RAW de Cámara (Nikon .NEF, Canon .CR2, Sony .ARW, .DNG)
 * Extrae la vista previa JPEG comprimida de alta calidad empotrada por la cámara.
 */

export async function getDrawableImageUrl(file: File): Promise<string> {
  const isRaw = /\.(cr2|nef|arw|dng|raf|orf|pef)$/i.test(file.name);

  // Si es un formato web normal (.jpg, .png, .webp), usar URL directa
  if (!isRaw) {
    return URL.createObjectURL(file);
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const jpegBlob = extractEmbeddedJpeg(bytes);
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
 * Escanea la estructura binaria TIFF/RAW buscando los segmentos de imagen JPEG (0xFFD8 a 0xFFD9)
 */
function extractEmbeddedJpeg(bytes: Uint8Array): Blob | null {
  let bestStart = -1;
  let bestLength = 0;

  const len = bytes.length;

  // Escaneo buscando cabeceras SOI (0xFF 0xD8 0xFF)
  for (let i = 0; i < len - 4; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
      // Buscar fin de JPEG EOI (0xFF 0xD9)
      for (let j = i + 1000; j < len - 1; j += 1) {
        if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
          const currentLen = j + 2 - i;
          // Preferir el JPEG empotrado más grande (Vista previa Full-HD / 4K de la cámara)
          if (currentLen > bestLength) {
            bestStart = i;
            bestLength = currentLen;
          }
          i = j + 1; // Saltar al siguiente segmento
          break;
        }
      }
    }
  }

  // Si se encontró un segmento JPEG válido de más de 10KB
  if (bestStart !== -1 && bestLength > 10000) {
    const jpegBytes = bytes.subarray(bestStart, bestStart + bestLength);
    return new Blob([new Uint8Array(jpegBytes)], { type: 'image/jpeg' });
  }

  return null;
}
