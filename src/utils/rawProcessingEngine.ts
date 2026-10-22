import { loadImage } from './canvasEngine';

/**
 * Motor Avanzado de Calibración, Tono e Histograma Fotográfico
 * Inspirado en los motores de revelado RAW y auto-exposición de estudio (Lightroom / DxO / Apple Photos)
 * Diseñado específicamente para eventos y templos (evita rostros y ropas quemadas o saturación artificial).
 */

export interface RawSensorData {
  width: number;
  height: number;
  bitsPerSample: number;
  isRaw: boolean;
  // Campos de compatibilidad histórica
  autoExposureOffset: number;
  blackLevel: number;
  whiteLevel: number;

  // Métricas avanzadas de rango dinámico y luminancia
  meanLum: number;              // Luminancia media global (0 - 1)
  medianLum: number;            // Mediana real (p50) - Inmune a fondos oscuros de auditorio
  centerWeightedLum: number;    // Medición ponderada al centro (sujeto principal/altar)
  p1: number;                   // Punto negro profundo (percentil 1%)
  p5: number;                   // Sombras (percentil 5%)
  p50: number;                  // Tonos medios (percentil 50%)
  p90: number;                  // Altas luces (percentil 90%)
  p95: number;                  // Altas luces críticas (percentil 95%)
  p98: number;                  // Punto blanco (percentil 98%)
  p99: number;                  // Luces especulares / lámparas (percentil 99%)
  dynamicRange: number;         // Rango dinámico efectivo (p98 - p2)

  // Ratios de recorte (Clipping Guard)
  highlightClipRatio: number;   // % de píxeles al borde del blanco (lum > 0.92)
  severeClipRatio: number;      // % de píxeles quemados (lum > 0.985)
  shadowClipRatio: number;      // % de negros empastados (lum < 0.04)

  // Métricas de color y saturación (Anti-Oversaturation)
  avgSaturation: number;        // Saturación promedio (0 - 1)
  p90Saturation: number;        // Saturación en percentil 90 (0 - 1)
  highSatRatio: number;         // % de píxeles con saturación > 0.50

  // Balance de color y temperatura (Kelvin Ratio)
  colorTempRatio: number;       // > 0 cálido/ámbar (tungsteno), < 0 frío (azul/fluorescente)

  // Miniatura ligera pre-generada para el carrete y cuadrícula (evita renderizar 24MP en cada <img> del DOM)
  thumbnailDataUrl?: string;
}

/**
 * Analiza el histograma multiespectral de la imagen en un micro-canvas de 160x120 (< 3ms en móvil)
 * Extrae percentiles de luminancia, medición ponderada al centro, saturación real y balance de temperatura.
 */
