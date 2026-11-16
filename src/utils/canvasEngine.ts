import type { ImageAdjustments, WatermarkSettings, FrameSettings, CropSettings, AspectRatioType } from '../types/editor';
import { processImagePixels, hasActiveCpuFilters, type PixelScratchRef } from './pixelFilters';

export type DrawableSource = HTMLImageElement | HTMLCanvasElement;

/**
 * Caché universal LRU de imágenes decodificadas (blob:, data:, /frames/..., /logos/...)
 * Evita re-decodificar imágenes de 24MP, marcos PNG o logos en cada fotograma.
 */
const imageElementCache = new Map<string, HTMLImageElement>();
const pendingImageLoads = new Map<string, Promise<HTMLImageElement>>();
const MAX_IMAGE_CACHE = 32;

export function getCachedImageSync(src: string | undefined | null): HTMLImageElement | null {
  if (!src) return null;
  const cached = imageElementCache.get(src);
  if (cached && cached.complete && (cached.naturalWidth > 0 || cached.width > 0)) {
    return cached;
  }
  return null;
}

const baseProxyCache = new Map<string, HTMLCanvasElement>();
const MAX_PROXY_CACHE = 10;

function disposeCanvas(canvas: HTMLCanvasElement | undefined | null): void {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

export function getCachedBaseProxy(url: string): HTMLCanvasElement | null {
  const existing = baseProxyCache.get(url);
  if (existing && existing.width > 0 && existing.height > 0) {
    baseProxyCache.delete(url);
    baseProxyCache.set(url, existing);
    return existing;
  }
  return null;
}

export function getOrCreateBaseProxy(url: string, img: HTMLImageElement): HTMLCanvasElement {
  const existing = baseProxyCache.get(url);
  if (existing && existing.width > 0 && existing.height > 0) {
    baseProxyCache.delete(url);
    baseProxyCache.set(url, existing);
    return existing;
  }
  const proxy = createBaseProxyCanvas(img, 1280);
  if (baseProxyCache.size >= MAX_PROXY_CACHE) {
    const oldestKey = baseProxyCache.keys().next().value;
    if (oldestKey !== undefined) {
      disposeCanvas(baseProxyCache.get(oldestKey));
      baseProxyCache.delete(oldestKey);
    }
  }
  baseProxyCache.set(url, proxy);
  return proxy;
}

export function evictCachedImage(src: string | undefined | null): void {
  if (!src) return;
  imageElementCache.delete(src);
  pendingImageLoads.delete(src);
  const proxy = baseProxyCache.get(src);
  if (proxy) {
    disposeCanvas(proxy);
    baseProxyCache.delete(src);
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = getCachedImageSync(src);
  if (cached) return Promise.resolve(cached);

  const pending = pendingImageLoads.get(src);
  if (pending) return pending;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    // No establecer crossOrigin en URLs locales blob: o data: para evitar fallos de seguridad en Android WebView
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      pendingImageLoads.delete(src);
      if (imageElementCache.size >= MAX_IMAGE_CACHE) {
        const firstKey = imageElementCache.keys().next().value;
        if (firstKey !== undefined) imageElementCache.delete(firstKey);
      }
      imageElementCache.set(src, img);
      resolve(img);
    };
    img.onerror = (err) => {
      pendingImageLoads.delete(src);
      reject(err);
    };
    img.src = src;
  });

  pendingImageLoads.set(src, promise);
  return promise;
}

/**
 * Caché de logos coloreados (evita crear un <canvas> nuevo en cada fotograma de 60fps)
 */
const tintedLogoCache = new Map<string, HTMLCanvasElement>();

function getTintedLogoCanvas(logoImg: HTMLImageElement, color: string): HTMLCanvasElement {
  const key = `${logoImg.src}|${color}`;
  const cached = tintedLogoCache.get(key);
  if (cached) return cached;

  const tintCanvas = document.createElement('canvas');
  tintCanvas.width = logoImg.naturalWidth || logoImg.width || 256;
  tintCanvas.height = logoImg.naturalHeight || logoImg.height || 256;
  const ctx = tintCanvas.getContext('2d');

  if (ctx) {
    ctx.drawImage(logoImg, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, tintCanvas.width, tintCanvas.height);
  }

  if (tintedLogoCache.size >= 16) {
    const firstKey = tintedLogoCache.keys().next().value;
    if (firstKey !== undefined) {
      disposeCanvas(tintedLogoCache.get(firstKey));
      tintedLogoCache.delete(firstKey);
    }
  }
  tintedLogoCache.set(key, tintCanvas);
  return tintCanvas;
}

// Buffer reutilizable en hilo principal para preview interactivo 60fps
const syncScratchRef: PixelScratchRef = { buffer: null };

let pixelWorker: Worker | null = null;
let workerJobId = 0;
const pendingWorkerJobs = new Map<
  number,
  { resolve: (buf: ArrayBuffer) => void; reject: (err: Error) => void }
>();

function getPixelWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (pixelWorker) return pixelWorker;

  try {
    const worker = new Worker(new URL('../workers/pixelProcessor.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (event: MessageEvent<{ id: number; ok: boolean; buffer: ArrayBuffer; error?: string }>) => {
      const { id, ok, buffer, error } = event.data;
      const job = pendingWorkerJobs.get(id);
      if (!job) return;
      pendingWorkerJobs.delete(id);
      if (ok) {
        job.resolve(buffer);
      } else {
        job.reject(new Error(error || 'Error en worker de píxeles'));
      }
    };
    worker.onerror = (err) => {
      for (const job of pendingWorkerJobs.values()) {
        job.reject(new Error(err.message || 'Fallo en Web Worker'));
      }
      pendingWorkerJobs.clear();
      worker.terminate();
      pixelWorker = null;
    };
    pixelWorker = worker;
    return pixelWorker;
  } catch {
    return null;
  }
}

/**
 * Libera el buffer temporal de píxeles (ej. tras exportar fotos de 24–45 MP)
 */
export function releaseScratchBuffer(): void {
  syncScratchRef.buffer = null;
  if (pixelWorker) {
    try {
      pixelWorker.postMessage({ type: 'release' });
    } catch {}
  }
}

/**
 * Libera todos los recursos en RAM del motor gráfico (proxies, buffers y opcionalmente caché de imágenes)
 */
export function releaseEngineMemory(clearImageCaches: boolean = false): void {
  releaseScratchBuffer();
  for (const proxy of baseProxyCache.values()) {
    disposeCanvas(proxy);
  }
  baseProxyCache.clear();

  if (clearImageCaches) {
    if (pixelWorker) {
      for (const job of pendingWorkerJobs.values()) {
        job.reject(new Error('Sesión cerrada'));
      }
      pendingWorkerJobs.clear();
      pixelWorker.terminate();
      pixelWorker = null;
    }
    for (const logoCanvas of tintedLogoCache.values()) {
      disposeCanvas(logoCanvas);
    }
    tintedLogoCache.clear();
    imageElementCache.clear();
    pendingImageLoads.clear();
  }
}

/**
 * Aplica mapeo tonal (Sombras, Altas Luces, Calidez) mediante LUT entera y Nitidez 3x3 optimizada (síncrono).
 */
export function applyCpuToneAndSharpness(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  adjustments: ImageAdjustments,
  skipSharpness: boolean = false
): void {
  if (!hasActiveCpuFilters(adjustments, skipSharpness)) return;

  try {
    const imgData = ctx.getImageData(x, y, width, height);
    processImagePixels(imgData.data, width, height, adjustments, skipSharpness, syncScratchRef);
    ctx.putImageData(imgData, x, y);
  } catch (e) {
    console.warn('[Canvas Engine] Ignorando filtro pixel por política de origen:', e);
  }
}

/**
 * Ejecuta el mismo pipeline de píxeles fuera del hilo principal usando un Web Worker
 * con transferencia zero-copy (Transferable ArrayBuffer) para no congelar la UI en exportaciones de 24–45 MP.
 */
export async function applyCpuToneAndSharpnessAsync(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  adjustments: ImageAdjustments,
  skipSharpness: boolean = false
): Promise<void> {
  if (!hasActiveCpuFilters(adjustments, skipSharpness)) return;

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(x, y, width, height);
  } catch (e) {
    console.warn('[Canvas Engine] Ignorando filtro pixel por política de origen:', e);
    return;
  }

  const worker = getPixelWorker();
  if (!worker) {
    processImagePixels(imgData.data, width, height, adjustments, skipSharpness, syncScratchRef);
    ctx.putImageData(imgData, x, y);
    return;
  }

  const jobId = ++workerJobId;
  const inputBuffer = imgData.data.buffer;

  try {
    const processedBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      pendingWorkerJobs.set(jobId, { resolve, reject });
      worker.postMessage(
        {
          type: 'process',
          id: jobId,
          buffer: inputBuffer,
          width,
          height,
          adjustments,
          skipSharpness,
        },
        [inputBuffer]
      );
    });
    const outImgData = new ImageData(new Uint8ClampedArray(processedBuffer), width, height);
    ctx.putImageData(outImgData, x, y);
  } catch (err) {
    console.warn('[Canvas Engine] Worker falló, usando fallback síncrono:', err);
    const freshData = ctx.getImageData(x, y, width, height);
    processImagePixels(freshData.data, width, height, adjustments, skipSharpness, syncScratchRef);
    ctx.putImageData(freshData, x, y);
  }
}

/**
 * Crea un canvas proxy de trabajo pre-escalado (por defecto máx 1280px).
 * Reduce de 24MP a ~1MP la textura fuente para edición interactiva a 60-120fps.
 */
