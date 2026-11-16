import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion } from '../src/services/updateService';
import { classifyChurchEvent, formatFrameDate } from '../src/utils/eventClassifier';
import { processImagePixels, hasActiveCpuFilters } from '../src/utils/pixelFilters';
import { computeAdaptiveChurchEnhancement, type RawSensorData } from '../src/utils/rawProcessingEngine';
import { resolveCropRatio } from '../src/utils/smartCrop';
import type { ImageAdjustments, CropSettings } from '../src/types/editor';

describe('isNewerVersion (SemVer)', () => {
  it('detecta versiones mayores, menores y parches con o sin prefijo v', () => {
    assert.equal(isNewerVersion('v2.0.0', '1.5.4'), true);
    assert.equal(isNewerVersion('v1.6.0', '1.5.4'), true);
    assert.equal(isNewerVersion('v1.5.5', '1.5.4'), true);
    assert.equal(isNewerVersion('1.5.5', '1.5.4'), true);
  });

  it('devuelve false para versiones iguales o anteriores', () => {
    assert.equal(isNewerVersion('v1.5.4', '1.5.4'), false);
    assert.equal(isNewerVersion('v1.5.3', '1.5.4'), false);
    assert.equal(isNewerVersion('v1.4.9', '1.5.4'), false);
    assert.equal(isNewerVersion('v0.9.9', '1.0.0'), false);
  });

  it('ignora sufijos prerelease al comparar segmentos numéricos', () => {
    assert.equal(isNewerVersion('v1.6.0-beta.1', '1.5.4'), true);
    assert.equal(isNewerVersion('v1.5.4-rc1', '1.5.4'), false);
  });
});

describe('classifyChurchEvent y formatFrameDate', () => {
  it('clasifica Escuela Dominical el domingo por la mañana', () => {
    const sundayMorning = new Date(2026, 9, 25, 10, 15, 0); // Domingo 25 Oct 2026 10:15
    const res = classifyChurchEvent(sundayMorning);
    assert.equal(res.eventTitle, 'Escuela Dominical');
    assert.equal(res.formattedDate, '25 de Octubre, 2026');
    assert.equal(res.dayOfWeekName, 'Domingo');
  });

  it('clasifica Oración 5am, 9am y 7pm entre semana', () => {
    assert.equal(classifyChurchEvent(new Date(2026, 9, 22, 5, 30, 0)).eventTitle, 'Oración 5am');
    assert.equal(classifyChurchEvent(new Date(2026, 9, 22, 9, 15, 0)).eventTitle, 'Oración 9am');
    assert.equal(classifyChurchEvent(new Date(2026, 9, 22, 19, 0, 0)).eventTitle, 'Oración 7pm');
    assert.equal(classifyChurchEvent(new Date(2026, 9, 22, 13, 0, 0)).eventTitle, 'Estudio Bíblico');
  });

  it('clasifica Reunión de Jóvenes el sábado por la tarde', () => {
    const saturdayAfternoon = new Date(2026, 9, 24, 17, 30, 0);
    assert.equal(classifyChurchEvent(saturdayAfternoon).eventTitle, 'Reunión de Jóvenes');
    assert.equal(formatFrameDate(saturdayAfternoon), '24 de Octubre, 2026');
  });
});

describe('pixelFilters (processImagePixels & hasActiveCpuFilters)', () => {
  const baseAdj: ImageAdjustments = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
    shadows: 0,
    highlights: 0,
    sharpness: 0,
    clarity: 0,
    noiseReduction: 0,
    skinToneGuard: true,
  };

  it('hasActiveCpuFilters detecta ajustes activos respetando skipSharpness', () => {
    assert.equal(hasActiveCpuFilters(baseAdj), false);
    assert.equal(hasActiveCpuFilters({ ...baseAdj, tint: 25 }), true);
    assert.equal(hasActiveCpuFilters({ ...baseAdj, sharpness: 40 }, false), true);
    assert.equal(hasActiveCpuFilters({ ...baseAdj, sharpness: 40 }, true), false);
    assert.equal(hasActiveCpuFilters({ ...baseAdj, clarity: 25 }), true);
    assert.equal(hasActiveCpuFilters({ ...baseAdj, noiseReduction: 30 }), true);
  });

  it('el parámetro tint (Matiz) desplaza hacia verde o magenta correctamente', () => {
    const magentaPixels = new Uint8ClampedArray([120, 140, 120, 255]);
    processImagePixels(magentaPixels, 1, 1, { ...baseAdj, tint: 100, skinToneGuard: false }, true);
    assert.ok(magentaPixels[1] < 140 && magentaPixels[0] > 120 && magentaPixels[2] > 120);
  });

  it('Skin Tone Guard atenúa el incremento cálido en píxeles de tono de piel frente a fondos neutros', () => {
    // Pixel 0: tono piel (R=180, G=120, B=90), Pixel 1: gris neutro (R=130, G=130, B=130)
    const pixels = new Uint8ClampedArray([180, 120, 90, 255, 130, 130, 130, 255]);
    processImagePixels(pixels, 2, 1, { ...baseAdj, warmth: 100, skinToneGuard: true }, true);

    const skinDeltaR = pixels[0] - 180;
    const neutralDeltaR = pixels[4] - 130;
    assert.ok(skinDeltaR < neutralDeltaR, `Se esperaba skinDeltaR (${skinDeltaR}) < neutralDeltaR (${neutralDeltaR})`);
    assert.equal(pixels[3], 255);
    assert.equal(pixels[7], 255);
  });

  it('aplica reducción de ruido y nitidez manteniendo canales en [0, 255]', () => {
    const w = 6;
    const h = 6;
    const pixels = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = i % 16 === 0 ? 40 : 90;
      pixels[i + 1] = 85;
      pixels[i + 2] = 80;
      pixels[i + 3] = 255;
    }
    processImagePixels(
      pixels,
      w,
      h,
      { ...baseAdj, noiseReduction: 80, sharpness: 60, clarity: 30 },
      false
    );
    for (let i = 0; i < pixels.length; i++) {
      assert.ok(pixels[i] >= 0 && pixels[i] <= 255);
    }
  });
});

