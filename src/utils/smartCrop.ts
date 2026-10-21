import { loadImage, getTargetAspectRatio } from './canvasEngine';
import type { CropSettings, FrameSettings, PhotoItem } from '../types/editor';

/**
 * Motor de Encuadre Inteligente (Smart Crop)
 * Analiza un mapa de relevancia visual (bordes + tonos de piel + sesgo hacia la parte alta para cabezas)
 * y desliza la ventana de recorte hasta la posición que conserva a las personas y el sujeto principal.
 */

const SAMPLE_MAX = 128;

/** Obtiene la proporción (ancho / alto) real del marco PNG */
export async function getFrameAspectRatio(pngDataUrl: string): Promise<number | null> {
  try {
    const img = await loadImage(pngDataUrl);
    if (img.height > 0) return img.width / img.height;
  } catch {
    // marco no disponible
  }
  return null;
}

function isSkinTone(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return r > 95 && g > 40 && b > 20 && max - min > 15 && Math.abs(r - g) > 12 && r > g && r > b;
}

/**
 * Calcula el desplazamiento (offsetX / offsetY en rango -50..50) óptimo para una proporción dada.
 */
export async function computeSmartCropOffsets(
  imageUrl: string,
  targetRatio: number,
  rotation: number = 0
): Promise<{ offsetX: number; offsetY: number }> {
  const neutral = { offsetX: 0, offsetY: 0 };
  try {
    const img = await loadImage(imageUrl);
    const rawW = img.naturalWidth || img.width;
    const rawH = img.naturalHeight || img.height;
    if (!rawW || !rawH) return neutral;

    const isRotated90 = Math.abs(rotation % 180) === 90;
    const srcRatio = isRotated90 ? 1 / targetRatio : targetRatio;
    const rawRatio = rawW / rawH;

    // Sin eje libre (misma proporción) no hay nada que mover
    if (Math.abs(rawRatio - srcRatio) < 0.01) return neutral;

    const scale = SAMPLE_MAX / Math.max(rawW, rawH);
    const sw = Math.max(8, Math.round(rawW * scale));
    const sh = Math.max(8, Math.round(rawH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return neutral;
    ctx.drawImage(img, 0, 0, sw, sh);
    const { data } = ctx.getImageData(0, 0, sw, sh);
    canvas.width = 0;
    canvas.height = 0;

    // Luminancia
    const lum = new Float32Array(sw * sh);
    for (let i = 0; i < sw * sh; i++) {
      const o = i * 4;
      lum[i] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
    }

    // Mapa de relevancia: gradiente local + bonus de piel
    const sal = new Float32Array(sw * sh);
    for (let y = 1; y < sh - 1; y++) {
      for (let x = 1; x < sw - 1; x++) {
        const i = y * sw + x;
        const gx = Math.abs(lum[i + 1] - lum[i - 1]);
        const gy = Math.abs(lum[i + sw] - lum[i - sw]);
        let s = (gx + gy) / 255;
        const o = i * 4;
        if (isSkinTone(data[o], data[o + 1], data[o + 2])) s += 0.9;
        sal[i] = s;
      }
    }

    if (rawRatio > srcRatio) {
      // La foto es más ancha que el recorte: se desliza la ventana en horizontal
      const winW = Math.max(1, Math.round(sh * srcRatio));
      const range = sw - winW;
      if (range < 1) return neutral;

      const colSum = new Float32Array(sw);
      for (let x = 0; x < sw; x++) {
        let acc = 0;
        for (let y = 0; y < sh; y++) {
          // Ligero sesgo hacia el tercio superior/central (rostros)
          const rowWeight = 1.15 - 0.3 * (y / sh);
          acc += sal[y * sw + x] * rowWeight;
        }
        colSum[x] = acc;
      }

      let best = range / 2;
      let bestScore = -Infinity;
      let windowSum = 0;
      for (let x = 0; x < winW; x++) windowSum += colSum[x];
      for (let pos = 0; pos <= range; pos++) {
        if (pos > 0) windowSum += colSum[pos + winW - 1] - colSum[pos - 1];
        const centerPenalty = Math.abs(pos - range / 2) / Math.max(1, range / 2);
        const score = windowSum * (1 - 0.08 * centerPenalty);
        if (score > bestScore) {
          bestScore = score;
          best = pos;
        }
      }
      const offsetX = Math.max(-50, Math.min(50, ((best / range) - 0.5) * 100));
      return { offsetX: Math.round(offsetX * 10) / 10, offsetY: 0 };
    }

    // La foto es más alta que el recorte: se desliza la ventana en vertical
    const winH = Math.max(1, Math.round(sw / srcRatio));
    const range = sh - winH;
    if (range < 1) return neutral;

    const rowSum = new Float32Array(sh);
    for (let y = 0; y < sh; y++) {
      let acc = 0;
      for (let x = 0; x < sw; x++) acc += sal[y * sw + x];
      // Sesgo fuerte hacia la parte alta: en retratos y grupos las cabezas se conservan
      rowSum[y] = acc * (1.35 - 0.6 * (y / sh));
    }

    let best = range * 0.35;
    let bestScore = -Infinity;
    let windowSum = 0;
    for (let y = 0; y < winH; y++) windowSum += rowSum[y];
    for (let pos = 0; pos <= range; pos++) {
      if (pos > 0) windowSum += rowSum[pos + winH - 1] - rowSum[pos - 1];
      if (windowSum > bestScore) {
        bestScore = windowSum;
        best = pos;
      }
    }
    const offsetY = Math.max(-50, Math.min(50, ((best / range) - 0.5) * 100));
    return { offsetX: 0, offsetY: Math.round(offsetY * 10) / 10 };
  } catch (err) {
    console.warn('[SmartCrop] No se pudo analizar la imagen:', err);
    return neutral;
  }
}

/**
 * Resuelve la proporción efectiva (W/H) de un recorte considerando el marco PNG activo
 */
export function resolveCropRatio(
  crop: CropSettings,
  photoWidth: number,
  photoHeight: number,
  frameRatio: number | null
): number {
  if (crop.aspectRatio === 'frame' && frameRatio) return frameRatio;
  return getTargetAspectRatio(crop.aspectRatio, photoWidth, photoHeight, crop.rotation || 0);
}

/**
 * Ajusta un lote de fotos al marco activo:
 * - Con marco PNG: todas las fotos adoptan la proporción del marco + encuadre inteligente.
 * - Sin marco PNG: las fotos que estaban en modo 'frame' vuelven a su proporción original.
 */
export async function fitPhotosToFrame(photos: PhotoItem[], frame: FrameSettings): Promise<PhotoItem[]> {
  const usesPng = frame.style === 'custom-png' && Boolean(frame.pngDataUrl);
  const frameRatio = usesPng && frame.pngDataUrl ? await getFrameAspectRatio(frame.pngDataUrl) : null;

  return Promise.all(
    photos.map(async (photo) => {
      if (usesPng && frameRatio) {
        const offsets = await computeSmartCropOffsets(photo.originalUrl, frameRatio, photo.crop.rotation || 0);
        return {
          ...photo,
          crop: { ...photo.crop, aspectRatio: 'frame' as const, zoom: 1.0, ...offsets },
        };
      }
      if (photo.crop.aspectRatio === 'frame') {
        return {
          ...photo,
          crop: { ...photo.crop, aspectRatio: 'original' as const, offsetX: 0, offsetY: 0, zoom: 1.0 },
        };
      }
      return photo;
    })
  );
}
