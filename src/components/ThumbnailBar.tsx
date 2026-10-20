import React, { useEffect, useRef, useState } from 'react';
import {
  Trash2,
  Plus,
  RefreshCw,
  LayoutGrid,
  X,
  FolderArchive,
  Check,
} from 'lucide-react';
import type { PhotoItem } from '../types/editor';

interface ThumbnailBarProps {
  photos: PhotoItem[];
  activePhotoId: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSelectPhoto: (id: string) => void;
  onDeletePhoto: (id: string, e?: React.MouseEvent) => void;
  onReplacePhoto: (id: string) => void;
  onMovePhoto?: (fromIndex: number, toIndex: number) => void;
  onAddMorePhotos: () => void;
  onClearAll: () => void;
  onExportBatch?: () => void;
  isGridOpen?: boolean;
  onToggleGrid?: (open?: boolean) => void;
}

export const ThumbnailBar: React.FC<ThumbnailBarProps> = ({
  photos,
  activePhotoId,
  onSelectPhoto,
  onDeletePhoto,
  onReplacePhoto,
  onMovePhoto,
  onAddMorePhotos,
  onClearAll,
  onExportBatch,
  isGridOpen = false,
  onToggleGrid,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  // Estados de Arrastre Táctil en Carrete
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Estados de Arrastre en Cuadrícula
  const [gridDragIndex, setGridDragIndex] = useState<number | null>(null);
  const [gridDropIndex, setGridDropIndex] = useState<number | null>(null);

  const pointerDownRef = useRef<{
    startX: number;
    startY: number;
    index: number;
    timer: number | null;
    pointerId: number;
    hasMoved: boolean;
  } | null>(null);

  // Auto-centrar la miniatura activa suavemente en el carrete al cambiar de foto (solo cuando no se está arrastrando)
  useEffect(() => {
    if (activeThumbRef.current && !isDragging) {
      try {
        activeThumbRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      } catch {
        // Fallback silencioso
      }
    }
  }, [activePhotoId, photos.length, isDragging]);

  const currentIndex = photos.findIndex((p) => p.id === activePhotoId);
  const activePhoto = photos[currentIndex >= 0 ? currentIndex : 0];

  // =========================================================================
  // GESTIÓN DE ARRASTRE TÁCTIL EN EL CARRETE (HORIZONTAL DRAG-TO-REORDER)
  // =========================================================================

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>, index: number) => {
    // Solo botón principal del mouse o cualquier toque de pantalla
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const timer = window.setTimeout(() => {
      // Activar modo arrastre tras 140ms de toque sostenido
      setIsDragging(true);
      setDragIndex(index);
      setDropIndex(index);

      // Feedback háptico nativo en Android
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(35);
      }
    }, 140);

    pointerDownRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      index,
      timer,
      pointerId: e.pointerId,
      hasMoved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const downInfo = pointerDownRef.current;
    if (!downInfo) return;

    const dx = Math.abs(e.clientX - downInfo.startX);
    const dy = Math.abs(e.clientY - downInfo.startY);

    // Si el usuario desliza antes de los 140ms, cancelar el modo arrastre para permitir el scroll natural del carrete
    if (!isDragging) {
      if (dx > 8 || dy > 8) {
        if (downInfo.timer) {
          clearTimeout(downInfo.timer);
          downInfo.timer = null;
        }
        downInfo.hasMoved = true;
      }
      return;
    }

    // Si YA está en modo arrastre:
    e.preventDefault();

    if (!scrollContainerRef.current) return;

    // Auto-scroll horizontal si el dedo se acerca a los bordes de la pantalla
    const scrollerRect = scrollContainerRef.current.getBoundingClientRect();
    if (e.clientX < scrollerRect.left + 50) {
      scrollContainerRef.current.scrollLeft -= 10;
    } else if (e.clientX > scrollerRect.right - 50) {
      scrollContainerRef.current.scrollLeft += 10;
    }

    // Calcular sobre qué miniatura está pasando el dedo
    const thumbs = Array.from(
      scrollContainerRef.current.querySelectorAll('.filmstrip-thumb')
    ) as HTMLElement[];

    let closestIndex = downInfo.index;
    let minDistance = Infinity;

    thumbs.forEach((thumb, i) => {
      const rect = thumb.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const dist = Math.abs(e.clientX - centerX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    });

    if (closestIndex !== dropIndex) {
      setDropIndex(closestIndex);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    }
  };

  const handlePointerUp = (_e: React.PointerEvent<HTMLElement>, index: number) => {
    const downInfo = pointerDownRef.current;
    if (downInfo?.timer) {
      clearTimeout(downInfo.timer);
      downInfo.timer = null;
    }

    if (isDragging) {
      if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex && onMovePhoto) {
        onMovePhoto(dragIndex, dropIndex);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([25, 30]);
        }
      }
      setIsDragging(false);
      setDragIndex(null);
      setDropIndex(null);
    } else if (!downInfo?.hasMoved) {
      // Fue un toque limpio normal: Seleccionar fotografía
      onSelectPhoto(photos[index].id);
    }

    pointerDownRef.current = null;
  };

  const handlePointerCancel = () => {
    if (pointerDownRef.current?.timer) {
      clearTimeout(pointerDownRef.current.timer);
    }
    setIsDragging(false);
    setDragIndex(null);
    setDropIndex(null);
    pointerDownRef.current = null;
  };

  // =========================================================================
  // GESTIÓN DE ARRASTRE EN LA CUADRÍCULA (BATCH GRID SHEET)
  // =========================================================================

  const handleGridDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    setGridDragIndex(index);
  };

  const handleGridDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (gridDropIndex !== index) {
      setGridDropIndex(index);
    }
  };

  const handleGridDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex && onMovePhoto) {
      onMovePhoto(sourceIndex, targetIndex);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([25, 30]);
      }
    }
    setGridDragIndex(null);
    setGridDropIndex(null);
  };

  return (
    <>
      {/* CARRETE PERSISTENTE INTEGRADO (SIEMPRE ACCESIBLE ENTRE EL LIENZO Y LAS HERRAMIENTAS) */}
      <div className="filmstrip-dock">
        {/* Tira horizontal deslizable de miniaturas con soporte de arrastre directo */}
        <div
          className="filmstrip-scroller"
          ref={scrollContainerRef}
          onPointerMove={handlePointerMove}
          onPointerCancel={handlePointerCancel}
        >
          {photos.map((photo, index) => {
            const isActive = photo.id === activePhoto?.id;
            const isBeingDragged = isDragging && dragIndex === index;
            const isDropTarget = isDragging && dropIndex === index && dragIndex !== index;

            return (
              <button
                key={photo.id}
                ref={isActive ? activeThumbRef : null}
                type="button"
                onPointerDown={(e) => handlePointerDown(e, index)}
                onPointerUp={(e) => handlePointerUp(e, index)}
                className={`filmstrip-thumb ${isActive ? 'active' : ''} ${
                  isBeingDragged ? 'is-dragging' : ''
                } ${isDropTarget ? 'drop-target' : ''}`}
                title={`Foto #${index + 1}: ${photo.name} (Mantén presionado para arrastrar y cambiar de orden)`}
                style={{
                  touchAction: isDragging ? 'none' : 'pan-x',
                  userSelect: 'none',
                }}
              >
                <img
                  src={photo.thumbnailUrl}
                  alt={photo.name}
                  className="filmstrip-thumb-img"
                  draggable={false}
                />
                <span className="filmstrip-thumb-index">
                  {isDragging && dragIndex === index ? `⇄ ${dropIndex !== null ? dropIndex + 1 : index + 1}` : index + 1}
                </span>
                {photo.isRaw && <span className="filmstrip-thumb-raw">R</span>}
              </button>
            );
          })}

          {/* Botón rápido '+' al final del carrete para importar más fotos */}
          <button
            type="button"
            onClick={onAddMorePhotos}
            className="filmstrip-add-tile"
            title="Añadir más fotografías a la sesión"
            aria-label="Añadir más fotografías"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Cápsula fija de acciones directas sobre la foto activa */}
        {activePhoto && (
          <div className="filmstrip-quick-actions">
            <button
              type="button"
              onClick={() => onReplacePhoto(activePhoto.id)}
              className="filmstrip-action-btn"
              title="Sustituir esta foto por otra conservando sus ajustes"
            >
              <RefreshCw size={13} />
              <span className="filmstrip-action-label">Sustituir</span>
            </button>

            <button
              type="button"
              onClick={(e) => onDeletePhoto(activePhoto.id, e)}
              className="filmstrip-action-btn danger"
              title="Eliminar esta foto de la sesión"
            >
              <Trash2 size={13} />
              <span className="filmstrip-action-label">Borrar</span>
            </button>

            {onToggleGrid && (
              <button
                type="button"
                onClick={() => onToggleGrid(true)}
                className="filmstrip-action-btn grid-trigger"
                title="Abrir vista de cuadrícula para gestionar todo el lote"
              >
                <LayoutGrid size={13} />
                <span className="filmstrip-action-label">Lote</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODAL / SHEET DE CUADRÍCULA PARA GESTIONAR EL LOTE COMPLETO */}
      {isGridOpen && onToggleGrid && (
        <div
          className="batch-grid-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) onToggleGrid(false);
          }}
        >
          <div className="batch-grid-sheet card-glass">
            <div className="batch-grid-header">
              <div className="batch-grid-title-group">
                <LayoutGrid size={16} style={{ color: 'var(--color-accent)' }} />
                <div>
                  <h3 style={{ margin: 0 }}>Carrete de Sesión ({photos.length})</h3>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    Toca y arrastra cualquier foto a la posición deseada
                  </span>
                </div>
              </div>

              <div className="batch-grid-header-actions">
                <button
                  type="button"
                  onClick={onAddMorePhotos}
                  className="btn-secondary btn-sm"
                >
                  <Plus size={13} />
                  <span>Añadir</span>
                </button>

                {onExportBatch && photos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleGrid(false);
                      onExportBatch();
                    }}
                    className="btn-primary btn-sm"
                  >
                    <FolderArchive size={13} />
                    <span>Exportar ({photos.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onToggleGrid(false);
                    onClearAll();
                  }}
                  className="btn-secondary btn-sm text-danger"
                  title="Vaciar todas las fotos de la sesión"
                >
                  <Trash2 size={13} />
                  <span>Vaciar</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleGrid(false)}
                  className="batch-grid-close-btn"
                  aria-label="Cerrar cuadrícula"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="batch-grid-body">
              {photos.map((photo, index) => {
                const isSelected = photo.id === activePhoto?.id;
                const isCardDragging = gridDragIndex === index;
                const isCardDropTarget = gridDropIndex === index && gridDragIndex !== index;

                return (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={(e) => handleGridDragStart(e, index)}
                    onDragOver={(e) => handleGridDragOver(e, index)}
                    onDrop={(e) => handleGridDrop(e, index)}
                    onDragEnd={() => {
                      setGridDragIndex(null);
                      setGridDropIndex(null);
                    }}
                    onClick={() => {
                      onSelectPhoto(photo.id);
                      onToggleGrid(false);
                    }}
                    className={`batch-grid-card ${isSelected ? 'active' : ''} ${
                      isCardDragging ? 'is-dragging' : ''
                    } ${isCardDropTarget ? 'drop-target' : ''}`}
                    style={{
                      cursor: 'grab',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                  >
                    <div className="batch-grid-img-wrap">
                      <img src={photo.thumbnailUrl} alt={photo.name} draggable={false} />
                      <span className="batch-grid-badge">#{index + 1}</span>
                      {photo.isRaw && <span className="batch-grid-raw">RAW</span>}
                      {isSelected && (
                        <span className="batch-grid-active-pill">
                          <Check size={11} /> Editando
                        </span>
                      )}
                    </div>

                    <div className="batch-grid-card-footer" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onReplacePhoto(photo.id)}
                        className="batch-card-btn"
                        title="Sustituir esta fotografía"
                      >
                        <RefreshCw size={12} />
                        <span>Sustituir</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => onDeletePhoto(photo.id, e)}
                        className="batch-card-btn danger"
                        title="Eliminar esta fotografía"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