export function createBaseProxyCanvas(img: HTMLImageElement, maxDimension: number = 1280): HTMLCanvasElement {
  const rawW = img.naturalWidth || img.width || 1920;
  const rawH = img.naturalHeight || img.height || 1080;
  const scale = Math.min(1, maxDimension / Math.max(rawW, rawH));
  const w = Math.max(1, Math.round(rawW * scale));
  const h = Math.max(1, Math.round(rawH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
  }
  return canvas;
}

/**
 * Hornea los ajustes de luz, color, tono y nitidez sobre un canvas proxy intermedio.
 * Así, al mover, hacer zoom, rotar o cambiar marcos, NO se recalculan filtros ni píxeles.
 */
export function bakeToneToProxyCanvas(
  targetProxy: HTMLCanvasElement,
  baseProxy: HTMLCanvasElement,
  adjustments: ImageAdjustments,
  resolutionScale: number = 1.0,
  skipSharpness: boolean = false
): void {
  const w = Math.max(1, Math.round(baseProxy.width * resolutionScale));
  const h = Math.max(1, Math.round(baseProxy.height * resolutionScale));

  if (targetProxy.width !== w || targetProxy.height !== h) {
    targetProxy.width = w;
    targetProxy.height = h;
  }

  const ctx = targetProxy.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  const b = 100 + (adjustments.brightness || 0);
  const c = 100 + (adjustments.contrast || 0);
  const s = 100 + (adjustments.saturation || 0);

  if (b !== 100 || c !== 100 || s !== 100) {
    ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
  } else {
    ctx.filter = 'none';
  }

  ctx.drawImage(baseProxy, 0, 0, w, h);
  ctx.restore();

  applyCpuToneAndSharpness(ctx, 0, 0, w, h, adjustments, skipSharpness);
}

function getSourceDimensions(source: DrawableSource): { width: number; height: number } {
  if (source instanceof HTMLCanvasElement) {
    return { width: source.width || 1920, height: source.height || 1080 };
  }
  return {
    width: source.naturalWidth || source.width || 6000,
    height: source.naturalHeight || source.height || 4000,
  };
}

/**
 * Calcula la relación de aspecto objetivo (W / H) según el ratio elegido, dimensiones y rotación de 90°
 */
export function getTargetAspectRatio(
  ratio: AspectRatioType,
  rawWidth: number,
  rawHeight: number,
  rotation: number = 0
): number {
  const isRotated90 = Math.abs(rotation % 180) === 90;
  const effW = isRotated90 ? rawHeight : rawWidth;
  const effH = isRotated90 ? rawWidth : rawHeight;

  if (ratio === 'original') {
    return effW / effH;
  }
  switch (ratio) {
    case '1:1':
      return 1.0;
    case '4:5':
      return 4 / 5;
    case '9:16':
      return 9 / 16;
    case '16:9':
      return 16 / 9;
    case '3:4':
      return 3 / 4;
    case '3:2':
      return 3 / 2;
    case '2:3':
      return 2 / 3;
    default:
      return effW / effH;
  }
}

/**
 * Renderiza un preview RÁPIDO durante el drag (acelerado por GPU).
 */
export function renderFastPreview(
  img: HTMLImageElement,
  adjustments: ImageAdjustments,
  crop: CropSettings,
  maxDimension: number = 480
): HTMLCanvasElement {
  const rawWidth = img.naturalWidth || img.width || 1920;
  const rawHeight = img.naturalHeight || img.height || 1080;
  const targetRatio = getTargetAspectRatio(crop.aspectRatio, rawWidth, rawHeight, crop.rotation || 0);

  let previewW: number;
  let previewH: number;
  if (targetRatio >= 1) {
    previewW = maxDimension;
    previewH = Math.round(maxDimension / targetRatio);
  } else {
    previewH = maxDimension;
    previewW = Math.round(maxDimension * targetRatio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = previewW;
  canvas.height = previewH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const rawRatio = rawWidth / rawHeight;
  let baseSrcW: number;
  let baseSrcH: number;
  if (rawRatio > targetRatio) {
    baseSrcH = rawHeight;
    baseSrcW = rawHeight * targetRatio;
  } else {
    baseSrcW = rawWidth;
    baseSrcH = rawWidth / targetRatio;
  }

  const zoomScale = Math.max(1.0, Math.min(3.0, crop.zoom || 1.0));
  const srcW = baseSrcW / zoomScale;
  const srcH = baseSrcH / zoomScale;

  const maxOffX = Math.max(0, (rawWidth - srcW) / 2);
  const maxOffY = Math.max(0, (rawHeight - srcH) / 2);
  const shiftX = ((crop.offsetX || 0) / 50) * maxOffX;
  const shiftY = ((crop.offsetY || 0) / 50) * maxOffY;

  const srcX = Math.max(0, Math.min(rawWidth - srcW, (rawWidth - srcW) / 2 + shiftX));
  const srcY = Math.max(0, Math.min(rawHeight - srcH, (rawHeight - srcH) / 2 + shiftY));

  const b = 100 + (adjustments.brightness || 0);
  const c = 100 + (adjustments.contrast || 0);
  const s = 100 + (adjustments.saturation || 0);
  ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, previewW, previewH);

  return canvas;
}

interface BaseRenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  extraLeft: number;
  extraTop: number;
  resolvedPngFrame: HTMLImageElement | null;
  resolvedLogo: HTMLImageElement | null;
}

function drawPhotoBaseAndFrameBack(
  targetCanvas: HTMLCanvasElement,
  img: DrawableSource,
  adjustments: ImageAdjustments,
  watermark: WatermarkSettings,
  frame: FrameSettings,
  crop: CropSettings,
  maxDimension: number = 0,
  cachedPngFrame?: HTMLImageElement | null,
  cachedLogo?: HTMLImageElement | null,
  adjustmentsAlreadyBaked: boolean = false
): BaseRenderContext {
  const { width: rawWidth, height: rawHeight } = getSourceDimensions(img);
  const rotationDeg = crop.rotation || 0;
  const straightenDeg = crop.straighten || 0;
  const isRotated90 = Math.abs(rotationDeg % 180) === 90;

  const resolvedPngFrame =
    cachedPngFrame || (frame.style === 'custom-png' && frame.pngDataUrl ? getCachedImageSync(frame.pngDataUrl) : null);
  const resolvedLogo =
    cachedLogo || (watermark.enabled && watermark.type === 'image' && watermark.imageDataUrl ? getCachedImageSync(watermark.imageDataUrl) : null);

  // --- 1. CÁLCULO DE DIMENSIONES RE-ENCUADRADAS (CROPPED GEOMETRY SIN DEFORMACIÓN) ---
  let frameRatio: number | null = null;
  if (crop.aspectRatio === 'frame' && frame.style === 'custom-png' && resolvedPngFrame && resolvedPngFrame.height > 0) {
    frameRatio = resolvedPngFrame.width / resolvedPngFrame.height;
  }
  const targetRatio = frameRatio ?? getTargetAspectRatio(crop.aspectRatio, rawWidth, rawHeight, rotationDeg);
  const srcTargetRatio = isRotated90 ? 1 / targetRatio : targetRatio;
  const rawRatio = rawWidth / rawHeight;

  let baseSrcW: number;
  let baseSrcH: number;

  if (rawRatio > srcTargetRatio) {
    baseSrcH = rawHeight;
    baseSrcW = rawHeight * srcTargetRatio;
  } else {
    baseSrcW = rawWidth;
    baseSrcH = rawWidth / srcTargetRatio;
  }

  const effectiveMaxW = isRotated90 ? rawHeight : rawWidth;
  const effectiveMaxH = isRotated90 ? rawWidth : rawHeight;
  const maxTargetDim = maxDimension > 0 ? maxDimension : Math.max(effectiveMaxW, effectiveMaxH, 2560);
  let width: number;
  let height: number;

  if (targetRatio >= 1) {
    width = Math.min(effectiveMaxW, maxTargetDim);
    height = Math.round(width / targetRatio);
  } else {
    height = Math.min(effectiveMaxH, maxTargetDim);
    width = Math.round(height * targetRatio);
  }

  // --- CÁLCULO DE MÁRGENES PARA MARCOS DIGITALES ---
  let extraTop = 0;
  let extraBottom = 0;
  let extraLeft = 0;
  let extraRight = 0;

  const borderScale = (frame.borderTop || 24) / 24;
  const baseBorderWidth = Math.max(6, Math.round(width * 0.022 * borderScale));

  if (frame.style === 'custom-designer') {
    const scale = width / 1200;
    extraTop = Math.round((frame.borderTop || 20) * scale);
    extraBottom = Math.round((frame.borderBottom || 40) * scale);
    extraLeft = Math.round((frame.borderLeft || 20) * scale);
    extraRight = Math.round((frame.borderRight || 20) * scale);
  } else if (frame.style === 'fine-gallery') {
    const margin = Math.max(6, Math.round(width * 0.035 * borderScale));
    extraTop = margin;
    extraBottom = margin;
    extraLeft = margin;
    extraRight = margin;
  } else if (frame.style === 'editorial') {
    const margin = Math.max(6, Math.round(width * 0.025 * borderScale));
    extraTop = margin;
    extraBottom = margin + Math.round(height * 0.09);
    extraLeft = margin;
    extraRight = margin;
  } else if (frame.style === 'classic-white' || frame.style === 'classic-dark' || frame.style === 'gold-accent') {
    extraTop = baseBorderWidth;
    extraBottom = baseBorderWidth;
    extraLeft = baseBorderWidth;
    extraRight = baseBorderWidth;
  } else if (frame.style === 'church-event') {
    extraTop = baseBorderWidth;
    extraBottom = baseBorderWidth + Math.round(height * 0.10);
    extraLeft = baseBorderWidth;
    extraRight = baseBorderWidth;
  } else if (frame.style === 'polaroid-card') {
    const sideMargin = Math.max(8, Math.round(baseBorderWidth * 1.4));
    extraTop = sideMargin;
    extraBottom = Math.max(24, Math.round(baseBorderWidth * 3.8));
    extraLeft = sideMargin;
    extraRight = sideMargin;
  }

  const targetW = width + extraLeft + extraRight;
  const targetH = height + extraTop + extraBottom;

  if (targetCanvas.width !== targetW || targetCanvas.height !== targetH) {
    targetCanvas.width = targetW;
    targetCanvas.height = targetH;
  }

  const ctx = targetCanvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo obtener el contexto 2D');

  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  // --- 2. DIBUJAR MARCO DIGITAL DE FONDO ---
  if (frame.style === 'custom-designer') {
    ctx.save();
    if (frame.useGradient && frame.borderColor2) {
      const grad = ctx.createLinearGradient(0, 0, targetCanvas.width, targetCanvas.height);
      grad.addColorStop(0, frame.borderColor || '#0f172a');
      grad.addColorStop(1, frame.borderColor2 || '#1e3a8a');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = frame.borderColor || '#0f172a';
    }
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.restore();
  } else if (frame.style !== 'none' && frame.style !== 'custom-png') {
    ctx.save();
    if (frame.style === 'fine-gallery') {
      ctx.fillStyle = frame.borderColor || '#ffffff';
    } else if (frame.style === 'editorial') {
      ctx.fillStyle = frame.borderColor || '#0f172a';
    } else if (frame.style === 'classic-white' || frame.style === 'polaroid-card') {
      ctx.fillStyle = '#ffffff';
    } else if (frame.style === 'classic-dark') {
      ctx.fillStyle = '#0f172a';
    } else if (frame.style === 'gold-accent') {
      ctx.fillStyle = '#0a0f1d';
    } else if (frame.style === 'church-event') {
      ctx.fillStyle = '#0f172a';
    }
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.restore();
  }

  // --- 3. DIBUJAR FOTO BASE CON CROP, ROTACIÓN, NIVELACIÓN Y FILTROS GPU ---
  ctx.save();
  if (!adjustmentsAlreadyBaked) {
    const b = 100 + adjustments.brightness;
    const c = 100 + adjustments.contrast;
    const s = 100 + adjustments.saturation;
    if (b !== 100 || c !== 100 || s !== 100) {
      ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;
    } else {
      ctx.filter = 'none';
    }
  } else {
    ctx.filter = 'none';
  }

  const straightenRad = (Math.abs(straightenDeg) * Math.PI) / 180;
  const straightenAutoZoom = straightenDeg !== 0 ? 1 + Math.sin(straightenRad) * 1.35 : 1.0;

  const zoomScale = Math.max(1.0, Math.min(3.5, (crop.zoom || 1.0) * straightenAutoZoom));
  const srcW = baseSrcW / zoomScale;
  const srcH = baseSrcH / zoomScale;

  const maxOffX = Math.max(0, (rawWidth - srcW) / 2);
  const maxOffY = Math.max(0, (rawHeight - srcH) / 2);

  const shiftX = ((crop.offsetX || 0) / 50) * maxOffX;
  const shiftY = ((crop.offsetY || 0) / 50) * maxOffY;

  const srcX = Math.max(0, Math.min(rawWidth - srcW, (rawWidth - srcW) / 2 + shiftX));
  const srcY = Math.max(0, Math.min(rawHeight - srcH, (rawHeight - srcH) / 2 + shiftY));

  const hasTransform = rotationDeg !== 0 || straightenDeg !== 0 || crop.flipH || crop.flipV;

  if (!hasTransform) {
    ctx.drawImage(
      img,
      srcX, srcY, srcW, srcH,
      extraLeft, extraTop, width, height
    );
  } else {
    ctx.beginPath();
    ctx.rect(extraLeft, extraTop, width, height);
    ctx.clip();

    const centerX = extraLeft + width / 2;
    const centerY = extraTop + height / 2;
    ctx.translate(centerX, centerY);

    const totalAngleRad = ((rotationDeg + straightenDeg) * Math.PI) / 180;
    if (totalAngleRad !== 0) {
      ctx.rotate(totalAngleRad);
    }
    if (crop.flipH || crop.flipV) {
      ctx.scale(crop.flipH ? -1 : 1, crop.flipV ? -1 : 1);
    }

    const drawW = isRotated90 ? height : width;
    const drawH = isRotated90 ? width : height;

    ctx.drawImage(
      img,
      srcX, srcY, srcW, srcH,
      -drawW / 2, -drawH / 2, drawW, drawH
    );
  }
  ctx.restore();

  // --- 4. FILETE INTERIOR DEL MARCO (FINE ART GALLERY & GOLD ACCENT) ---
  if (frame.style === 'fine-gallery') {
    ctx.save();
    ctx.strokeStyle = frame.innerStrokeColor || '#d4af37';
    ctx.lineWidth = Math.max(1, Math.round(width * 0.0015));
    const inset = Math.min(Math.round(extraLeft * 0.35), Math.round(width * 0.008));
    ctx.strokeRect(extraLeft - inset, extraTop - inset, width + inset * 2, height + inset * 2);
    ctx.restore();
  } else if (frame.style === 'gold-accent') {
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, targetCanvas.width, targetCanvas.height);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(0.5, '#fef08a');
    grad.addColorStop(1, '#b45309');
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(2, Math.round(width * 0.0035));
    ctx.strokeRect(extraLeft, extraTop, width, height);
    ctx.restore();
  } else if (frame.style === 'custom-designer' && frame.innerStrokeWidth > 0) {
    ctx.save();
    ctx.strokeStyle = frame.innerStrokeColor || '#f59e0b';
    ctx.lineWidth = frame.innerStrokeWidth;
    ctx.strokeRect(extraLeft, extraTop, width, height);
    ctx.restore();
  }

  return {
    ctx,
    width,
    height,
    extraLeft,
    extraTop,
    resolvedPngFrame,
    resolvedLogo,
  };
}

