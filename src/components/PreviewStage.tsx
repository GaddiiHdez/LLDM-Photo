import React, { useEffect, useRef, useState } from 'react';
import { Download, ZoomIn, ZoomOut, RefreshCw, Sparkles, Image as ImageIcon, Activity, Move } from 'lucide-react';
import { renderProcessedPhoto } from '../utils/canvasEngine';
import type { PhotoItem, WatermarkSettings, FrameSettings, CropSettings } from '../types/editor';

interface PreviewStageProps {
  photo: PhotoItem;
  watermark: WatermarkSettings;
  frame: FrameSettings;
  onSingleExport: () => void;
  onApplyPreset: () => void;
  onUpdateCrop: (crop: CropSettings) => void;
}

export const PreviewStage: React.FC<PreviewStageProps> = ({
  photo,
  watermark,
  frame,
  onSingleExport,
  onApplyPreset,
  onUpdateCrop,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Dragging State
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialOffsetX: number; initialOffsetY: number } | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const currentTempCropRef = useRef<CropSettings | null>(null);

  // Función principal para renderizar el Canvas HD unificado
  const renderCanvasWithCrop = async (cropSettings: CropSettings) => {
    if (!photo) return;
    try {
      const canvas = await renderProcessedPhoto(
        photo.originalUrl,
        photo.adjustments,
        watermark,
        frame,
        cropSettings,
        1200
      );

      if (canvasContainerRef.current) {
        canvasContainerRef.current.innerHTML = '';
        canvas.style.maxWidth = zoomLevel === 1 ? '100%' : 'none';
        canvas.style.maxHeight = zoomLevel === 1 ? 'calc(100vh - 280px)' : 'none';
        canvas.style.width = zoomLevel === 1 ? 'auto' : `${canvas.width * zoomLevel}px`;
        canvasContainerRef.current.appendChild(canvas);
      }
    } catch (err) {
      console.error('Error renderizando vista previa:', err);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const render = async () => {
      if (!photo || isDragging) return;
      setIsRendering(true);
      try {
        await renderCanvasWithCrop(photo.crop);
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [photo, photo.adjustments, photo.crop, watermark, frame, zoomLevel]);

  // INICIO DE ARRASTRE DIRECTO EN LA FOTO DE FONDO
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialOffsetX: photo.crop?.offsetX || 0,
      initialOffsetY: photo.crop?.offsetY || 0,
    };
  };

  // MOVIMIENTO EN TIEMPO REAL CON REQUESTANIMATIONFRAME (60 FPS, Marco Fijo, Foto Fondo Se Mueve)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Sensibilidad y Dirección Natural:
    // Arrastrar a la derecha (+) mueve la ventana de origen a la izquierda (-), mostrando el lado derecho de la foto
    const sensitivity = 0.25;
    const newOffsetX = Math.max(-50, Math.min(50, dragStartRef.current.initialOffsetX - dx * sensitivity));
    const newOffsetY = Math.max(-50, Math.min(50, dragStartRef.current.initialOffsetY - dy * sensitivity));

    const tempCrop: CropSettings = {
      ...photo.crop,
      offsetX: Math.round(newOffsetX),
      offsetY: Math.round(newOffsetY),
    };
    currentTempCropRef.current = tempCrop;

    // Renderizar suavemente sin re-renderizar todo el estado de React en cada píxel
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    animFrameIdRef.current = requestAnimationFrame(() => {
      if (currentTempCropRef.current) {
        renderCanvasWithCrop(currentTempCropRef.current);
      }
    });
  };

  // SOLTAR MOUSE: CONFIRMAR NAVEGACIÓN Y GUARDAR EN ESTADO
  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartRef.current = null;

    if (currentTempCropRef.current) {
      onUpdateCrop(currentTempCropRef.current);
      currentTempCropRef.current = null;
    }
  };

  // Acercar / Alejar con la Rueda del Ratón (Mouse Wheel Zoom)
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
      {/* Top Bar with File Details and Zoom Controls */}
      <div className="preview-toolbar card-glass">
        <div className="photo-info">
          <ImageIcon size={18} style={{ color: 'var(--color-brand-light)' }} />
          <span className="photo-name">{photo.name}</span>
          {photo.isRaw && <span className="badge-raw">RAW 14-BIT</span>}
          <span className="photo-dimensions">{photo.width} × {photo.height} px</span>
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--color-accent)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: 'rgba(245, 158, 11, 0.12)',
              padding: '0.2rem 0.5rem',
              borderRadius: '0.3rem',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <Activity size={12} />
            HDR Engine Active
          </span>
        </div>

        <div className="preview-tools">
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              marginRight: '0.5rem',
            }}
          >
            <Move size={14} style={{ color: 'var(--color-brand-light)' }} />
            Arrastra con el Mouse la Foto de Fondo
          </span>

          <button
            onClick={() => setZoomLevel((z) => (z === 1 ? 1.5 : z === 1.5 ? 2 : 1))}
            className="btn-secondary btn-sm"
            title="Cambiar Zoom"
          >
            {zoomLevel > 1 ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
            <span>{Math.round(zoomLevel * 100)}%</span>
          </button>

          <button onClick={onApplyPreset} className="btn-secondary btn-sm">
            <Sparkles size={14} style={{ color: '#f59e0b' }} />
            <span>Auto-Mejorar</span>
          </button>

          <button onClick={onSingleExport} className="btn-primary btn-sm">
            <Download size={14} />
            <span>Descargar Esta Foto</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Display Stage con Re-Encuadre Directo de Foto de Fondo y Marco Estático */}
      <div
        className="canvas-wrapper"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {isRendering && !isDragging && (
          <div className="rendering-overlay">
            <RefreshCw size={22} className="spin-icon" style={{ color: 'var(--color-brand)' }} />
            <span>Procesando Rango Dinámico...</span>
          </div>
        )}

        <div ref={canvasContainerRef} className="canvas-container" />
      </div>
    </div>
  );
};
