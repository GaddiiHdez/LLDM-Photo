import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Move,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { drawProcessedPhotoToCanvas, loadImage } from '../utils/canvasEngine';
import type { PhotoItem, WatermarkSettings, FrameSettings, CropSettings, ImageAdjustments } from '../types/editor';

interface PreviewStageProps {
  photo: PhotoItem;
  watermark: WatermarkSettings;
  frame: FrameSettings;
  isFilmstripCollapsed?: boolean;
  showOriginal?: boolean;
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
};

export const PreviewStage: React.FC<PreviewStageProps> = ({
  photo,
  watermark,
  frame,
  isFilmstripCollapsed = false,
  showOriginal = false,
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
  const [isRendering, setIsRendering] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showHint, setShowHint] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // ─── Refs que NO causan re-renders (esenciales para 60fps) ───────────────────
  const dragStartRef = useRef<{ x: number; y: number; initialOffsetX: number; initialOffsetY: number } | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const currentTempCropRef = useRef<CropSettings | null>(null);
  const isDraggingRef = useRef(false);
  const showOriginalRef = useRef(showOriginal);
  const photoAdjustmentsRef = useRef(photo.adjustments);
  const photoCropRef = useRef(photo.crop);
  const onUpdateCropRef = useRef(onUpdateCrop);
  const zoomLevelRef = useRef(zoomLevel);
  const isFilmstripCollapsedRef = useRef(isFilmstripCollapsed);

  // ─── Caché en memoria de assets (Foto, Marco PNG y Logo) ─────────────────────
  const imgCacheRef = useRef<HTMLImageElement | null>(null);
  const imgCacheUrlRef = useRef<string>('');
  const frameCacheRef = useRef<HTMLImageElement | null>(null);
  const frameCacheUrlRef = useRef<string>('');
  const logoCacheRef = useRef<HTMLImageElement | null>(null);
  const logoCacheUrlRef = useRef<string>('');

  useEffect(() => { showOriginalRef.current = showOriginal; }, [showOriginal]);
  useEffect(() => { photoAdjustmentsRef.current = photo.adjustments; }, [photo.adjustments]);
  useEffect(() => { photoCropRef.current = photo.crop; }, [photo.crop]);
  useEffect(() => { onUpdateCropRef.current = onUpdateCrop; }, [onUpdateCrop]);
  useEffect(() => { zoomLevelRef.current = zoomLevel; }, [zoomLevel]);
  useEffect(() => { isFilmstripCollapsedRef.current = isFilmstripCollapsed; }, [isFilmstripCollapsed]);

  // Pre-cargar y cachear imagen de la foto
  useEffect(() => {
    if (!photo?.originalUrl) return;
    if (imgCacheUrlRef.current === photo.originalUrl && imgCacheRef.current) return;
    imgCacheUrlRef.current = photo.originalUrl;
    imgCacheRef.current = null;
    loadImage(photo.originalUrl)
      .then((img) => { imgCacheRef.current = img; })
      .catch((err) => console.error('[PreviewStage] Error cargando imagen al caché:', err));
  }, [photo?.originalUrl]);

  // Pre-cargar y cachear marco PNG institucional
  useEffect(() => {
    if (frame.style === 'custom-png' && frame.pngDataUrl) {
      if (frameCacheUrlRef.current !== frame.pngDataUrl) {
        frameCacheUrlRef.current = frame.pngDataUrl;
        loadImage(frame.pngDataUrl)
          .then((img) => { frameCacheRef.current = img; })
          .catch((err) => console.error('[PreviewStage] Error cacheando marco PNG:', err));
      }
    } else {
      frameCacheRef.current = null;
      frameCacheUrlRef.current = '';
    }
  }, [frame.style, frame.pngDataUrl]);

  // Pre-cargar y cachear logo / marca de agua
  useEffect(() => {
    if (watermark.enabled && watermark.type === 'image' && watermark.imageDataUrl) {
      if (logoCacheUrlRef.current !== watermark.imageDataUrl) {
        logoCacheUrlRef.current = watermark.imageDataUrl;
        loadImage(watermark.imageDataUrl)
          .then((img) => { logoCacheRef.current = img; })
          .catch((err) => console.error('[PreviewStage] Error cacheando logo:', err));
      }
    } else {
      logoCacheRef.current = null;
      logoCacheUrlRef.current = '';
    }
  }, [watermark.enabled, watermark.type, watermark.imageDataUrl]);

  // ─── DIBUJO DIRECTO SOBRE EL CANVAS EXISTENTE ───────
  const drawToCanvas = useCallback(async (cropSettings: CropSettings, skipCpuFilters = false, compareOriginal = false) => {
    const canvas = canvasRef.current;
    if (!canvas || !photo) return;
    const img = imgCacheRef.current || photo.originalUrl;
    const activeAdjustments = compareOriginal ? NEUTRAL_ADJUSTMENTS : photo.adjustments;
    const activeWatermark = compareOriginal ? { ...watermark, enabled: false } : watermark;
    const activeFrame = compareOriginal ? { ...frame, style: 'none' as const } : frame;

    const zl = zoomLevelRef.current;
    const maxHeightCalc = isFilmstripCollapsedRef.current ? 'calc(100vh - 115px)' : 'calc(100vh - 220px)';
    canvas.style.maxWidth = zl === 1 ? '100%' : 'none';
    canvas.style.maxHeight = zl === 1 ? maxHeightCalc : 'none';
    canvas.style.width = zl === 1 ? 'auto' : `${(canvas.width || 800) * zl}px`;
    canvas.style.borderRadius = '0.45rem';
    canvas.style.boxShadow = '0 20px 50px -12px rgba(0, 0, 0, 0.85)';

    await drawProcessedPhotoToCanvas(
      canvas,
      img,
      activeAdjustments,
      activeWatermark,
      activeFrame,
      cropSettings,
      800,
      skipCpuFilters,
      frameCacheRef.current,
      logoCacheRef.current
    );
  }, [photo, watermark, frame]);

  // ─── Trigger HD inicial / al cambiar props ──
  useEffect(() => {
    let isCancelled = false;

    const render = async () => {
      if (!photo || isDraggingRef.current) return;
      setIsRendering(true);
      try {
        await drawToCanvas(photo.crop, false, showOriginal);
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [photo, photo.adjustments, photo.crop, watermark, frame, zoomLevel, showOriginal, isFilmstripCollapsed, drawToCanvas]);

  // Atajo de teclado (Presionar 'B' para comparar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'b' && onToggleOriginal) {
        onToggleOriginal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleOriginal]);

  // ─── INICIO DE ARRASTRE (Mouse) ───────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement)?.closest('button, .floating-stage-pills')) return;
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    setShowHint(false);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialOffsetX: photo.crop?.offsetX || 0,
      initialOffsetY: photo.crop?.offsetY || 0,
    };
  };

  // ─── MOVIMIENTO (Mouse) ─────────────────────
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const sensitivity = 0.25;
    const newOffsetX = Math.max(-50, Math.min(50, dragStartRef.current.initialOffsetX - dx * sensitivity));
    const newOffsetY = Math.max(-50, Math.min(50, dragStartRef.current.initialOffsetY - dy * sensitivity));

    const tempCrop: CropSettings = {
      ...photo.crop,
      offsetX: Math.round(newOffsetX),
      offsetY: Math.round(newOffsetY),
    };
    currentTempCropRef.current = tempCrop;

    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    animFrameIdRef.current = requestAnimationFrame(() => {
      if (currentTempCropRef.current) {
        drawToCanvas(currentTempCropRef.current, true, showOriginalRef.current);
      }
    });
  };

  // ─── SOLTAR (Mouse) ────────────────────────
  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    dragStartRef.current = null;

    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (currentTempCropRef.current) {
      const finalCrop = currentTempCropRef.current;
      currentTempCropRef.current = null;
      onUpdateCropRef.current(finalCrop);
      drawToCanvas(finalCrop, false, showOriginalRef.current);
    }
  };

  // ─── GESTOS TÁCTILES MÓVILES NATIVOS (Pan 1 Dedo & Pinch-to-Zoom 2 Dedos) ──────
  useEffect(() => {
    const el = canvasWrapperRef.current;
    if (!el) return;

    interface TouchState {
      mode: 'none' | 'pan' | 'pinch';
      startX: number;
      startY: number;
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
      isDraggingRef.current = true;
      setIsDragging(true);
      setShowHint(false);

      const baseCrop = currentTempCropRef.current || photoCropRef.current;

      if (e.touches.length === 1) {
        touchState.mode = 'pan';
        touchState.startX = e.touches[0].clientX;
        touchState.startY = e.touches[0].clientY;
        touchState.initialOffsetX = baseCrop?.offsetX || 0;
        touchState.initialOffsetY = baseCrop?.offsetY || 0;
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
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      if (e.cancelable) e.preventDefault();

      const baseCrop = photoCropRef.current;

      if (e.touches.length === 1 && touchState.mode === 'pan') {
        const dx = e.touches[0].clientX - touchState.startX;
        const dy = e.touches[0].clientY - touchState.startY;

        const sensitivity = 0.35;
        const newOffsetX = Math.max(-50, Math.min(50, touchState.initialOffsetX - dx * sensitivity));
        const newOffsetY = Math.max(-50, Math.min(50, touchState.initialOffsetY - dy * sensitivity));

        const tempCrop: CropSettings = {
          ...(currentTempCropRef.current || baseCrop),
          offsetX: Math.round(newOffsetX),
          offsetY: Math.round(newOffsetY),
        };
        currentTempCropRef.current = tempCrop;

        if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = requestAnimationFrame(() => {
          if (currentTempCropRef.current) {
            drawToCanvas(currentTempCropRef.current, true, showOriginalRef.current);
          }
        });
      } else if (e.touches.length >= 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const scale = dist / touchState.initialDist;

        const newZoom = Math.max(1.0, Math.min(3.0, Number((touchState.initialZoom * scale).toFixed(2))));

        const curMidX = (t1.clientX + t2.clientX) / 2;
        const curMidY = (t1.clientY + t2.clientY) / 2;
        const dx = curMidX - touchState.midStartX;
        const dy = curMidY - touchState.midStartY;
        const sensitivity = 0.35;
        const newOffsetX = Math.max(-50, Math.min(50, touchState.initialOffsetX - dx * sensitivity));
        const newOffsetY = Math.max(-50, Math.min(50, touchState.initialOffsetY - dy * sensitivity));

        const tempCrop: CropSettings = {
          ...(currentTempCropRef.current || baseCrop),
          zoom: newZoom,
          offsetX: Math.round(newOffsetX),
          offsetY: Math.round(newOffsetY),
        };
        currentTempCropRef.current = tempCrop;

        if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = requestAnimationFrame(() => {
          if (currentTempCropRef.current) {
            drawToCanvas(currentTempCropRef.current, true, showOriginalRef.current);
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
        isDraggingRef.current = false;
        setIsDragging(false);
        touchState.mode = 'none';

        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
          animFrameIdRef.current = null;
        }

        if (currentTempCropRef.current) {
          const finalCrop = currentTempCropRef.current;
          currentTempCropRef.current = null;
          onUpdateCropRef.current(finalCrop);
          drawToCanvas(finalCrop, false, showOriginalRef.current);
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
  }, [drawToCanvas]);

  // ─── ZOOM con rueda del ratón ──────────────────────────────────────────────────
  const handleWheel = (e: React.WheelEvent) => {
    const currentZoom = photo.crop?.zoom || 1.0;
    const zoomDelta = e.deltaY < 0 ? 0.05 : -0.05;
    const newZoom = Math.max(1.0, Math.min(2.5, Number((currentZoom + zoomDelta).toFixed(2))));

    onUpdateCrop({
      ...photo.crop,
      zoom: newZoom,
    });
  };

  return (
    <div className="preview-stage" ref={containerRef}>
      {/* Main Canvas Display Stage (100% Inmersivo sin doble barra superior) */}
      <div
        className="canvas-wrapper"
        ref={canvasWrapperRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      >
        {/* Píldora Flotante Discreta de Lupa en esquina superior derecha */}
        <div className="floating-stage-pills">
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

        {isRendering && !isDragging && (
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

        {/* Botones Flotantes de Navegación Rápida entre Fotos (< y >) */}
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
            <ChevronLeft size={22} />
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
            <ChevronRight size={22} />
          </button>
        )}

        <div ref={canvasContainerRef} className="canvas-container">
          <canvas
            ref={canvasRef}
            className="studio-preview-canvas"
            style={{
              maxWidth: zoomLevel === 1 ? '100%' : 'none',
              maxHeight: isFilmstripCollapsed ? 'calc(100vh - 115px)' : 'calc(100vh - 220px)',
              width: zoomLevel === 1 ? 'auto' : `${(canvasRef.current?.width || 800) * zoomLevel}px`,
              borderRadius: '0.45rem',
              boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.85)',
            }}
          />
        </div>

        {/* Hint Flotante Elegante de Arrastre */}
        {showHint && !isDragging && (
          <div className="floating-canvas-hint" onClick={() => setShowHint(false)}>
            <Move size={12} style={{ color: 'var(--color-brand-light)' }} />
            <span className="hint-desktop">Arrastra para re-encuadrar · Doble toque en controles para reiniciar</span>
            <span className="hint-mobile">Arrastra o pellizca la foto · Doble toque para reiniciar sliders</span>
          </div>
        )}
      </div>
    </div>
  );
};