function drawFrameOverlayAndWatermark(
  targetCanvas: HTMLCanvasElement,
  base: BaseRenderContext,
  watermark: WatermarkSettings,
  frame: FrameSettings
): void {
  const { ctx, width, height, extraLeft, extraTop, resolvedPngFrame, resolvedLogo } = base;

  // --- 6. OVERLAY PNG TRANSPARENTE (Marco PNG institucional) ---
  if (frame.style === 'custom-png' && resolvedPngFrame) {
    try {
      ctx.save();
      const fRatio = resolvedPngFrame.width / resolvedPngFrame.height;
      const canvasRatio = targetCanvas.width / targetCanvas.height;

      let frameDrawX = 0;
      let frameDrawY = 0;
      let frameDrawW = targetCanvas.width;
      let frameDrawH = targetCanvas.height;

      if (Math.abs(fRatio - canvasRatio) < 0.15) {
        ctx.drawImage(resolvedPngFrame, 0, 0, targetCanvas.width, targetCanvas.height);
      } else {
        if (fRatio > canvasRatio) {
          frameDrawH = targetCanvas.width / fRatio;
          frameDrawY = (targetCanvas.height - frameDrawH) / 2;
        } else {
          frameDrawW = targetCanvas.height * fRatio;
          frameDrawX = (targetCanvas.width - frameDrawW) / 2;
        }
        ctx.drawImage(resolvedPngFrame, frameDrawX, frameDrawY, frameDrawW, frameDrawH);
      }
      ctx.restore();

      // --- 6.1 RENDERIZADO DE TEXTO DINÁMICO EN MARCO PNG ---
      const isDynamicTemplate = Boolean(
        frame.pngDataUrl?.includes('notexto') ||
        frame.dynamicTextEnabled ||
        (!frame.pngDataUrl?.includes('oracion7pm') && !frame.pngDataUrl?.includes('escuela-dominical') && frame.eventTitle)
      );

      if (isDynamicTemplate && (frame.dynamicTextEnabled ?? true)) {
        const textScale = (frame.dynamicTextScale || 100) / 100;
        const applyDynamicTextStyle = (fontSize: number, textY: number) => {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = Math.max(2, Math.round(fontSize * 0.15));
          ctx.shadowOffsetX = Math.max(1, Math.round(fontSize * 0.06));
          ctx.shadowOffsetY = Math.max(1, Math.round(fontSize * 0.06));

          if (frame.dynamicTextColorStyle === 'white') {
            ctx.fillStyle = '#ffffff';
          } else if (frame.dynamicTextColorStyle === 'silver') {
            ctx.fillStyle = '#cbd5e1';
          } else {
            const goldGrad = ctx.createLinearGradient(0, textY - fontSize * 0.5, 0, textY + fontSize * 0.5);
            goldGrad.addColorStop(0, '#fef08a');
            goldGrad.addColorStop(0.25, '#dab768');
            goldGrad.addColorStop(0.65, '#cea544');
            goldGrad.addColorStop(1, '#9b711d');
            ctx.fillStyle = goldGrad;
          }
        };

        const pos =
          frame.dynamicTextPosition ||
          (frame.pngDataUrl?.includes('centenario') || frame.pngDataUrl?.includes('notexto')
            ? 'centenario-left'
            : 'bottom-center');

        const leftText = (frame.eventTitle || '').trim().toUpperCase();
        const rawRight =
          frame.dynamicTextRight !== undefined ? frame.dynamicTextRight : (frame.eventDate || '');
        const rightText = rawRight.trim().toUpperCase();

        if (pos === 'centenario-left') {
          if (leftText.length > 0) {
            ctx.save();
            const textX = frameDrawX + frameDrawW * 0.121;
            const textY = frameDrawY + frameDrawH * 0.9845;
            const maxW = frameDrawW * 0.32;
            const fontSize = Math.max(11, Math.round(frameDrawH * 0.0185 * textScale));

            ctx.font = `700 ${fontSize}px 'Cinzel', 'Cinzel Decorative', 'Times New Roman', 'Georgia', serif`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            applyDynamicTextStyle(fontSize, textY);
            ctx.fillText(leftText, textX, textY, maxW);
            ctx.restore();
          }

          if (rightText.length > 0) {
            ctx.save();
            const textX = frameDrawX + frameDrawW * 0.879;
            const textY = frameDrawY + frameDrawH * 0.9845;
            const maxW = frameDrawW * 0.30;
            const fontSize = Math.max(11, Math.round(frameDrawH * 0.0175 * textScale));

            ctx.font = `700 ${fontSize}px 'Cinzel', 'Cinzel Decorative', 'Times New Roman', 'Georgia', serif`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'right';
            applyDynamicTextStyle(fontSize, textY);
            ctx.fillText(rightText, textX, textY, maxW);
            ctx.restore();
          }
        } else {
          const combined = [leftText, rightText].filter(Boolean).join('  •  ');
          if (combined.length > 0) {
            ctx.save();
            const textY = frameDrawY + frameDrawH * 0.975;
            const fontSize = Math.max(12, Math.round(frameDrawH * 0.020 * textScale));
            let textX = frameDrawX + frameDrawW * 0.5;
            ctx.textAlign = 'center';
            if (pos === 'bottom-left') {
              textX = frameDrawX + frameDrawW * 0.055;
              ctx.textAlign = 'left';
            } else if (pos === 'bottom-right') {
              textX = frameDrawX + frameDrawW * 0.945;
              ctx.textAlign = 'right';
            }
            ctx.font = `700 ${fontSize}px 'Cinzel', 'Outfit', sans-serif`;
            ctx.textBaseline = 'middle';
            applyDynamicTextStyle(fontSize, textY);
            ctx.fillText(combined, textX, textY, frameDrawW * 0.86);
            ctx.restore();
          }
        }
      }
    } catch (err) {
      console.error('Error dibujando marco PNG transparente:', err);
    }
  }

  // --- 7. TEXTO EDITORIAL O BANNER REFINADO ---
  if ((frame.style === 'editorial' || frame.style === 'custom-designer') && (frame.eventTitle || frame.eventSubtitle || frame.eventDate)) {
    ctx.save();
    const bannerY = extraTop + height;
    const bannerHeight = targetCanvas.height - bannerY;
    const padding = Math.round(targetCanvas.width * 0.04);

    let textX = targetCanvas.width / 2;
    if (frame.textAlignment === 'left') textX = padding;
    if (frame.textAlignment === 'right') textX = targetCanvas.width - padding;

    ctx.textAlign = frame.textAlignment || 'center';
    const isLightBg = frame.borderColor === '#ffffff';
    ctx.fillStyle = frame.textColor || (isLightBg ? '#0f172a' : '#ffffff');
    const font = frame.fontFamily || (frame.style === 'editorial' ? "'Cinzel', Georgia, serif" : 'sans-serif');

    if (frame.eventTitle) {
      const titleSize = Math.round(Math.max(14, bannerHeight * 0.3));
      ctx.font = `600 ${titleSize}px ${font}`;
      ctx.fillText(frame.eventTitle, textX, bannerY + bannerHeight * 0.42);
    }

    if (frame.eventSubtitle || frame.eventDate) {
      const sub = [frame.eventSubtitle, frame.eventDate].filter(Boolean).join('  —  ');
      const subSize = Math.round(Math.max(11, bannerHeight * 0.18));
      ctx.font = `400 ${subSize}px ${font}`;
      ctx.fillStyle = frame.textColor ? `${frame.textColor}AA` : (isLightBg ? '#64748b' : '#94a3b8');
      ctx.fillText(sub, textX, bannerY + bannerHeight * 0.74);
    }

    ctx.restore();
  } else if (frame.style === 'church-event') {
    ctx.save();
    const bannerY = extraTop + height;
    const bannerHeight = targetCanvas.height - bannerY;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, bannerY, targetCanvas.width, bannerHeight);

    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0, bannerY, targetCanvas.width, 1);

    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${Math.round(bannerHeight * 0.32)}px 'Cinzel', Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(frame.eventTitle || 'Iglesia Local • Servicio Especial', targetCanvas.width / 2, bannerY + bannerHeight * 0.42);

    if (frame.eventDate) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `400 ${Math.round(bannerHeight * 0.2)}px sans-serif`;
      ctx.fillText(frame.eventDate, targetCanvas.width / 2, bannerY + bannerHeight * 0.74);
    }
    ctx.restore();
  }

  // --- 8. MARCA DE AGUA (WATERMARK) ---
  if (watermark.enabled) {
    ctx.save();
    ctx.globalAlpha = watermark.opacity;
    if (watermark.blendMode && watermark.blendMode !== 'normal') {
      ctx.globalCompositeOperation = watermark.blendMode;
    }

    const scaleFactor = watermark.size / 100;

    if (watermark.type === 'text' && watermark.text.trim()) {
      const fontSize = Math.round(height * 0.045 * scaleFactor * 2.5);
      ctx.font = `bold ${fontSize}px 'Outfit', sans-serif`;

      const textMetrics = ctx.measureText(watermark.text);
      const textWidth = textMetrics.width;
      const padding = fontSize * 0.6;

      let x = extraLeft + padding;
      let y = extraTop + padding + fontSize;

      if (watermark.position === 'bottom-right') {
        x = extraLeft + width - textWidth - padding;
        y = extraTop + height - padding;
      } else if (watermark.position === 'bottom-left') {
        x = extraLeft + padding;
        y = extraTop + height - padding;
      } else if (watermark.position === 'top-right') {
        x = extraLeft + width - textWidth - padding;
        y = extraTop + padding + fontSize;
      } else if (watermark.position === 'center') {
        x = extraLeft + (width - textWidth) / 2;
        y = extraTop + height / 2;
      }

      if (watermark.dropShadow) {
        ctx.shadowColor = watermark.shadowColor || 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = watermark.shadowBlur || 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
      }

      if (watermark.strokeEnabled) {
        ctx.strokeStyle = watermark.strokeColor || '#000000';
        ctx.lineWidth = watermark.strokeWidth || 3;
        ctx.strokeText(watermark.text, x, y);
      }

      ctx.fillStyle = watermark.color || '#ffffff';
      ctx.fillText(watermark.text, x, y);
    } else if (watermark.type === 'image' && resolvedLogo) {
      try {
        const logoElement = watermark.logoTintEnabled
          ? getTintedLogoCanvas(resolvedLogo, watermark.logoTintColor || '#ffffff')
          : resolvedLogo;

        const logoAspect = logoElement.width / logoElement.height;
        const logoWidth = Math.round(width * 0.25 * scaleFactor);
        const logoHeight = Math.round(logoWidth / logoAspect);

        const margin = Math.round(width * 0.03);
        let x = extraLeft + margin;
        let y = extraTop + margin;

        if (watermark.position === 'bottom-right') {
          x = extraLeft + width - logoWidth - margin;
          y = extraTop + height - logoHeight - margin;
        } else if (watermark.position === 'bottom-left') {
          x = extraLeft + margin;
          y = extraTop + height - logoHeight - margin;
        } else if (watermark.position === 'top-right') {
          x = extraLeft + width - logoWidth - margin;
          y = extraTop + margin;
        } else if (watermark.position === 'center') {
          x = extraLeft + (width - logoWidth) / 2;
          y = extraTop + (height - logoHeight) / 2;
        }

        if (watermark.dropShadow) {
          ctx.shadowColor = watermark.shadowColor || 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = watermark.shadowBlur || 10;
          ctx.shadowOffsetX = 4;
          ctx.shadowOffsetY = 4;
        }

        ctx.drawImage(logoElement, x, y, logoWidth, logoHeight);
      } catch (err) {
        console.error('Error dibujando logo de marca de agua:', err);
      }
    }

    ctx.restore();
  }
}