describe('computeAdaptiveChurchEnhancement', () => {
  it('devuelve valores base equilibrados cuando no hay métricas', () => {
    const res = computeAdaptiveChurchEnhancement(null);
    assert.equal(res.brightness, 2);
    assert.equal(res.contrast, 6);
    assert.ok(res.highlights < 0);
  });

  it('recupera exposición y sombras en toma oscura con margen en luces altas y protege si hay recorte', () => {
    const makeSensor = (overrides: Partial<RawSensorData>): RawSensorData => ({
      width: 4000,
      height: 3000,
      bitsPerSample: 14,
      isRaw: true,
      autoExposureOffset: 0,
      blackLevel: 0,
      whiteLevel: 16383,
      meanLum: 0.4,
      medianLum: 0.4,
      centerWeightedLum: 0.4,
      p1: 0.02,
      p5: 0.1,
      p50: 0.4,
      p90: 0.8,
      p95: 0.9,
      p98: 0.95,
      p99: 0.97,
      dynamicRange: 0.85,
      highlightClipRatio: 0,
      severeClipRatio: 0,
      shadowClipRatio: 0.02,
      avgSaturation: 0.25,
      p90Saturation: 0.45,
      highSatRatio: 0.03,
      colorTempRatio: 0.05,
      ...overrides,
    });

    const dark = computeAdaptiveChurchEnhancement(
      makeSensor({
        meanLum: 0.22,
        medianLum: 0.22,
        centerWeightedLum: 0.21,
        p5: 0.03,
        p90: 0.55,
        p95: 0.65,
        p98: 0.72,
        p99: 0.78,
        dynamicRange: 0.69,
        shadowClipRatio: 0.14,
      })
    );
    assert.ok(dark.brightness > 0, `Se esperaba brightness > 0, fue ${dark.brightness}`);
    assert.ok(dark.shadows > 10, `Se esperaba shadows > 10, fue ${dark.shadows}`);

    const clipped = computeAdaptiveChurchEnhancement(
      makeSensor({
        medianLum: 0.55,
        centerWeightedLum: 0.58,
        p95: 0.97,
        p99: 0.99,
        highlightClipRatio: 0.08,
        severeClipRatio: 0.03,
      })
    );
    assert.ok(clipped.brightness <= 0, `Se esperaba brightness <= 0 con luces quemadas, fue ${clipped.brightness}`);
    assert.ok(clipped.highlights < 0, `Se esperaba highlights < 0, fue ${clipped.highlights}`);
  });
});

describe('resolveCropRatio', () => {
  const baseCrop: CropSettings = {
    aspectRatio: 'original',
    orientation: 'landscape',
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    rotation: 0,
  };

  it('calcula proporción original, invertida con rotación de 90° y proporción de marco', () => {
    assert.equal(resolveCropRatio(baseCrop, 3000, 2000, null), 1.5);
    assert.ok(Math.abs(resolveCropRatio({ ...baseCrop, rotation: 90 }, 3000, 2000, null) - 2 / 3) < 0.001);
    assert.equal(resolveCropRatio({ ...baseCrop, aspectRatio: 'frame' }, 3000, 2000, 1.25), 1.25);
    assert.equal(resolveCropRatio({ ...baseCrop, aspectRatio: '4:5' }, 3000, 2000, null), 0.8);
  });
});