export async function analyzeImageHistogram(
  imageUrl: string,
  isRaw: boolean = false
): Promise<RawSensorData | null> {
  try {
    const img = await loadImage(imageUrl);
    const width = img.naturalWidth || img.width || 4000;
    const height = img.naturalHeight || img.height || 3000;

    const thumbMax = 180;
    const thumbScale = Math.min(1, thumbMax / Math.max(width, height));
    const sampleW = Math.max(48, Math.round(width * thumbScale));
    const sampleH = Math.max(48, Math.round(height * thumbScale));
    const canvas = document.createElement('canvas');
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      return {
        width,
        height,
        bitsPerSample: isRaw ? 14 : 8,
        isRaw,
        autoExposureOffset: 0,
        blackLevel: 0.05,
        whiteLevel: 0.92,
        meanLum: 0.40,
        medianLum: 0.40,
        centerWeightedLum: 0.40,
        p1: 0.03,
        p5: 0.08,
        p50: 0.40,
        p90: 0.85,
        p95: 0.92,
        p98: 0.96,
        p99: 0.98,
        dynamicRange: 0.88,
        highlightClipRatio: 0.01,
        severeClipRatio: 0.002,
        shadowClipRatio: 0.02,
        avgSaturation: 0.22,
        p90Saturation: 0.45,
        highSatRatio: 0.05,
        colorTempRatio: 0.05,
      };
    }

    ctx.drawImage(img, 0, 0, sampleW, sampleH);
    const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.78);
    const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
    const numPixels = sampleW * sampleH;

    const lums = new Float32Array(numPixels);
    const sats = new Float32Array(numPixels);

    let totalLum = 0;
    let totalCenterLum = 0;
    let totalCenterWeight = 0;
    let totalSat = 0;
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;

    let highlightClipCount = 0;
    let severeClipCount = 0;
    let shadowClipCount = 0;
    let highSatCount = 0;

    const halfW = sampleW / 2;
    const halfH = sampleH / 2;

    for (let i = 0; i < numPixels; i++) {
      const idx = i * 4;
      const r = data[idx] / 255;
      const g = data[idx + 1] / 255;
      const b = data[idx + 2] / 255;

      // Luminancia perceptual sRGB / ITU-R BT.709
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lums[i] = lum;
      totalLum += lum;

      // Ponderación al centro (enfoca la exposición en el sujeto principal del templo/escenario)
      const x = i % sampleW;
      const y = Math.floor(i / sampleW);
      const dx = (x - halfW) / halfW;
      const dy = (y - halfH) / halfH;
      const rDist = Math.sqrt(dx * dx + dy * dy);
      const centerWeight = Math.max(0.35, 1.65 - rDist * 1.05);

      totalCenterLum += lum * centerWeight;
      totalCenterWeight += centerWeight;

      // Detección de zonas al límite
      if (lum > 0.92) highlightClipCount++;
      if (lum > 0.985) severeClipCount++;
      if (lum < 0.04) shadowClipCount++;

      // Análisis de Saturación HSV (Chroma / Max)
      const maxVal = Math.max(r, g, b);
      const minVal = Math.min(r, g, b);
      const chroma = maxVal - minVal;
      const sat = maxVal > 0.001 ? chroma / maxVal : 0;
      sats[i] = sat;
      totalSat += sat;
      if (sat > 0.50) highSatCount++;

      // Acumuladores de balance de color
      totalR += r;
      totalG += g;
      totalB += b;
    }

    // Ordenamiento rápido para cálculo exacto de percentiles
    lums.sort();
    sats.sort();

    const p1 = lums[Math.floor(numPixels * 0.01)] ?? 0.02;
    const p5 = lums[Math.floor(numPixels * 0.05)] ?? 0.06;
    const p50 = lums[Math.floor(numPixels * 0.50)] ?? 0.40;
    const p90 = lums[Math.floor(numPixels * 0.90)] ?? 0.85;
    const p95 = lums[Math.floor(numPixels * 0.95)] ?? 0.92;
    const p98 = lums[Math.floor(numPixels * 0.98)] ?? 0.96;
    const p99 = lums[Math.floor(numPixels * 0.99)] ?? 0.98;

    const p90Saturation = sats[Math.floor(numPixels * 0.90)] ?? 0.45;

    const meanLum = totalLum / numPixels;
    const centerWeightedLum = totalCenterLum / Math.max(1, totalCenterWeight);
    const avgSaturation = totalSat / numPixels;

    const meanR = totalR / numPixels;
    const meanG = totalG / numPixels;
    const meanB = totalB / numPixels;

    // Ratio de balance de temperatura (> 0 cálido por lámparas de tungsteno, < 0 frío por sombra/fluorescente)
    const colorTempRatio = meanG > 0.01 ? (meanR - meanB) / meanG : 0;

    const blackLevel = p1;
    const whiteLevel = p98;
    const dynamicRange = whiteLevel - blackLevel;

    const highlightClipRatio = highlightClipCount / numPixels;
    const severeClipRatio = severeClipCount / numPixels;
    const shadowClipRatio = shadowClipCount / numPixels;
    const highSatRatio = highSatCount / numPixels;

    // Compensación de exposición calibrada (evita empujes brutales en fotos con fondo oscuro)
    const safeLumBase = Math.max(0.12, 0.65 * centerWeightedLum + 0.35 * p50);
    const autoExposureOffset = (0.42 / safeLumBase) - 1.0;

    return {
      width,
      height,
      bitsPerSample: isRaw ? 14 : 8,
      isRaw,
      autoExposureOffset,
      blackLevel,
      whiteLevel,
      meanLum,
      medianLum: p50,
      centerWeightedLum,
      p1,
      p5,
      p50,
      p90,
      p95,
      p98,
      p99,
      dynamicRange,
      highlightClipRatio,
      severeClipRatio,
      shadowClipRatio,
      avgSaturation,
      p90Saturation,
      highSatRatio,
      colorTempRatio,
      thumbnailDataUrl,
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
 * Interfaz de ajustes calibrados para salida fotográfica profesional
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

/**
 * Algoritmo Avanzado de Auto-Mejora Inteligente
 * - PROTECCIÓN ACTIVA CONTRA QUEMADO DE ALTAS LUCES (Anti-Burn Ceiling)
 * - PROTECCIÓN CONTRA SOBRESATURACIÓN (Smart Vibrance)
 * - EQUILIBRIO DE SOMBRAS SIN RUIDO NI VELO GRISÁCEO
 * - BALANCE DE TEMPERATURA ADAPTATIVO PARA TEMPLOS E ILUMINACIÓN CÁLIDA
 */
export function computeAdaptiveChurchEnhancement(
  metrics?: RawSensorData | null
): EnhancedAdjustments {
  // Ajustes base equilibrados cuando no hay datos directos
  if (!metrics) {
    return {
      brightness: 2,
      contrast: 6,
      saturation: 3,
      warmth: 2,
      shadows: 10,
      highlights: -12,
      sharpness: 14,
    };
  }

  const {
    isRaw = false,
    medianLum = 0.40,
    centerWeightedLum = 0.40,
    p5 = 0.10,
    p95 = 0.92,
    p99 = 0.97,
    dynamicRange = 0.85,
    highlightClipRatio = 0.01,
    severeClipRatio = 0.0,
    shadowClipRatio = 0.02,
    avgSaturation = 0.25,
    p90Saturation = 0.45,
    highSatRatio = 0.05,
    colorTempRatio = 0.05,
  } = metrics;

  // =========================================================================
  // 1. BRILLO / EXPOSICIÓN CON TECHO ANTI-QUEMADO (HIGHLIGHT-GUARDED EXPOSURE)
  // =========================================================================
  // Combinamos la medición ponderada al centro con la mediana para no ser engañados
  // por los fondos negros o maderas oscuras típicas de templos y auditorios.
  const effectiveMidLum = 0.60 * centerWeightedLum + 0.40 * medianLum;
  const targetMidLum = 0.41; // Zona V perceptual (estándar sRGB)

  // Ganancia base deseada
  const baseGain = (targetMidLum - effectiveMidLum) * 26;

  // TECHO DE SEGURIDAD ESTRICTO:
  // Calculamos la ganancia máxima antes de que las altas luces (p95) toquen el 92% del sensor
  const safeHighlightLimit = p95 > 0.40
    ? ((0.92 / p95) - 1.0) * 80
    : 14;

  let brightness = baseGain;

  // Si la fotografía ya tiene píxeles quemados o lámparas/vestiduras blancas al límite:
  if (severeClipRatio > 0.006 || p99 > 0.975) {
    // Prohibir aumentos de exposición; aplicar neutro o suave repliegue protector
    brightness = Math.min(0, Math.max(-10, Math.round(baseGain * 0.4)));
    if (severeClipRatio > 0.02) {
      brightness = Math.min(brightness, -4);
    }
  } else if (p95 > 0.88 || highlightClipRatio > 0.02) {
    // Altas luces muy altas: respetar tajantemente el límite de seguridad
    brightness = Math.min(brightness, safeHighlightLimit);
    brightness = Math.min(5, Math.max(-8, brightness));
  } else {
    // Escena con suficiente rango superior: permitir ganancia controlada (máximo +14)
    brightness = Math.min(14, Math.max(-10, Math.min(brightness, safeHighlightLimit)));
  }
  brightness = Math.round(brightness);

  // =========================================================================
  // 2. RECUPERACIÓN Y PROTECCIÓN ACTIVA DE ALTAS LUCES (HIGHLIGHTS ROLLOFF)
  // =========================================================================
  // En eventos, trajes blancos, velos, candelabros y pantallas se queman fácilmente.
  // Aplicamos compresión no-lineal de altas luces. Nunca positivo en Auto.
  let highlights = -10; // Protección sutil básica siempre activa

  if (p95 > 0.88 || highlightClipRatio > 0.015) {
    const overThreshold = Math.max(0, p95 - 0.88);
    highlights = -14 - Math.round((overThreshold / 0.11) * 24);
  }
  if (severeClipRatio > 0.008 || p99 > 0.97) {
    // Hay zonas severamente al límite: protección reforzada
    highlights = Math.min(highlights, -28);
  }
  if (p95 < 0.70 && highlightClipRatio < 0.002) {
    // Foto oscura uniforme sin altas luces
    highlights = -4;
  }
  highlights = Math.max(-42, Math.min(0, highlights));

  // =========================================================================
  // 3. LEVANTAMIENTO ADAPTATIVO DE SOMBRAS (SHADOWS)
  // =========================================================================
  // Levanta expresiones faciales y detalles en prendas oscuras sin crear ruido ni velo gris.
  let shadows = 8;
  if (p5 < 0.12 || shadowClipRatio > 0.04) {
    const shadowDeficit = Math.max(0, 0.12 - p5);
    shadows = Math.min(20, Math.round(8 + (shadowDeficit / 0.10) * 14));
  } else if (p5 > 0.18) {
    // Sombras ya abiertas naturalmente
    shadows = 4;
  }
  shadows = Math.min(22, Math.max(0, shadows));

  // =========================================================================
  // 4. CONTRASTE ADAPTATIVO SEGÚN RANGO DINÁMICO (CONTRAST)
  // =========================================================================
  // Si la toma ya tiene alto contraste natural, sumar contraste quemaría los blancos.
  let contrast = 6;
  if (dynamicRange < 0.65) {
    // Escena plana, velada o con niebla óptica: recuperar dinamismo
    contrast = Math.min(16, Math.round(10 + (0.65 - dynamicRange) * 25));
  } else if (dynamicRange > 0.86) {
    // Escena con contraste muy amplio: mantener contraste moderado para evitar recortes
    contrast = Math.max(2, Math.round(6 - (dynamicRange - 0.86) * 20));
  }
  contrast = Math.min(16, Math.max(2, contrast));

  // =========================================================================
  // 5. SATURACIÓN INTELIGENTE ANTI-NUCLEAR (SMART VIBRANCE)
  // =========================================================================
  // Detecta si la fotografía ya fue saturada por el ISP del smartphone.
  // Previene que los rostros se tornen naranja brillante o fluorescentes.
  let saturation = 3;
  if (highSatRatio > 0.16 || avgSaturation > 0.30 || p90Saturation > 0.55) {
    // Foto con colores ya al límite: no aumentar saturación (o suavizar si está muy chillona)
    saturation = highSatRatio > 0.25 ? -3 : 0;
  } else if (avgSaturation < 0.18) {
    // Imagen desaturada (RAW neutro o luz difusa): realce saludable
    saturation = Math.min(10, Math.round(5 + (0.18 - avgSaturation) * 24));
  } else {
    // Nivel estándar: sutil viveza elegante
    saturation = 3;
  }
  saturation = Math.min(12, Math.max(-5, saturation));

  // =========================================================================
  // 6. BALANCE DE TEMPERATURA / CALIDEZ ADAPTATIVO (WARMTH)
  // =========================================================================
  // En templos con iluminación cálida de 2700-3200K, sumar calidez empasta los amarillos.
  // Neutralizamos el exceso cálido para mantener las vestiduras blancas impecables.
  let warmth = 2;
  if (colorTempRatio > 0.18) {
    // Exceso de luz amarilla/cálida en el templo: neutralizar sutilmente
    warmth = Math.max(-4, Math.round(-1 - (colorTempRatio - 0.18) * 12));
  } else if (colorTempRatio < -0.08) {
    // Iluminación fría (sombra o nublado): aportar calidez sana a la piel
    warmth = Math.min(6, Math.round(3 + (-0.08 - colorTempRatio) * 12));
  } else {
    warmth = 2;
  }
  warmth = Math.min(8, Math.max(-6, warmth));

  // =========================================================================
  // 7. NITIDEZ Y MICRO-CONTRASTE (SHARPNESS)
  // =========================================================================
  // Los archivos RAW necesitan mayor enfoque (+22); los JPEG ya procesados requieren solo +12
  const sharpness = isRaw ? 22 : 12;

  return {
    brightness,
    contrast,
    saturation,
    warmth,
    shadows,
    highlights,
    sharpness,
  };
}