/**
 * Núcleo de renderizado 100% SÍNCRONO para ejecución inmediata en requestAnimationFrame (0ms de latencia async).
 * Si `adjustmentsAlreadyBaked` es true (modo proxy interactivo), la imagen fuente ya contiene luz, color y nitidez,
 * por lo que mover, hacer zoom o rotar se ejecuta en < 0.8ms mediante composición pura de GPU.
 */
export function drawProcessedPhotoSync(
  targetCanvas: HTMLCanvasElement,
  img: DrawableSource,
  adjustments: ImageAdjustments,
  watermark: WatermarkSettings,
  frame: FrameSettings,
  crop: CropSettings,
  maxDimension: number = 0,
  skipCpuFilters: boolean = false,
  cachedPngFrame?: HTMLImageElement | null,
  cachedLogo?: HTMLImageElement | null,
  adjustmentsAlreadyBaked: boolean = false
): void {
  const base = drawPhotoBaseAndFrameBack(
    targetCanvas,
    img,
    adjustments,
    watermark,
    frame,
    crop,
    maxDimension,
    cachedPngFrame,
    cachedLogo,
    adjustmentsAlreadyBaked
  );

  if (!adjustmentsAlreadyBaked && !skipCpuFilters) {
    applyCpuToneAndSharpness(base.ctx, base.extraLeft, base.extraTop, base.width, base.height, adjustments, false);
  }

  drawFrameOverlayAndWatermark(targetCanvas, base, watermark, frame);
}

