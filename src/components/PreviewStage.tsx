import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Zap,
  BarChart2,
  X,
} from 'lucide-react';
import {
  drawProcessedPhotoSync,
  loadImage,
  getCachedImageSync,
  createBaseProxyCanvas,
  bakeToneToProxyCanvas,
} from '../utils/canvasEngine';
import type { PhotoItem, WatermarkSettings, FrameSettings, CropSettings, ImageAdjustments } from '../types/editor';

interface PreviewStageProps {
  photo: PhotoItem;
  watermark: WatermarkSettings;
  frame: FrameSettings;
  showOriginal?: boolean;
  isCropMode?: boolean;
  showZebraClipping?: boolean;
  onToggleOriginal?: (val?: boolean) => void;
  onSingleExport?: () => void;
  onSingleShare?: () => void;
  onUpdateCrop: (crop: CropSettings) => void;
  onPrevPhoto?: () => void;
  onNextPhoto?: () => void;
  hasPrevPhoto?: boolean;
  hasNextPhoto?: boolean;
}

const NEUTRAL_ADJUSTMENTS: ImageAdjustments = {
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

// Caché LRU de proxies base (1280px) en memoria para cambio instantáneo entre fotos del lote
const baseProxyCache = new Map<string, HTMLCanvasElement>();
const MAX_PROXY_CACHE = 10;

function getOrCreateBaseProxy(url: string, img: HTMLImageElement): HTMLCanvasElement {
  const existing = baseProxyCache.get(url);
  if (existing) {
    // Mover al final (LRU)
    baseProxyCache.delete(url);
    baseProxyCache.set(url, existing);
    return existing;
  }
  const proxy = createBaseProxyCanvas(img, 1280);
  if (baseProxyCache.size >= MAX_PROXY_CACHE) {
    const oldestKey = baseProxyCache.keys().next().value;
    if (oldestKey !== undefined) baseProxyCache.delete(oldestKey);
  }
  baseProxyCache.set(url, proxy);
  return proxy;
}

function getAdjustmentsKey(url: string, adj: ImageAdjustments, highRes: boolean): string {
  return `${url}|${adj.brightness}|${adj.contrast}|${adj.saturation}|${adj.shadows}|${adj.highlights}|${adj.warmth}|${adj.sharpness}|${adj.clarity || 0}|${adj.noiseReduction || 0}|${adj.skinToneGuard !== false ? 1 : 0}|${highRes ? 'hd' : 'fast'}`;
}

export const PreviewStage: React.FC<PreviewStageProps> = ({
  photo,
  watermark,
  frame,
  showOriginal = false,
  isCropMode = false,
  showZebraClipping = false,
  onToggleOriginal,
  onUpdateCrop,
  onPrevPhoto,
  onNextPhoto,
  hasPrevPhoto = false,
  hasNextPhoto = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZebras, setShowZebras] = useState(showZebraClipping);
  const [showHistogram, setShowHistogram] = useState(false);
  const [clippingStats, setClippingStats] = useState<{ clippedPct: number; isClipping: boolean } | null>(null);

  const zebraCanvasRef = useRef<HTMLCanvasElement>(null);
  const histogramCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sincronizar prop si cambia externamente
  useEffect(() => {
    setShowZebras(showZebraClipping);
  }, [showZebraClipping]);

  // ─── Refs que NO causan re-renders (esenciales para 60-120fps) ───────────────
  const dragStartRef = useRef<{ x: number; y: number; initialOffsetX: number; initialOffsetY: number } | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const hdBakeTimerRef = useRef<number | null>(null);
  const wheelCommitTimerRef = useRef<number | null>(null);
  const currentTempCropRef = useRef<CropSettings | null>(null);
  const isDraggingRef = useRef(false);

  const photoRef = useRef(photo);
  const watermarkRef = useRef(watermark);
  const frameRef = useRef(frame);
  const showOriginalRef = useRef(showOriginal);
  const photoAdjustmentsRef = useRef(photo.adjustments);
  const photoCropRef = useRef(photo.crop);
  const onUpdateCropRef = useRef(onUpdateCrop);
  const onPrevPhotoRef = useRef(onPrevPhoto);
  const onNextPhotoRef = useRef(onNextPhoto);
  const hasPrevPhotoRef = useRef(hasPrevPhoto);
  const hasNextPhotoRef = useRef(hasNextPhoto);
  const zoomLevelRef = useRef(zoomLevel);

  // ─── Proxies GPU en memoria (Base sin filtros + Tono/Color/Nitidez horneados) ─
  const baseProxyRef = useRef<HTMLCanvasElement | null>(null);
  const baseProxyUrlRef = useRef<string>('');
  const tonedProxyRef = useRef<HTMLCanvasElement | null>(null);
  const bakedKeyRef = useRef<string>('');
  const lastAdjustmentsOnlyKeyRef = useRef<string>('');

  const frameCacheRef = useRef<HTMLImageElement | null>(null);
  const frameCacheUrlRef = useRef<string>('');
  const logoCacheRef = useRef<HTMLImageElement | null>(null);
  const logoCacheUrlRef = useRef<string>('');

  photoRef.current = photo;
  watermarkRef.current = watermark;
  frameRef.current = frame;
  showOriginalRef.current = showOriginal;
  photoAdjustmentsRef.current = photo.adjustments;
  photoCropRef.current = photo.crop;
  onUpdateCropRef.current = onUpdateCrop;
  onPrevPhotoRef.current = onPrevPhoto;
  onNextPhotoRef.current = onNextPhoto;
  hasPrevPhotoRef.current = hasPrevPhoto;
  hasNextPhotoRef.current = hasNextPhoto;
  zoomLevelRef.current = zoomLevel;

  // Asegurar que exista el canvas proxy de tono
  const getTonedProxyCanvas = (): HTMLCanvasElement => {
    if (!tonedProxyRef.current) {
      tonedProxyRef.current = document.createElement('canvas');
    }
    return tonedProxyRef.current;
  };

  // ─── ANÁLISIS DE ALTAS LUCES QUEMADAS (ZEBRA BLINKIES) E HISTOGRAMA RGB ──────
  const updateZebraAndHistogram = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!showZebras && !showHistogram) {
      if (zebraCanvasRef.current) {
        const zCtx = zebraCanvasRef.current.getContext('2d');
        zCtx?.clearRect(0, 0, zebraCanvasRef.current.width, zebraCanvasRef.current.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;

    let imgData: ImageData;
    try {
      imgData = ctx.getImageData(0, 0, width, height);
    } catch {
      return;
    }

    const data = imgData.data;
    const totalPixels = width * height;

    const histR = showHistogram ? new Uint32Array(256) : null;
    const histG = showHistogram ? new Uint32Array(256) : null;
    const histB = showHistogram ? new Uint32Array(256) : null;
    const histL = showHistogram ? new Uint32Array(256) : null;

    let clippedCount = 0;
    const zCanvas = zebraCanvasRef.current;
    let zCtx: CanvasRenderingContext2D | null = null;
    let zImgData: ImageData | null = null;
    let zBuffer: Uint32Array | null = null;

    if (showZebras && zCanvas) {
      if (zCanvas.width !== width || zCanvas.height !== height) {
        zCanvas.width = width;
        zCanvas.height = height;
      }
      zCtx = zCanvas.getContext('2d');
      if (zCtx) {
        zImgData = zCtx.createImageData(width, height);
        zBuffer = new Uint32Array(zImgData.data.buffer);
      }
    }

    // Análisis de píxeles
    const step = showHistogram && !showZebras ? 4 : 1;
    for (let y = 0; y < height; y += step) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x += step) {
        const idx = rowOffset + x;
        const pxIdx = idx * 4;
        const r = data[pxIdx];
        const g = data[pxIdx + 1];
        const b = data[pxIdx + 2];

        if (showHistogram && histR && histG && histB && histL) {
          histR[r]++;
          histG[g]++;
          histB[b]++;
          const lum = (r * 77 + g * 150 + b * 29) >> 8;
          histL[lum]++;
        }

        if (showZebras && zBuffer) {
          // Altas luces quemadas (R, G y B >= 252 o blanco puro)
          if (r >= 252 && g >= 252 && b >= 252) {
            clippedCount++;
            const isStripe = ((x + y) >> 2) & 1;
            zBuffer[idx] = isStripe ? 0xFF0000FF : 0xAA000000;
          } else {
            zBuffer[idx] = 0;
          }
        }
      }
    }

    if (showZebras && zCtx && zImgData) {
      zCtx.putImageData(zImgData, 0, 0);
      const clippedPct = (clippedCount / totalPixels) * 100;
      setClippingStats({
        clippedPct,
        isClipping: clippedCount > 0,
      });
    }

    if (showHistogram && histR && histG && histB && histL && histogramCanvasRef.current) {
      const hCanvas = histogramCanvasRef.current;
      const hCtx = hCanvas.getContext('2d');
      if (hCtx) {
        const hW = hCanvas.width;
        const hH = hCanvas.height;
        hCtx.clearRect(0, 0, hW, hH);

        hCtx.fillStyle = 'rgba(10, 10, 15, 0.75)';
        hCtx.fillRect(0, 0, hW, hH);

        let maxVal = 1;
        for (let i = 2; i < 254; i++) {
          if (histL[i] > maxVal) maxVal = histL[i];
          if (histR[i] > maxVal) maxVal = histR[i];
          if (histG[i] > maxVal) maxVal = histG[i];
          if (histB[i] > maxVal) maxVal = histB[i];
        }

        const drawCurve = (bins: Uint32Array, color: string, fill?: string) => {
          hCtx.beginPath();
          hCtx.strokeStyle = color;
          hCtx.lineWidth = 1;
          for (let i = 0; i < 256; i++) {
            const pxX = (i / 255) * hW;
            const normH = Math.min(1, bins[i] / maxVal) * (hH - 4);
            const pxY = hH - normH;
            if (i === 0) hCtx.moveTo(pxX, pxY);
            else hCtx.lineTo(pxX, pxY);
          }
          hCtx.stroke();
          if (fill) {
            hCtx.lineTo(hW, hH);
            hCtx.lineTo(0, hH);
            hCtx.closePath();
            hCtx.fillStyle = fill;
            hCtx.fill();
          }
        };

        drawCurve(histL, 'rgba(255, 255, 255, 0.35)', 'rgba(255, 255, 255, 0.08)');
        drawCurve(histR, 'rgba(239, 68, 68, 0.85)');
        drawCurve(histG, 'rgba(34, 197, 94, 0.85)');
        drawCurve(histB, 'rgba(59, 130, 246, 0.85)');
      }
    }
  }, [showZebras, showHistogram]);

  // ─── DIBUJO SÍNCRONO ULTRA-RÁPIDO (< 0.8ms cuando el tono ya está horneado) ──
  const renderCanvasSync = useCallback((
    cropOverride?: CropSettings,
    highResTone: boolean = true
  ) => {
    const canvas = canvasRef.current;
    const curPhoto = photoRef.current;
    const baseProxy = baseProxyRef.current;
    if (!canvas || !curPhoto || !baseProxy) return;

    const activeCrop = cropOverride || currentTempCropRef.current || curPhoto.crop;
    const compareOrig = showOriginalRef.current;
    const activeWatermark = compareOrig ? { ...watermarkRef.current, enabled: false } : watermarkRef.current;
    const activeFrame = compareOrig ? { ...frameRef.current, style: 'none' as const } : frameRef.current;

    const zl = zoomLevelRef.current;
    canvas.style.maxWidth = zl === 1 ? '100%' : 'none';
    canvas.style.maxHeight = zl === 1 ? '100%' : 'none';
    canvas.style.width = zl === 1 ? 'auto' : `${(canvas.width || 960) * zl}px`;
    canvas.style.height = 'auto';
    canvas.style.borderRadius = '0.45rem';
    canvas.style.boxShadow = '0 14px 36px -10px rgba(0, 0, 0, 0.8)';

    let sourceDrawable: HTMLCanvasElement = baseProxy;

    if (!compareOrig) {
      const adj = curPhoto.adjustments;
      const targetKey = getAdjustmentsKey(curPhoto.originalUrl, adj, highResTone);
      const hdKey = getAdjustmentsKey(curPhoto.originalUrl, adj, true);
      const tonedProxy = getTonedProxyCanvas();

      // Si ya tenemos la versión HD horneada para estos mismos ajustes, reutilizarla directamente sin tocar píxeles
      if (bakedKeyRef.current !== hdKey && bakedKeyRef.current !== targetKey) {
        const resScale = highResTone ? 1.0 : 0.65;
        const skipSharp = !highResTone;
        bakeToneToProxyCanvas(tonedProxy, baseProxy, adj, resScale, skipSharp);
        bakedKeyRef.current = targetKey;
      }
      sourceDrawable = tonedProxy;
    }

    drawProcessedPhotoSync(
      canvas,
      sourceDrawable,
      compareOrig ? NEUTRAL_ADJUSTMENTS : curPhoto.adjustments,
      activeWatermark,
      activeFrame,
      activeCrop,
      960,
      true,
      frameCacheRef.current,
      logoCacheRef.current,
      true // adjustmentsAlreadyBaked: evita ctx.filter y getImageData al mover/rotar/encuadrar
    );

    // Actualizar indicador de luces quemadas y curvas de histograma
    updateZebraAndHistogram();
  }, [updateZebraAndHistogram]);

  // Actualizar cebras o histograma al cambiar sus botones
  useEffect(() => {
    updateZebraAndHistogram();
  }, [showZebras, showHistogram, updateZebraAndHistogram]);

  // Pre-cargar y cachear marco PNG institucional y redibujar al instante
  useEffect(() => {
    if (frame.style === 'custom-png' && frame.pngDataUrl) {
      const syncImg = getCachedImageSync(frame.pngDataUrl);
      if (syncImg) {
        frameCacheRef.current = syncImg;
        frameCacheUrlRef.current = frame.pngDataUrl;
        renderCanvasSync(undefined, true);
        return;
      }
      if (frameCacheUrlRef.current !== frame.pngDataUrl) {
        frameCacheUrlRef.current = frame.pngDataUrl;
        loadImage(frame.pngDataUrl)
          .then((img) => {
            frameCacheRef.current = img;
            renderCanvasSync(undefined, true);
          })
          .catch((err) => console.error('[PreviewStage] Error cacheando marco PNG:', err));
      }
    } else {
      frameCacheRef.current = null;
      frameCacheUrlRef.current = '';
    }
  }, [frame.style, frame.pngDataUrl, renderCanvasSync]);

  // Pre-cargar y cachear logo / marca de agua y redibujar al instante
  useEffect(() => {
    if (watermark.enabled && watermark.type === 'image' && watermark.imageDataUrl) {
      const syncLogo = getCachedImageSync(watermark.imageDataUrl);
      if (syncLogo) {
        logoCacheRef.current = syncLogo;
        logoCacheUrlRef.current = watermark.imageDataUrl;
        renderCanvasSync(undefined, true);
        return;
      }
      if (logoCacheUrlRef.current !== watermark.imageDataUrl) {
        logoCacheUrlRef.current = watermark.imageDataUrl;
        loadImage(watermark.imageDataUrl)
          .then((img) => {
            logoCacheRef.current = img;
            renderCanvasSync(undefined, true);
          })
          .catch((err) => console.error('[PreviewStage] Error cacheando logo:', err));
      }
    } else {
      logoCacheRef.current = null;
      logoCacheUrlRef.current = '';
    }
  }, [watermark.enabled, watermark.type, watermark.imageDataUrl, renderCanvasSync]);

  // ─── Carga de foto activa y creación inmediata del Base Proxy (1280px) ───────
  useEffect(() => {
    if (!photo?.originalUrl) return;
    let cancelled = false;

    const url = photo.originalUrl;
    currentTempCropRef.current = null;

    // 1. Vía rápida en memoria (0ms si ya visitó la foto o si ya fue decodificada al importar)
    const cachedProxy = baseProxyCache.get(url);
    if (cachedProxy) {
      baseProxyRef.current = cachedProxy;
      baseProxyUrlRef.current = url;
      setIsInitialLoading(false);
      renderCanvasSync(photo.crop, true);
      return;
    }

    const syncImg = getCachedImageSync(url);
    if (syncImg) {
      const proxy = getOrCreateBaseProxy(url, syncImg);
      baseProxyRef.current = proxy;
      baseProxyUrlRef.current = url;
      setIsInitialLoading(false);
      renderCanvasSync(photo.crop, true);
      return;
    }

    // 2. Vía asíncrona solo si la imagen aún no está en RAM
    setIsInitialLoading(true);
    loadImage(url)
      .then((img) => {
        if (cancelled) return;
        const proxy = getOrCreateBaseProxy(url, img);
        baseProxyRef.current = proxy;
        baseProxyUrlRef.current = url;
        setIsInitialLoading(false);
        renderCanvasSync(photoRef.current.crop, true);
      })
      .catch((err) => {
        if (!cancelled) setIsInitialLoading(false);
        console.error('[PreviewStage] Error cargando imagen:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [photo?.originalUrl, renderCanvasSync]);

  // ─── Reacción fluida a cambios de ajustes, encuadre, marco o marca de agua ───
  useEffect(() => {
    if (!photo || !baseProxyRef.current || isDraggingRef.current) return;

    const adj = photo.adjustments;
    const adjOnlyKey = `${photo.originalUrl}|${adj.brightness}|${adj.contrast}|${adj.saturation}|${adj.shadows}|${adj.highlights}|${adj.warmth}|${adj.sharpness}`;
    const adjustmentsChanged = adjOnlyKey !== lastAdjustmentsOnlyKeyRef.current;
    lastAdjustmentsOnlyKeyRef.current = adjOnlyKey;

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (adjustmentsChanged) {
      // Pase interactivo inmediato a 60fps mientras se desliza el control de luz/color
      animFrameIdRef.current = requestAnimationFrame(() => {
        renderCanvasSync(photo.crop, false);
      });

      // Pase de nitidez y resolución completa 100ms después de detener el slider
      if (hdBakeTimerRef.current) window.clearTimeout(hdBakeTimerRef.current);
      hdBakeTimerRef.current = window.setTimeout(() => {
        renderCanvasSync(photoRef.current.crop, true);
      }, 100);
    } else {
      // Cambio geométrico (rotar, nivelar, zoom, proporción, marco o firma):
      // El proxy de tono YA está horneado, así que el redibujado toma < 0.8ms en alta resolución
      animFrameIdRef.current = requestAnimationFrame(() => {
        renderCanvasSync(photo.crop, true);
      });
    }
  }, [photo, photo.adjustments, photo.crop, watermark, frame, zoomLevel, showOriginal, renderCanvasSync]);

  // Limpieza de timers al desmontar
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (hdBakeTimerRef.current) window.clearTimeout(hdBakeTimerRef.current);
      if (wheelCommitTimerRef.current) window.clearTimeout(wheelCommitTimerRef.current);
    };
  }, []);

  // Atajo de teclado (Presionar 'B' para comparar o flechas izq/der para navegar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'b' && onToggleOriginal) {
        onToggleOriginal();
      } else if (e.key === 'ArrowLeft' && hasPrevPhotoRef.current && onPrevPhotoRef.current) {
        onPrevPhotoRef.current();
      } else if (e.key === 'ArrowRight' && hasNextPhotoRef.current && onNextPhotoRef.current) {
        onNextPhotoRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleOriginal]);

  // Convierte el desplazamiento en píxeles de pantalla (dx, dy) en deltas de offset (-50..+50)
  // respetando la rotación (90°/180°/270°/nivelación), espejo y nivel de zoom para seguimiento 1:1 del dedo
  const computeSmoothPanOffsets = (
    dx: number,
    dy: number,
    initialOffsetX: number,
    initialOffsetY: number,
    baseCrop: CropSettings
  ): { offsetX: number; offsetY: number } => {
    const rotDeg = (baseCrop.rotation || 0) + (baseCrop.straighten || 0);
    const angleRad = (-rotDeg * Math.PI) / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    let localDx = dx * cosA - dy * sinA;
    let localDy = dx * sinA + dy * cosA;
    if (baseCrop.flipH) localDx = -localDx;
    if (baseCrop.flipV) localDy = -localDy;

    const canvasEl = canvasRef.current;
    const displayW = Math.max(180, canvasEl?.clientWidth || 360);
    const displayH = Math.max(180, canvasEl?.clientHeight || 360);
    const zoom = Math.max(1.0, baseCrop.zoom || 1.0);

    // Sensibilidad adaptativa para que la imagen siga al dedo/cursor con naturalidad
    const sensX = (100 / displayW) / Math.max(0.65, zoom * 0.85);
    const sensY = (100 / displayH) / Math.max(0.65, zoom * 0.85);

    const newOffsetX = Math.max(-50, Math.min(50, initialOffsetX - localDx * sensX));
    const newOffsetY = Math.max(-50, Math.min(50, initialOffsetY - localDy * sensY));

    return {
      offsetX: Number(newOffsetX.toFixed(2)),
      offsetY: Number(newOffsetY.toFixed(2)),
    };
  };

  // ─── INICIO DE ARRASTRE (Mouse) ───────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement)?.closest('button, .floating-stage-pills')) return;
    e.preventDefault();
    const baseCrop = currentTempCropRef.current || photoCropRef.current;
    isDraggingRef.current = true;
    if (canvasWrapperRef.current) {
      canvasWrapperRef.current.style.cursor = 'grabbing';
    }
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialOffsetX: baseCrop?.offsetX || 0,
      initialOffsetY: baseCrop?.offsetY || 0,
    };
  };

  // ─── MOVIMIENTO (Mouse a 60-120fps sin re-render React) ───────────────────────
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const baseCrop = currentTempCropRef.current || photoCropRef.current;

    const { offsetX, offsetY } = computeSmoothPanOffsets(
      dx,
      dy,
      dragStartRef.current.initialOffsetX,
      dragStartRef.current.initialOffsetY,
      baseCrop
    );

    const tempCrop: CropSettings = {
      ...baseCrop,
      offsetX,
      offsetY,
    };
    currentTempCropRef.current = tempCrop;

    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    animFrameIdRef.current = requestAnimationFrame(() => {
      if (currentTempCropRef.current) {
        renderCanvasSync(currentTempCropRef.current, true);
      }
    });
  };

  // ─── SOLTAR (Mouse) ──────────────────────────────────────────────────────────
  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (canvasWrapperRef.current) {
      canvasWrapperRef.current.style.cursor = 'grab';
    }
    dragStartRef.current = null;

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (currentTempCropRef.current) {
      const finalCrop = currentTempCropRef.current;
      currentTempCropRef.current = null;
      onUpdateCropRef.current(finalCrop);
    }
  };

  // ─── GESTOS TÁCTILES INTELIGENTES (Swipe Foto / Pan Encuadre / Pinch-to-Zoom) ─
  useEffect(() => {
    const el = canvasWrapperRef.current;
    if (!el) return;

    interface TouchState {
      mode: 'none' | 'swipe-or-pan' | 'pan' | 'pinch';
      startX: number;
      startY: number;
      lastX: number;
      lastY: number;
      initialOffsetX: number;
      initialOffsetY: number;
      initialDist: number;
      initialZoom: number;
      midStartX: number;
      midStartY: number;
    }

    const touchState: TouchState = {
      mode: 'none',
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      initialOffsetX: 0,
      initialOffsetY: 0,
      initialDist: 0,
      initialZoom: 1,
      midStartX: 0,
      midStartY: 0,
    };

    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest('.canvas-nav-btn, button, .floating-stage-pills')) {
        return;
      }

      if (e.cancelable) e.preventDefault();
      const baseCrop = currentTempCropRef.current || photoCropRef.current;

      if (e.touches.length === 1) {
        const isCroppedOrZoomed =
          (baseCrop?.zoom || 1) > 1.005 ||
          (baseCrop?.aspectRatio && baseCrop.aspectRatio !== 'original') ||
          Math.abs(baseCrop?.straighten || 0) > 0.05 ||
          (baseCrop?.offsetX || 0) !== 0 ||
          (baseCrop?.offsetY || 0) !== 0;

        touchState.mode = isCroppedOrZoomed ? 'pan' : 'swipe-or-pan';
        touchState.startX = e.touches[0].clientX;
        touchState.startY = e.touches[0].clientY;
        touchState.lastX = e.touches[0].clientX;
        touchState.lastY = e.touches[0].clientY;
        touchState.initialOffsetX = baseCrop?.offsetX || 0;
        touchState.initialOffsetY = baseCrop?.offsetY || 0;
        isDraggingRef.current = true;
      } else if (e.touches.length >= 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        touchState.mode = 'pinch';
        touchState.initialDist = Math.max(10, dist);
        touchState.initialZoom = baseCrop?.zoom || 1.0;
        touchState.midStartX = (t1.clientX + t2.clientX) / 2;
        touchState.midStartY = (t1.clientY + t2.clientY) / 2;
        touchState.initialOffsetX = baseCrop?.offsetX || 0;
        touchState.initialOffsetY = baseCrop?.offsetY || 0;
        isDraggingRef.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      if (e.cancelable) e.preventDefault();

      const baseCrop = currentTempCropRef.current || photoCropRef.current;

      if (e.touches.length === 1) {
        touchState.lastX = e.touches[0].clientX;
        touchState.lastY = e.touches[0].clientY;

        if (touchState.mode === 'pan') {
          const dx = e.touches[0].clientX - touchState.startX;
          const dy = e.touches[0].clientY - touchState.startY;

          const { offsetX, offsetY } = computeSmoothPanOffsets(
            dx,
            dy,
            touchState.initialOffsetX,
            touchState.initialOffsetY,
            baseCrop
          );

          const tempCrop: CropSettings = {
            ...baseCrop,
            offsetX,
            offsetY,
          };
          currentTempCropRef.current = tempCrop;

          if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
          animFrameIdRef.current = requestAnimationFrame(() => {
            if (currentTempCropRef.current) {
              renderCanvasSync(currentTempCropRef.current, true);
            }
          });
        }
      } else if (e.touches.length >= 2) {
        touchState.mode = 'pinch';
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const scale = dist / touchState.initialDist;

        const newZoom = Math.max(1.0, Math.min(3.0, Number((touchState.initialZoom * scale).toFixed(3))));

        const curMidX = (t1.clientX + t2.clientX) / 2;
        const curMidY = (t1.clientY + t2.clientY) / 2;
        const dx = curMidX - touchState.midStartX;
        const dy = curMidY - touchState.midStartY;

        const { offsetX, offsetY } = computeSmoothPanOffsets(
          dx,
          dy,
          touchState.initialOffsetX,
          touchState.initialOffsetY,
          { ...baseCrop, zoom: newZoom }
        );

        const tempCrop: CropSettings = {
          ...baseCrop,
          zoom: newZoom,
          offsetX,
          offsetY,
        };
        currentTempCropRef.current = tempCrop;

        if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = requestAnimationFrame(() => {
          if (currentTempCropRef.current) {
            renderCanvasSync(currentTempCropRef.current, true);
          }
        });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;

      if (e.touches.length === 1) {
        const remaining = e.touches[0];
        const baseCrop = currentTempCropRef.current || photoCropRef.current;
        touchState.mode = 'pan';
        touchState.startX = remaining.clientX;
        touchState.startY = remaining.clientY;
        touchState.initialOffsetX = baseCrop?.offsetX || 0;
        touchState.initialOffsetY = baseCrop?.offsetY || 0;
        return;
      }

      if (e.touches.length === 0) {
        if (touchState.mode === 'swipe-or-pan') {
          const dx = touchState.lastX - touchState.startX;
          const dy = touchState.lastY - touchState.startY;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            if (dx < 0 && hasNextPhotoRef.current && onNextPhotoRef.current) {
              onNextPhotoRef.current();
            } else if (dx > 0 && hasPrevPhotoRef.current && onPrevPhotoRef.current) {
              onPrevPhotoRef.current();
            }
          }
        }

        isDraggingRef.current = false;
        touchState.mode = 'none';

        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
          animFrameIdRef.current = null;
        }

        if (currentTempCropRef.current) {
          const finalCrop = currentTempCropRef.current;
          currentTempCropRef.current = null;
          onUpdateCropRef.current(finalCrop);
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [renderCanvasSync]);

  // ─── ZOOM fluido con rueda del ratón / trackpad ──────────────────────────────
  const handleWheel = (e: React.WheelEvent) => {
    const baseCrop = currentTempCropRef.current || photoCropRef.current;
    const currentZoom = baseCrop?.zoom || 1.0;
    const zoomDelta = e.deltaY < 0 ? 0.04 : -0.04;
    const newZoom = Math.max(1.0, Math.min(3.0, Number((currentZoom + zoomDelta).toFixed(2))));

    const nextCrop: CropSettings = {
      ...baseCrop,
      zoom: newZoom,
    };
    currentTempCropRef.current = nextCrop;

    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    animFrameIdRef.current = requestAnimationFrame(() => {
      renderCanvasSync(nextCrop, true);
    });

    if (wheelCommitTimerRef.current) window.clearTimeout(wheelCommitTimerRef.current);
    wheelCommitTimerRef.current = window.setTimeout(() => {
      if (currentTempCropRef.current) {
        const finalCrop = currentTempCropRef.current;
        currentTempCropRef.current = null;
        onUpdateCropRef.current(finalCrop);
      }
    }, 80);
  };

  return (
    <div className="preview-stage" ref={containerRef}>
      <div
        className="canvas-wrapper"
        ref={canvasWrapperRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: 'grab', touchAction: 'none' }}
      >
        {/* Píldoras Flotantes Discretas en esquina superior derecha */}
        <div className="floating-stage-pills">
          {/* Badge de Alerta: Altas luces quemadas (Zebra) */}
          {showZebras && clippingStats?.isClipping && (
            <div className="stage-clipping-warning-badge" title="Alerta: Ropas blancas o lámparas sobreexpuestas">
              <span className="warning-dot" />
              <span>{clippingStats.clippedPct.toFixed(1)}% quemado</span>
            </div>
          )}

          {/* Botón Cebras (Zebra Blinkies) */}
          <button
            type="button"
            onClick={() => setShowZebras((z) => !z)}
            className={`stage-pill-btn ${showZebras ? 'active' : ''}`}
            title="Activar / Desactivar indicador de altas luces quemadas (Zebra)"
          >
            <Zap size={12} style={{ color: showZebras ? '#f59e0b' : 'inherit' }} />
            <span>Zebra</span>
          </button>

          {/* Botón Histograma RGB */}
          <button
            type="button"
            onClick={() => setShowHistogram((h) => !h)}
            className={`stage-pill-btn ${showHistogram ? 'active' : ''}`}
            title="Mostrar / Ocultar histograma RGB multiespectral"
          >
            <BarChart2 size={12} style={{ color: showHistogram ? '#f59e0b' : 'inherit' }} />
            <span>RGB</span>
          </button>

          {/* Lupa de inspección */}
          <button
            type="button"
            onClick={() => setZoomLevel((z) => (z === 1 ? 1.5 : z === 1.5 ? 2 : 1))}
            className="stage-pill-btn"
            title="Cambiar lupa de inspección"
          >
            {zoomLevel > 1 ? <ZoomOut size={12} /> : <ZoomIn size={12} />}
            <span>{Math.round(zoomLevel * 100)}%</span>
          </button>
        </div>

        {/* Histograma RGB Flotante Compacto */}
        {showHistogram && (
          <div className="floating-rgb-histogram card-glass">
            <div className="histogram-header">
              <span>HISTOGRAMA RGB</span>
              <button
                type="button"
                onClick={() => setShowHistogram(false)}
                className="histogram-close-btn"
                title="Cerrar histograma"
              >
                <X size={10} />
              </button>
            </div>
            <canvas ref={histogramCanvasRef} width={136} height={52} className="histogram-canvas" />
          </div>
        )}

        {isInitialLoading && (
          <div className="rendering-overlay">
            <RefreshCw size={20} className="spin-icon" style={{ color: 'var(--color-brand)' }} />
            <span>Procesando...</span>
          </div>
        )}

        {/* Badge Flotante "ORIGINAL" durante la comparativa */}
        {showOriginal && (
          <div className="original-compare-badge">
            <Eye size={13} />
            <span>ORIGINAL (SIN PROCESAR)</span>
          </div>
        )}

        {/* Botones de Navegación en Escritorio (< y >) */}
        {hasPrevPhoto && onPrevPhoto && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrevPhoto();
            }}
            className="canvas-nav-btn prev"
            title="Foto anterior"
            aria-label="Foto anterior"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {hasNextPhoto && onNextPhoto && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNextPhoto();
            }}
            className="canvas-nav-btn next"
            title="Siguiente foto"
            aria-label="Siguiente foto"
          >
            <ChevronRight size={20} />
          </button>
        )}

        <div ref={canvasContainerRef} className="canvas-container">
          <canvas
            ref={canvasRef}
            className="studio-preview-canvas"
          />
          {/* Overlay de Luces Quemadas (Zebra Blinkies) */}
          <canvas
            ref={zebraCanvasRef}
            className="oneui-zebra-overlay"
            style={{
              display: showZebras ? 'block' : 'none',
              maxWidth: zoomLevel === 1 ? '100%' : 'none',
              maxHeight: zoomLevel === 1 ? '100%' : 'none',
              width: zoomLevel === 1 ? 'auto' : `${(canvasRef.current?.width || 960) * zoomLevel}px`,
              height: 'auto',
              borderRadius: '0.45rem',
            }}
          />
          {/* Cuadrícula de Composición: Regla de Tercios 3x3 */}
          {isCropMode && (
            <div className="oneui-rule-of-thirds-grid" title="Guía de composición eclesiástica: Regla de Tercios 3x3">
              <div className="grid-line vertical line-1" />
              <div className="grid-line vertical line-2" />
              <div className="grid-line horizontal line-1" />
              <div className="grid-line horizontal line-2" />
              <div className="grid-dot dot-1" />
              <div className="grid-dot dot-2" />
              <div className="grid-dot dot-3" />
              <div className="grid-dot dot-4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
