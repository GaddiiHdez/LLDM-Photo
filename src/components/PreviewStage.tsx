import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Download,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Image as ImageIcon,
  Activity,
  Move,
  Eye,
  EyeOff,
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
  onSingleExport: () => void;
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
  onSingleExport,
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
  const [showOriginal, setShowOriginal] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // ─── Refs que NO causan re-renders (esenciales para 60fps) ───────────────────
  const dragStartRef = useRef<{ x: number; y: number; initialOffsetX: number; initialOffsetY: number } | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const currentTempCropRef = useRef<CropSettings | null>(null);
  // Espejos ref para evitar stale closures en event callbacks
  const isDraggingRef = useRef(false);
  const showOriginalRef = useRef(showOriginal);
  const photoAdjustmentsRef = useRef(photo.adjustments);
  const photoCropRef = useRef(photo.crop);
  const onUpdateCropRef = useRef(onUpdateCrop);
  const zoomLevelRef = useRef(zoomLevel);
  const isFilmstripCollapsedRef = useRef(isFilmstripCollapsed);

  // ─── Caché en memoria de assets (Foto, Marco PNG y Logo) ─────────────────────
  // Carga UNA sola vez en memoria para que el drag a 60fps nunca espere red o I/O
  const imgCacheRef = useRef<HTMLImageElement | null>(null);
  const imgCacheUrlRef = useRef<string>('');
  const frameCacheRef = useRef<HTMLImageElement | null>(null);
  const frameCacheUrlRef = useRef<string>('');
  const logoCacheRef = useRef<HTMLImageElement | null>(null);
  const logoCacheUrlRef = useRef<string>('');

  // Sincronizar refs con state/props (sin re-render)
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

  // ─── DIBUJO DIRECTO SOBRE EL CANVAS EXISTENTE (Sin destrucción de DOM) ───────
  const drawToCanvas = useCallback(async (cropSettings: CropSettings, skipCpuFilters = false, compareOriginal = false) => {
    const canvas = canvasRef.current;
    if (!canvas || !photo) return;
    const img = imgCacheRef.current || photo.originalUrl;
    const activeAdjustments = compareOriginal ? NEUTRAL_ADJUSTMENTS : photo.adjustments;
    const activeWatermark = compareOriginal ? { ...watermark, enabled: false } : watermark;
    const activeFrame = compareOriginal ? { ...frame, style: 'none' as const } : frame;

    // Sincronizar estilos de tamaño del canvas
    const zl = zoomLevelRef.current;
    const maxHeightCalc = isFilmstripCollapsedRef.current ? 'calc(100vh - 170px)' : 'calc(100vh - 280px)';
    canvas.style.maxWidth = zl === 1 ? '100%' : 'none';
    canvas.style.maxHeight = zl === 1 ? maxHeightCalc : 'none';
    canvas.style.width = zl === 1 ? 'auto' : `${(canvas.width || 800) * zl}px`;
    canvas.style.borderRadius = '0.5rem';
    canvas.style.boxShadow = '0 25px 60px -15px rgba(0, 0, 0, 0.9)';

    await drawProcessedPhotoToCanvas(
      canvas,
      img,
      activeAdjustments,
      activeWatermark,
      activeFrame,
      cropSettings,
      800, // 800px resolución de visor: nítida y corre a < 1ms en GPU
      skipCpuFilters,
      frameCacheRef.current,
      logoCacheRef.current
    );
  }, [photo, watermark, frame]);

  // ─── Trigger HD inicial / al cambiar props: renderiza con filtros completos ──
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


  // Atajo de teclado (Presionar 'B' o 'Espacio' para comparar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'b') {
        setShowOriginal((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── INICIO DE ARRASTRE (Mouse) ───────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
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

  // ─── MOVIMIENTO (Mouse) — usa FAST PREVIEW (~60fps, GPU) ─────────────────────
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

  // ─── SOLTAR (Mouse) — consolida HD completo al soltar ────────────────────────
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
  // Usamos addEventListener con { passive: false } en canvasWrapperRef para
  // evitar que el navegador móvil intercepte o cancele el scroll de la página.
  useEffect(() => {
    const el = canvasWrapperRef.current;
    if (!el) return;

    interface TouchState {
      mode: 'none' | 'pan' | 'pinch';
      // 1 dedo (Pan)
      startX: number;
      startY: number;
      initialOffsetX: number;
      initialOffsetY: number;
      // 2 dedos (Pinch)
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
      // Ignorar si el toque fue en un botón de interfaz (navegación < >, descargar, etc.)
      if ((e.target as HTMLElement)?.closest('.canvas-nav-btn, button, .preview-toolbar')) {
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

        // Zoom suave acotado entre 1.0x y 3.0x
        const newZoom = Math.max(1.0, Math.min(3.0, Number((touchState.initialZoom * scale).toFixed(2))));

        // Pan simultáneo con 2 dedos
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

      // Si aún queda 1 dedo en pantalla al soltar el pinch, transicionar suavemente a pan
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

      // Si se levantaron todos los dedos, consolidar HD
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

    // Registrar eventos nativos con passive: false (esencial para que Chrome/Safari no los cancelen)
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
    const newZoom = Math.max(1.0, Math.min(2.0, Number((currentZoom + zoomDelta).toFixed(2))));

    onUpdateCrop({
      ...photo.crop,
      zoom: newZoom,
    });
  };


  return (
    <div className="preview-stage" ref={containerRef}>
      {/* Top Bar with File Details and Controls */}
      <div className="preview-toolbar card-glass">
        <div className="photo-info">
          <ImageIcon size={16} style={{ color: 'var(--color-brand-light)' }} />
          <span className="photo-name">{photo.name}</span>
          {photo.isRaw && <span className="badge-raw">RAW 14-BIT</span>}
          <span className="photo-dimensions">{photo.width} × {photo.height}</span>
          <span className="engine-status-tag">
            <Activity size={11} />
            HDR Activo
          </span>
        </div>

        <div className="preview-tools">
          {/* Botón Comparar Antes / Después */}
          <button
            onClick={() => setShowOriginal((prev) => !prev)}
            className={`btn-secondary btn-sm compare-btn ${showOriginal ? 'active' : ''}`}
            title="Comparar con la foto original sin ajustes ni marcos (Atajo: tecla B)"
          >
            {showOriginal ? <EyeOff size={14} /> : <Eye size={14} />}
            <span className="btn-label-desktop">{showOriginal ? 'Viendo Original' : 'Comparar (B)'}</span>
          </button>

          {/* Selector de Zoom */}
          <button
            onClick={() => setZoomLevel((z) => (z === 1 ? 1.5 : z === 1.5 ? 2 : 1))}
            className="btn-secondary btn-sm zoom-btn"
            title="Ajustar nivel de zoom"
          >
            {zoomLevel > 1 ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
            <span>{Math.round(zoomLevel * 100)}%</span>
          </button>

          {/* Exportar Foto Individual */}
          <button
            onClick={onSingleExport}
            className="btn-primary btn-sm export-single-btn"
            title="Descargar esta foto procesada en máxima resolución"
          >
            <Download size={14} />
            <span className="btn-label-desktop">Descargar</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Display Stage */}
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
        {isRendering && !isDragging && (
          <div className="rendering-overlay">
            <RefreshCw size={22} className="spin-icon" style={{ color: 'var(--color-brand)' }} />
            <span>Renderizando Rango Dinámico...</span>
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
              maxHeight: isFilmstripCollapsed ? 'calc(100vh - 170px)' : 'calc(100vh - 280px)',
              width: zoomLevel === 1 ? 'auto' : `${(canvasRef.current?.width || 800) * zoomLevel}px`,
              borderRadius: '0.5rem',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9)',
            }}
          />
        </div>

        {/* Hint Flotante Elegante de Arrastre */}
        {showHint && !isDragging && (
          <div className="floating-canvas-hint" onClick={() => setShowHint(false)}>
            <Move size={13} style={{ color: 'var(--color-brand-light)' }} />
            <span className="hint-desktop">Arrastra la imagen para re-encuadrar · Rueda para zoom</span>
            <span className="hint-mobile">Arrastra para mover · Pellizca para zoom</span>
          </div>
        )}
      </div>
    </div>
  );
};