/**
 * Dibuja la composición completa sobre un canvas existente (compatible con flujos asíncronos y exportación en Web Worker).
 */
export async function drawProcessedPhotoToCanvas(
  targetCanvas: HTMLCanvasElement,
  imgSource: DrawableSource | string,
  adjustments: ImageAdjustments,
  watermark: WatermarkSettings,
  frame: FrameSettings,
  crop: CropSettings,
  maxDimension: number = 0,
  skipCpuFilters: boolean = false,
  cachedPngFrame?: HTMLImageElement | null,
  cachedLogo?: HTMLImageElement | null,
  adjustmentsAlreadyBaked: boolean = false,
  useAsyncWorker: boolean = false
): Promise<void> {
  const img = typeof imgSource === 'string' ? await loadImage(imgSource) : imgSource;

  let pngFrame = cachedPngFrame;
  if (!pngFrame && frame.style === 'custom-png' && frame.pngDataUrl) {
    try {
      pngFrame = getCachedImageSync(frame.pngDataUrl) || await loadImage(frame.pngDataUrl);
    } catch {
      pngFrame = null;
    }
  }

  let logoImg = cachedLogo;
  if (!logoImg && watermark.enabled && watermark.type === 'image' && watermark.imageDataUrl) {
    try {
      logoImg = getCachedImageSync(watermark.imageDataUrl) || await loadImage(watermark.imageDataUrl);
    } catch {
      logoImg = null;
    }
  }

  if (!useAsyncWorker) {
    drawProcessedPhotoSync(
      targetCanvas,
      img,
      adjustments,
      watermark,
      frame,
      crop,
      maxDimension,
      skipCpuFilters,
      pngFrame,
      logoImg,
      adjustmentsAlreadyBaked
    );
    return;
  }

  const base = drawPhotoBaseAndFrameBack(
    targetCanvas,
    img,
    adjustments,
    watermark,
    frame,
    crop,
    maxDimension,
    pngFrame,
    logoImg,
    adjustmentsAlreadyBaked
  );

  if (!adjustmentsAlreadyBaked && !skipCpuFilters) {
    await applyCpuToneAndSharpnessAsync(
      base.ctx,
      base.extraLeft,
      base.extraTop,
      base.width,
      base.height,
      adjustments,
      false
    );
  }

  drawFrameOverlayAndWatermark(targetCanvas, base, watermark, frame);
}

/**
 * Renderiza la imagen procesada completa creando un nuevo canvas en segundo plano (usado para exportaciones en lote/individual)
 */
export async function renderProcessedPhoto(
  imgSource: HTMLImageElement | string,
  adjustments: ImageAdjustments,
  watermark: WatermarkSettings,
  frame: FrameSettings,
  crop: CropSettings,
  maxDimension: number = 0,
  cachedPngFrame?: HTMLImageElement | null,
  cachedLogo?: HTMLImageElement | null
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  await drawProcessedPhotoToCanvas(
    canvas,
    imgSource,
    adjustments,
    watermark,
    frame,
    crop,
    maxDimension,
    false,
    cachedPngFrame,
    cachedLogo,
    false,
    true
  );
  return canvas;
}

/**
 * Convierte un Canvas a Blob JPEG en alta calidad
 */
export function canvasToBlob(canvas: HTMLCanvasElement, quality: number = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falló la generación de Blob desde Canvas'));
      },
      'image/jpeg',
      quality
    );
  });
}
