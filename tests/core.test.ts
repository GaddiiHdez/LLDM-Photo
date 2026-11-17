import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isNewerVersion } from '../src/services/updateService';
import { classifyChurchEvent, formatFrameDate } from '../src/utils/eventClassifier';
import { processImagePixels, hasActiveCpuFilters } from '../src/utils/pixelFilters';
import { computeAdaptiveChurchEnhancement, type RawSensorData } from '../src/utils/rawProcessingEngine';
import { resolveCropRatio } from '../src/utils/smartCrop';
import {
  shouldAutoFillFrameFromImport,
  buildBatchAdjustmentsSnapshot,
  describeEventSuggestion,
} from '../src/utils/batchScope';
import {
  pushStudioHistoryEntry,
  popUndoEntry,
  popRedoEntry,
  type StudioHistoryStack,
} from '../src/utils/editorHistory';
import {
  hasCenterBottomEmblem,
  isAspectRatioMismatched,
  resolveDynamicFrameTextLayout,
} from '../src/utils/frameLayout';
import { validateIncomingMediaFiles } from '../src/utils/fileValidation';
import type { ImageAdjustments, CropSettings, FrameSettings, WatermarkSettings, PhotoItem } from '../src/types/editor';

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

describe('batchScope (reglas de lote y metadatos EXIF)', () => {
  it('auto-rellena marco solo al iniciar sesión vacía y protege decisiones manuales al agregar fotos', () => {
    const meta = { detectedEvent: 'Escuela Dominical', dateFormatted: '18 de Noviembre, 2026', dateSource: 'exif' as const };
    assert.equal(shouldAutoFillFrameFromImport(0, meta), true);
    assert.equal(shouldAutoFillFrameFromImport(2, meta), false);
    assert.equal(shouldAutoFillFrameFromImport(0, { detectedEvent: '', dateFormatted: '' }), false);
  });

  it('distingue entre fecha EXIF real y fecha aproximada de archivo en las sugerencias', () => {
    const exif = describeEventSuggestion({
      detectedEvent: 'Oración 7pm',
      dateFormatted: '17 de Noviembre, 2026',
      dateSource: 'exif',
    });
    assert.equal(exif.isEstimatedDate, false);
    assert.ok(exif.label.includes('EXIF'));

    const fallback = describeEventSuggestion({
      detectedEvent: 'Culto Especial',
      dateFormatted: '17 de Noviembre, 2026',
      dateSource: 'file-mtime',
    });
    assert.equal(fallback.isEstimatedDate, true);
    assert.ok(fallback.label.includes('archivo'));
  });

  it('Aplicar ajustes a todas copia luz, color y filtro sin sobrescribir encuadres individuales', () => {
    const makePhoto = (id: string, brightness: number, cropRatio: CropSettings['aspectRatio'], zoom: number): PhotoItem => ({
      id,
      file: {} as File,
      name: `${id}.jpg`,
      sizeFormatted: '2.0 MB',
      originalUrl: `blob:${id}`,
      thumbnailUrl: `blob:${id}`,
      width: 4000,
      height: 3000,
      isRaw: false,
      adjustments: {
        brightness,
        contrast: brightness,
        saturation: 0,
        warmth: 0,
        shadows: 0,
        highlights: 0,
        sharpness: 0,
      },
      crop: {
        aspectRatio: cropRatio,
        orientation: 'landscape',
        offsetX: id === 'p2' ? 12 : 0,
        offsetY: id === 'p2' ? -8 : 0,
        zoom,
        rotation: id === 'p2' ? 90 : 0,
      },
      preset: id === 'p1' ? 'vibrant-praise' : 'auto-church',
    });

    const p1 = makePhoto('p1', 25, '4:5', 1.25);
    const p2 = makePhoto('p2', -10, '1:1', 1.6);
    const result = buildBatchAdjustmentsSnapshot([p1, p2], p1);

    assert.equal(result[1].adjustments.brightness, 25);
    assert.equal(result[1].preset, 'vibrant-praise');
    // El encuadre individual de p2 debe permanecer intacto
    assert.equal(result[1].crop.aspectRatio, '1:1');
    assert.equal(result[1].crop.zoom, 1.6);
    assert.equal(result[1].crop.rotation, 90);
    assert.equal(result[1].crop.offsetX, 12);
  });
});

