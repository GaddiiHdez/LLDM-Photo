import type { ImageAdjustments } from '../types/editor';

let lastLutKey = '';
let cachedLumDeltaLut = new Int16Array(256);

function getLumDeltaLut(shadows: number, highlights: number): Int16Array {
  const key = `${shadows}|${highlights}`;
  if (key === lastLutKey) return cachedLumDeltaLut;

  const lut = new Int16Array(256);
  const shadowFactor = shadows / 100;
  const highlightFactor = highlights / 100;

  for (let lum = 0; lum < 256; lum++) {
    let delta = 0;
    if (shadowFactor !== 0 && lum < 140) {
      const weight = Math.pow((140 - lum) / 140, 1.4);
      delta += weight * shadowFactor * 55;
    }
    if (highlightFactor !== 0 && lum > 135) {
      const weight = Math.pow((lum - 135) / 120, 1.25);
      delta += weight * highlightFactor * 65;
    }
    lut[lum] = Math.round(delta);
  }

  lastLutKey = key;
  cachedLumDeltaLut = lut;
  return lut;
}

export interface PixelScratchRef {
  buffer: Uint8ClampedArray | null;
}

export function hasActiveCpuFilters(
  adjustments: ImageAdjustments,
  skipSharpness: boolean = false
): boolean {
  return (
    adjustments.shadows !== 0 ||
    adjustments.highlights !== 0 ||
    adjustments.warmth !== 0 ||
    (!skipSharpness && adjustments.sharpness > 0) ||
    (adjustments.clarity || 0) !== 0 ||
    (adjustments.noiseReduction || 0) > 0
  );
}

/**
 * Procesa píxeles RGBA in-place: mapeo tonal con LUT, calidez con Skin Tone Guard,
 * claridad en medios tonos, reducción de ruido bilateral en sombras y nitidez 3x3.
 * Reutilizable tanto en el hilo principal (preview 60fps) como en Web Worker (exportación).
 */
