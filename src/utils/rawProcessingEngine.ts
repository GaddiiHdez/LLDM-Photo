import { loadImage } from './canvasEngine';

/**
 * Motor de Análisis de Rango Dinámico e Histograma Real (Luminance & Tone Mapping)
 * Analiza la luminancia real de la imagen extraída en milisegundos sin consumir RAM ni batería en móvil.
 */

export interface RawSensorData {
  width: number;
  height: number;
  bitsPerSample: number;
  autoExposureOffset: number;
  blackLevel: number;
  whiteLevel: number;
}

/**
 * Analiza el histograma real de la imagen (o JPEG incrustado del RAW) en un micro-canvas de 160x120
 * para obtener las dimensiones reales y calcular la auto-exposición adaptativa en < 3ms.
 */
export async function analyzeImageHistogram(
  imageUrl: string,
  isRaw: boolean = false
): Promise<RawSensorData | null> {
  try {
    const img = await loadImage(imageUrl);
    const width = img.naturalWidth || img.width || 4000;
    const height = img.naturalHeight || img.height || 3000;

    const sampleW = 160;
    const sampleH = 120;
    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return {
        width,
        height,
        bitsPerSample: isRaw ? 14 : 8,
        autoExposureOffset: 0,
        blackLevel: 0.05,
        whiteLevel: 0.92,
      };
    }

    ctx.drawImage(img, 0, 0, sampleW, sampleH);
    const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
    const numPixels = sampleW * sampleH;

    let totalLum = 0;
    const lums = new Float32Array(numPixels);

    for (let i = 0; i < numPixels; i++) {
      const idx = i * 4;
      const r = data[idx] / 255;
      const g = data[idx + 1] / 255;
      const b = data[idx + 2] / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lums[i] = lum;
      totalLum += lum;
    }

    lums.sort();
    // Percentil 2% para nivel de negro y 98% para nivel de blanco (ignora píxeles muertos/outliers)
    const blackLevel = lums[Math.floor(numPixels * 0.02)] ?? 0.05;
    const whiteLevel = lums[Math.floor(numPixels * 0.98)] ?? 0.95;
    const avgLum = totalLum / numPixels;

    const autoExposureOffset = avgLum > 0.05 ? (0.46 / avgLum) - 1.0 : 0.35;

    return {
      width,
      height,
      bitsPerSample: isRaw ? 14 : 8,
      autoExposureOffset,
      blackLevel,
      whiteLevel,
    };
  } catch (err) {
    console.warn('[Histogram Engine] Error analizando imagen:', err);
    return null;
  }
}

/**
 * Mantiene compatibilidad con llamadas anteriores a decodeTrueRawFile
 */
export async function decodeTrueRawFile(_file: File, drawableUrl?: string): Promise<RawSensorData | null> {
  if (drawableUrl) {
    return analyzeImageHistogram(drawableUrl, true);
  }
  return null;
}

/**
 * Algoritmo Avanzado de Auto-Mejora Inteligente para Fotografía de Eventos e Interior
 */
export interface EnhancedAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  shadows: number;
  highlights: number;
  sharpness: number;
}

export function computeAdaptiveChurchEnhancement(
  rawMetaData?: RawSensorData | null
): EnhancedAdjustments {
  if (!rawMetaData) {
    return {
      brightness: 10,
      contrast: 16,
      saturation: 14,
      warmth: 8,
      shadows: 24,
      highlights: -16,
      sharpness: 25,
    };
  }

  const { autoExposureOffset, blackLevel, whiteLevel } = rawMetaData;

  // 1. Análisis de Exposición Real del Escenario
  let brightness = Math.round(autoExposureOffset * 22);
  brightness = Math.min(28, Math.max(-12, brightness));

  // 2. Recuperación Adaptativa de Sombras (Levantar rostros en sombra)
  let shadows = 20;
  if (blackLevel < 0.15) {
    shadows = Math.min(55, Math.round(30 + (0.15 - blackLevel) * 60));
  }

  // 3. Protección de Altas Luces (Evitar quemar ropa blanca o luces de escenario)
  let highlights = -14;
  if (whiteLevel > 0.85) {
    highlights = Math.max(-55, Math.round(-22 - (whiteLevel - 0.85) * 45));
  }

  const warmth = 10;
  const saturation = 14;
  const contrast = 18;

  return {
    brightness,
    contrast,
    saturation,
    warmth,
    shadows,
    highlights,
    sharpness: 28,
  };
}
