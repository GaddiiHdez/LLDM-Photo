import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PhotoItem } from '../../types/editor';

interface FilmstripTabProps {
  photo: PhotoItem;
  photos: PhotoItem[];
  isActiveTab: boolean;
  onSelectPhoto?: (id: string) => void;
  onDeletePhoto?: (id: string) => void;
  onReplacePhoto?: (id: string) => void;
  onMovePhoto?: (fromIndex: number, toIndex: number) => void;
  onAddMorePhotos?: () => void;
}

export const FilmstripTab: React.FC<FilmstripTabProps> = ({
  photo,
  photos,
  isActiveTab,
  onSelectPhoto,
  onDeletePhoto,
  onReplacePhoto,
  onMovePhoto,
  onAddMorePhotos,
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const filmstripScrollerRef = useRef<HTMLDivElement>(null);

  const pointerDownRef = useRef<{
    startX: number;
    startY: number;
    index: number;
    timer: number | null;
    pointerId: number;
    hasMoved: boolean;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>, index: number) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const timer = window.setTimeout(() => {
      setIsDragging(true);
      setDragIndex(index);
      setDropIndex(index);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 450);

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

    if (!isDragging) {
      if (dx > 6 || dy > 6) {
        if (downInfo.timer) {
          clearTimeout(downInfo.timer);
          downInfo.timer = null;
        }
        downInfo.hasMoved = true;
      }
      return;
    }

    e.preventDefault();
    if (!filmstripScrollerRef.current) return;

    const thumbs = Array.from(
      filmstripScrollerRef.current.querySelectorAll('.oneui-filmstrip-thumb')
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
    } else if (!downInfo?.hasMoved && onSelectPhoto && photos?.[index]) {
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

  useEffect(() => {
    if (photo && filmstripScrollerRef.current && isActiveTab) {
      const activeEl = filmstripScrollerRef.current.querySelector(
        '.oneui-filmstrip-thumb.active'
      ) as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [photo, photo?.id, isActiveTab]);

  const activeIndex = (photos || []).findIndex((p) => p.id === photo?.id);
  const canMoveLeft = onMovePhoto && activeIndex > 0;
  const canMoveRight = onMovePhoto && activeIndex >= 0 && activeIndex < (photos?.length || 0) - 1;

  return (
    <div className="oneui-deck-inner">
      <div className="oneui-deck-title-row">
        <span className="oneui-param-title">CARRETE ({photos?.length || 0})</span>
        <div className="oneui-deck-actions-right">
          {onMovePhoto && (photos?.length || 0) > 1 && (
            <>
              <button
                type="button"
                disabled={!canMoveLeft}
                onClick={() => canMoveLeft && onMovePhoto(activeIndex, activeIndex - 1)}
                className="oneui-reset-tiny-btn"
                style={{ opacity: canMoveLeft ? 1 : 0.4 }}
                title="Mover foto activa hacia la izquierda"
                aria-label="Mover foto hacia la izquierda"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                disabled={!canMoveRight}
                onClick={() => canMoveRight && onMovePhoto(activeIndex, activeIndex + 1)}
                className="oneui-reset-tiny-btn"
                style={{ opacity: canMoveRight ? 1 : 0.4 }}
                title="Mover foto activa hacia la derecha"
                aria-label="Mover foto hacia la derecha"
              >
                <ChevronRight size={13} />
              </button>
            </>
          )}
          {onAddMorePhotos && (
            <button
              type="button"
              onClick={onAddMorePhotos}
              className="oneui-sync-pill-btn"
              title="Añadir más fotos a la sesión"
            >
              <Plus size={11} />
              <span>Añadir</span>
            </button>
          )}
          {onReplacePhoto && photo && (
            <button
              type="button"
              onClick={() => onReplacePhoto(photo.id)}
              className="oneui-sync-pill-btn"
              title="Sustituir foto activa por otra conservando posición y ajustes"
            >
              <RefreshCw size={11} />
              <span>Sustituir</span>
            </button>
          )}
          {onDeletePhoto && photo && (
            <button
              type="button"
              onClick={() => onDeletePhoto(photo.id)}
              className="oneui-reset-tiny-btn text-danger"
              title="Eliminar foto activa del carrete"
              aria-label="Eliminar foto activa"
            >
              <Trash2 size={11} />
              <span>Borrar</span>
            </button>
          )}
        </div>
      </div>

      <div
        className="oneui-filmstrip-strip"
        ref={filmstripScrollerRef}
        onPointerMove={handlePointerMove}
        onPointerCancel={handlePointerCancel}
      >
        {(photos || []).map((p, index) => {
          const isActive = p.id === photo?.id;
          const isBeingDragged = isDragging && dragIndex === index;
          const isDropTarget = isDragging && dropIndex === index && dragIndex !== index;

          return (
            <button
              key={p.id}
              type="button"
              onPointerDown={(e) => handlePointerDown(e, index)}
              onPointerUp={(e) => handlePointerUp(e, index)}
              className={`oneui-filmstrip-thumb ${isActive ? 'active' : ''} ${
                isBeingDragged ? 'is-dragging' : ''
              } ${isDropTarget ? 'drop-target' : ''}`}
              title={`#${index + 1}: ${p.name} (Mantén y arrastra para reordenar)`}
            >
              <img src={p.thumbnailUrl} alt={p.name} draggable={false} />
              <span className="oneui-thumb-num">
                {isDragging && dragIndex === index ? `⇄ ${dropIndex !== null ? dropIndex + 1 : index + 1}` : index + 1}
              </span>
              {p.isRaw && <span className="oneui-thumb-raw">RAW</span>}
            </button>
          );
        })}

        {onAddMorePhotos && (
          <button
            type="button"
            onClick={onAddMorePhotos}
            className="oneui-filmstrip-add-tile"
            title="Añadir más fotos"
            aria-label="Añadir fotos"
          >
            <Plus size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