export function processImagePixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  adjustments: ImageAdjustments,
  skipSharpness: boolean = false,
  scratchRef: PixelScratchRef = { buffer: null }
): void {
  const hasTone =
    adjustments.shadows !== 0 ||
    adjustments.highlights !== 0 ||
    adjustments.warmth !== 0;
  const hasSharpness = !skipSharpness && adjustments.sharpness > 0;
  const hasClarity = (adjustments.clarity || 0) !== 0;
  const hasNoiseReduction = (adjustments.noiseReduction || 0) > 0;
  const skinToneGuard = adjustments.skinToneGuard !== false;

  if (!hasTone && !hasSharpness && !hasClarity && !hasNoiseReduction) return;

  const len = data.length;

  // 1. Mapeo Tonal, Calidez, Protector de Piel y Claridad / Textura
  if (hasTone || hasClarity) {
    const lut =
      adjustments.shadows !== 0 || adjustments.highlights !== 0
        ? getLumDeltaLut(adjustments.shadows, adjustments.highlights)
        : null;
    const warmthFactor = (adjustments.warmth || 0) / 100;
    const wR = Math.round(warmthFactor * 22);
    const wG = Math.round(warmthFactor * 3);
    const wB = -wR;
    const clarityFactor = (adjustments.clarity || 0) / 250;

    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (77 * r + 150 * g + 29 * b) >> 8;
      let d = lut ? lut[lum] : 0;

      // Claridad / Micro-contraste en medios tonos (ropas, textos, detalles de templo)
      if (hasClarity && lum >= 35 && lum <= 220) {
        d += Math.round((lum - 128) * clarityFactor);
      }

      // Protector Inteligente de Tono de Piel (Skin Tone Guard)
      let effWR = wR;
      let effWG = wG;
      let effWB = wB;

      if (skinToneGuard && (wR !== 0 || wG !== 0)) {
        const isSkin = r > g && g > b && r - g >= 12 && g - b >= 4 && r > 60 && b < 215;
        if (isSkin) {
          effWR = Math.round(wR * 0.28);
          effWG = Math.round(wG * 0.4);
          effWB = -effWR;
        }
      }

      const nr = r + d + effWR;
      const ng = g + d + effWG;
      const nb = b + d + effWB;

      data[i] = nr < 0 ? 0 : nr > 255 ? 255 : nr;
      data[i + 1] = ng < 0 ? 0 : ng > 255 ? 255 : ng;
      data[i + 2] = nb < 0 ? 0 : nb > 255 ? 255 : nb;
    }
  }

  // 2. Reducción de Ruido con filtro bilateral en sombras para ISO alto
  if (hasNoiseReduction && width > 4 && height > 4) {
    const nrStrength = (adjustments.noiseReduction || 0) / 100;
    const threshold = Math.round(15 + nrStrength * 35);
    const rowStride = width * 4;

    if (!scratchRef.buffer || scratchRef.buffer.length < len) {
      scratchRef.buffer = new Uint8ClampedArray(len);
    }
    scratchRef.buffer.set(data);
    const copy = scratchRef.buffer;

    for (let py = 1; py < height - 1; py++) {
      let idx = (py * width + 1) * 4;
      for (let px = 1; px < width - 1; px++, idx += 4) {
        const cR = copy[idx];
        const cG = copy[idx + 1];
        const cB = copy[idx + 2];
        const lum = (77 * cR + 150 * cG + 29 * cB) >> 8;

        if (lum < 155) {
          let sumR = cR;
          let sumG = cG;
          let sumB = cB;
          let count = 1;
          const neighbors = [idx - 4, idx + 4, idx - rowStride, idx + rowStride];
          for (let n = 0; n < 4; n++) {
            const nIdx = neighbors[n];
            const nR = copy[nIdx];
            const nG = copy[nIdx + 1];
            const nB = copy[nIdx + 2];
            if (Math.abs(nR - cR) + Math.abs(nG - cG) + Math.abs(nB - cB) < threshold) {
              sumR += nR;
              sumG += nG;
              sumB += nB;
              count++;
            }
          }
          if (count > 1) {
            data[idx] = Math.round(cR * (1 - nrStrength * 0.7) + (sumR / count) * (nrStrength * 0.7));
            data[idx + 1] = Math.round(cG * (1 - nrStrength * 0.7) + (sumG / count) * (nrStrength * 0.7));
            data[idx + 2] = Math.round(cB * (1 - nrStrength * 0.7) + (sumB / count) * (nrStrength * 0.7));
          }
        }
      }
    }
  }

  // 3. Nitidez de detalle (Filtro convolucional 3x3 optimizado)
  if (hasSharpness && width > 2 && height > 2) {
    const amount = (adjustments.sharpness / 100) * 0.45;
    const amtFp = Math.round(amount * 256);

    if (!scratchRef.buffer || scratchRef.buffer.length < len) {
      scratchRef.buffer = new Uint8ClampedArray(len);
    }
    scratchRef.buffer.set(data);
    const copy = scratchRef.buffer;
    const rowStride = width * 4;

    for (let py = 1; py < height - 1; py++) {
      let idx = (py * width + 1) * 4;
      for (let px = 1; px < width - 1; px++, idx += 4) {
        const cR = copy[idx];
        const edgeR = (cR << 2) - copy[idx - 4] - copy[idx + 4] - copy[idx - rowStride] - copy[idx + rowStride];
        const vR = cR + ((edgeR * amtFp) >> 8);
        data[idx] = vR < 0 ? 0 : vR > 255 ? 255 : vR;

        const idxG = idx + 1;
        const cG = copy[idxG];
        const edgeG = (cG << 2) - copy[idxG - 4] - copy[idxG + 4] - copy[idxG - rowStride] - copy[idxG + rowStride];
        const vG = cG + ((edgeG * amtFp) >> 8);
        data[idxG] = vG < 0 ? 0 : vG > 255 ? 255 : vG;

        const idxB = idx + 2;
        const cB = copy[idxB];
        const edgeB = (cB << 2) - copy[idxB - 4] - copy[idxB + 4] - copy[idxB - rowStride] - copy[idxB + rowStride];
        const vB = cB + ((edgeB * amtFp) >> 8);
        data[idxB] = vB < 0 ? 0 : vB > 255 ? 255 : vB;
      }
    }
  }
}