describe('editorHistory (Undo/Redo unificado para foto, marco, firma y lote)', () => {
  it('permite deshacer y rehacer cambios globales de marco/firma y operaciones por lote en una sola unidad', () => {
    let stack: StudioHistoryStack = { past: [], future: [] };

    const baseFrame = { style: 'none', eventTitle: 'Escuela Dominical' } as FrameSettings;
    const nextFrame = { style: 'custom-png', eventTitle: 'Culto Especial' } as FrameSettings;
    const baseWm = { enabled: false, text: '' } as WatermarkSettings;
    const nextWm = { enabled: true, text: 'Coro' } as WatermarkSettings;

    stack = pushStudioHistoryEntry(stack, {
      kind: 'global',
      before: { frame: baseFrame, watermark: baseWm },
      after: { frame: nextFrame, watermark: nextWm },
      label: 'Marco / Texto',
    });

    const snapA = {
      adjustments: { brightness: 0, contrast: 0, saturation: 0, warmth: 0, shadows: 0, highlights: 0, sharpness: 0 },
      crop: { aspectRatio: 'original' as const, orientation: 'landscape' as const, offsetX: 0, offsetY: 0, zoom: 1 },
      preset: 'custom' as const,
    };
    const snapB = {
      ...snapA,
      adjustments: { ...snapA.adjustments, brightness: 30 },
      preset: 'warm-worship' as const,
    };

    stack = pushStudioHistoryEntry(stack, {
      kind: 'batch-photos',
      scope: 'adjustments',
      before: [
        { id: '1', snapshot: snapA },
        { id: '2', snapshot: snapA },
      ],
      after: [
        { id: '1', snapshot: snapB },
        { id: '2', snapshot: snapB },
      ],
      label: 'Luz y color al lote',
    });

    assert.equal(stack.past.length, 2);

    const u1 = popUndoEntry(stack);
    assert.equal(u1.entry?.kind, 'batch-photos');
    assert.equal(u1.entry?.kind === 'batch-photos' && u1.entry.before.length, 2);

    const u2 = popUndoEntry(u1.nextStack);
    assert.equal(u2.entry?.kind, 'global');
    assert.equal(u2.entry?.kind === 'global' && u2.entry.before.frame.style, 'none');

    const r1 = popRedoEntry(u2.nextStack);
    assert.equal(r1.entry?.kind, 'global');
    assert.equal(r1.entry?.kind === 'global' && r1.entry.after.watermark.enabled, true);
  });
});

describe('frameLayout (zonas seguras de texto y proporción de marcos)', () => {
  it('detecta marcos Centenario con emblema central inferior y desacopla bottom-center a alas seguras', () => {
    assert.equal(hasCenterBottomEmblem('/frames/marco-centenario-V2-notexto.png'), true);
    assert.equal(hasCenterBottomEmblem('/frames/personalizado-limpio.png'), false);

    const frame = {
      style: 'custom-png',
      pngDataUrl: '/frames/marco-centenario-V2-notexto.png',
      eventTitle: 'Escuela Dominical',
      dynamicTextRight: '17 de Noviembre, 2026',
      dynamicTextEnabled: true,
      dynamicTextPosition: 'bottom-center',
    } as FrameSettings;

    const cmds = resolveDynamicFrameTextLayout({
      frame,
      frameDrawX: 0,
      frameDrawY: 0,
      frameDrawW: 1000,
      frameDrawH: 667,
    });

    assert.equal(cmds.length, 2);
    // Ala izquierda termina antes del emblema (x=85 + maxW=295 = 380 < 400)
    assert.equal(cmds[0].align, 'left');
    assert.ok(cmds[0].x + cmds[0].maxW <= 390);
    // Ala derecha comienza después del emblema (915 - 295 = 620 > 600)
    assert.equal(cmds[1].align, 'right');
    assert.ok(cmds[1].x - cmds[1].maxW >= 610);
  });

  it('no dibuja texto dinámico cuando dynamicTextEnabled está en false y detecta diferencia 4:5 vs 3:2', () => {
    const cmds = resolveDynamicFrameTextLayout({
      frame: {
        style: 'custom-png',
        pngDataUrl: '/frames/marco-centenario-V2-notexto.png',
        eventTitle: 'Oración 7pm',
        dynamicTextEnabled: false,
      } as FrameSettings,
      frameDrawX: 0,
      frameDrawY: 0,
      frameDrawW: 1000,
      frameDrawH: 667,
    });
    assert.equal(cmds.length, 0);
    assert.equal(isAspectRatioMismatched(0.8, 1.5), true);
    assert.equal(isAspectRatioMismatched(1.48, 1.5), false);
  });
});

describe('fileValidation (validación de archivos de entrada)', () => {
  it('filtra archivos vacíos o formatos no soportados conservando JPG y RAW válidos', () => {
    const res = validateIncomingMediaFiles([
      { name: 'culto.jpg', type: 'image/jpeg', size: 2500000 } as File,
      { name: 'toma.NEF', type: '', size: 24000000 } as File,
      { name: 'vacio.jpg', type: 'image/jpeg', size: 0 } as File,
      { name: 'documento.pdf', type: 'application/pdf', size: 12000 } as File,
    ]);

    assert.equal(res.validFiles.length, 2);
    assert.deepEqual(res.rejectedNames, ['vacio.jpg', 'documento.pdf']);
    assert.ok(res.reasonSummary && res.reasonSummary.includes('2'));
  });
});
