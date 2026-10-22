import type { PhotoMetadata } from '../types/editor';

/**
 * Parser binario EXIF de ultra alto rendimiento y cero dependencias para BereaSnap.
 * Lee únicamente los primeros 128KB de archivos JPEG y RAW (Canon .CR2, Nikon .NEF, Sony .ARW, Adobe .DNG).
 * Tiempo de ejecución típico: < 3 milisegundos por archivo.
 */
export async function extractPhotoMetadata(file: File): Promise<PhotoMetadata> {
  const fallbackDate = file.lastModified ? new Date(file.lastModified) : new Date();

  try {
    // Leer solo los primeros 128KB (suficiente para todos los encabezados EXIF/TIFF)
    const slice = file.slice(0, 131072);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);

    let tiffStart = -1;
    let isLittleEndian = true;

    // 1. Detección directa de formato RAW / TIFF (empieza con II\x2A\x00 o MM\x00\x2A)
    if (bytes.length >= 4) {
      const b0 = bytes[0];
      const b1 = bytes[1];
      if ((b0 === 0x49 && b1 === 0x49) || (b0 === 0x4d && b1 === 0x4d)) {
        tiffStart = 0;
        isLittleEndian = b0 === 0x49;
      }
    }

    // 2. Detección en JPEG: buscar marcador APP1 (0xFF 0xE1) con cabecera "Exif\0\0"
    if (tiffStart === -1 && bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
      let offset = 2;
      while (offset < bytes.length - 4) {
        if (bytes[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = bytes[offset + 1];
        if (marker === 0xda || marker === 0xd9) break; // SOS (Start of Scan) o EOI

        const len = view.getUint16(offset + 2, false);
        if (marker === 0xe1 && offset + 10 < bytes.length) {
          // Verificar firma "Exif\0\0"
          const isExifSignature =
            bytes[offset + 4] === 0x45 && // E
            bytes[offset + 5] === 0x78 && // x
            bytes[offset + 6] === 0x69 && // i
            bytes[offset + 7] === 0x66 && // f
            bytes[offset + 8] === 0x00 &&
            bytes[offset + 9] === 0x00;

          if (isExifSignature) {
            tiffStart = offset + 10;
            const tb0 = bytes[tiffStart];
            const tb1 = bytes[tiffStart + 1];
            isLittleEndian = tb0 === 0x49 && tb1 === 0x49;
            break;
          }
        }
        offset += 2 + len;
      }
    }

    // Si no se encontró bloque TIFF, retornar fallback con la fecha del archivo
    if (tiffStart === -1 || tiffStart + 8 > bytes.length) {
      return buildMetadataResult(fallbackDate);
    }

    const readUint16 = (off: number): number => {
      if (off + 2 > bytes.length) return 0;
      return view.getUint16(off, isLittleEndian);
    };

    const readUint32 = (off: number): number => {
      if (off + 4 > bytes.length) return 0;
      return view.getUint32(off, isLittleEndian);
    };

    const readAscii = (off: number, len: number): string => {
      if (off >= bytes.length) return '';
      const maxLen = Math.min(len, bytes.length - off);
      let str = '';
      for (let i = 0; i < maxLen; i++) {
        const code = bytes[off + i];
        if (code === 0) break; // Fin de cadena C-string
        str += String.fromCharCode(code);
      }
      return str.trim();
    };

    const readRational = (off: number): number => {
      if (off + 8 > bytes.length) return 0;
      const num = readUint32(off);
      const den = readUint32(off + 4);
      return den !== 0 ? num / den : 0;
    };

    let dateStr = '';
    let exifPointer = 0;
    let cameraMake: string | undefined;
    let cameraModel: string | undefined;
    let lensModel: string | undefined;
    let iso: number | undefined;
    let fNumber: number | undefined;
    let exposureTime: string | undefined;
    let focalLength: string | undefined;

    const parseIFD = (ifdOffset: number) => {
      if (ifdOffset + 2 > bytes.length) return;
      const entryCount = readUint16(ifdOffset);
      let cur = ifdOffset + 2;

      for (let i = 0; i < entryCount; i++) {
        if (cur + 12 > bytes.length) break;
        const tag = readUint16(cur);
        const type = readUint16(cur + 2);
        const count = readUint32(cur + 4);
        const valOffset = cur + 8;

        const getValPtr = (): number => {
          const typeSize = type === 5 || type === 10 ? 8 : (type === 3 ? 2 : (type === 4 || type === 9 ? 4 : 1));
          const byteSize = count * typeSize;
          if (byteSize <= 4) {
            return valOffset;
          }
          return tiffStart + readUint32(valOffset);
        };

        switch (tag) {
          case 0x010f: // Make
            cameraMake = readAscii(getValPtr(), count);
            break;
          case 0x0110: // Model
            cameraModel = readAscii(getValPtr(), count);
            break;
          case 0x0132: // ModifyDate (fallback si no hay DateTimeOriginal)
            if (!dateStr) dateStr = readAscii(getValPtr(), count);
            break;
          case 0x8769: // ExifIFDPointer
            exifPointer = tiffStart + readUint32(valOffset);
            break;
          case 0x9003: // DateTimeOriginal
            dateStr = readAscii(getValPtr(), count);
            break;
          case 0x9004: // CreateDate / DateTimeDigitized
            if (!dateStr) dateStr = readAscii(getValPtr(), count);
            break;
          case 0x829a: { // ExposureTime
            const ptr = getValPtr();
            const num = readUint32(ptr);
            const den = readUint32(ptr + 4);
            if (den !== 0) {
              exposureTime = num < den ? `1/${Math.round(den / num)}s` : `${(num / den).toFixed(1)}s`;
            }
            break;
          }
          case 0x829d: { // FNumber
            const fVal = readRational(getValPtr());
            if (fVal > 0) fNumber = Number(fVal.toFixed(1));
            break;
          }
          case 0x8827: // PhotographicSensitivity / ISO
            iso = type === 3 ? readUint16(valOffset) : readUint32(getValPtr());
            break;
          case 0x920a: { // FocalLength
            const fl = readRational(getValPtr());
            if (fl > 0) focalLength = `${Math.round(fl)}mm`;
            break;
          }
          case 0xa434: // LensModel
            lensModel = readAscii(getValPtr(), count);
            break;
        }

        cur += 12;
      }
    };

    // Parsear IFD0
    const ifd0Offset = tiffStart + readUint32(tiffStart + 4);
    if (ifd0Offset < bytes.length) {
      parseIFD(ifd0Offset);
    }

    // Parsear Sub-IFD de Exif si existe
    if (exifPointer > 0 && exifPointer < bytes.length) {
      parseIFD(exifPointer);
    }

    // Parsear la fecha encontrada
    let captureDate = parseExifDateString(dateStr);
    if (!captureDate) {
      captureDate = fallbackDate;
    }

    const metadata = buildMetadataResult(captureDate);
    metadata.cameraMake = cleanCameraString(cameraMake);
    metadata.cameraModel = cleanCameraString(cameraModel);
    metadata.lensModel = cleanCameraString(lensModel);
    metadata.iso = iso;
    metadata.fNumber = fNumber;
    metadata.exposureTime = exposureTime;
    metadata.focalLength = focalLength;

    return metadata;
  } catch (err) {
    console.warn('[EXIF] No se pudo extraer EXIF de la imagen:', err);
    return buildMetadataResult(fallbackDate);
  }
}

/**
 * Convierte un formato "YYYY:MM:DD HH:MM:SS" a un objeto Date
 */
function parseExifDateString(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})[:\-\/](\d{2})[:\-\/](\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [, y, m, d, h, min, s] = match;
    const date = new Date(
      parseInt(y, 10),
      parseInt(m, 10) - 1,
      parseInt(d, 10),
      parseInt(h, 10),
      parseInt(min, 10),
      parseInt(s, 10)
    );
    if (!isNaN(date.getTime())) return date;
  }
  const fallback = new Date(dateStr);
  return !isNaN(fallback.getTime()) ? fallback : null;
}

function cleanCameraString(val?: string): string | undefined {
  if (!val) return undefined;
  const clean = val.replace(/\0/g, '').trim();
  return clean.length > 0 ? clean : undefined;
}

function buildMetadataResult(date: Date): PhotoMetadata {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  const timeFormatted = `${hours12}:${minutes} ${ampm}`;

  return {
    dateTimeOriginal: date,
    timeFormatted,
  };
}
