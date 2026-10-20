import React, { useEffect, useRef } from 'react';
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
  onAddMorePhotos,
  onClearAll,
  onExportBatch,
  isGridOpen = false,
  onToggleGrid,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  // Auto-centrar la miniatura activa suavemente en el carrete al cambiar de foto
  useEffect(() => {
    if (activeThumbRef.current) {
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
  }, [activePhotoId, photos.length]);

  const activePhoto = photos.find((p) => p.id === activePhotoId) || photos[0];

  return (
    <>
      {/* CARRETE PERSISTENTE INTEGRADO (SIEMPRE ACCESIBLE ENTRE EL LIENZO Y LAS HERRAMIENTAS) */}
      <div className="filmstrip-dock">
        {/* Tira horizontal deslizable de miniaturas */}
        <div className="filmstrip-scroller" ref={scrollContainerRef}>
          {photos.map((photo, index) => {
            const isActive = photo.id === activePhoto?.id;
            return (
              <button
                key={photo.id}
                ref={isActive ? activeThumbRef : null}
                type="button"
                onClick={() => onSelectPhoto(photo.id)}
                className={`filmstrip-thumb ${isActive ? 'active' : ''}`}
                title={`Foto #${index + 1}: ${photo.name}`}
              >
                <img src={photo.thumbnailUrl} alt={photo.name} className="filmstrip-thumb-img" />
                <span className="filmstrip-thumb-index">{index + 1}</span>
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
                <h3>Carrete de Sesión ({photos.length})</h3>
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
                return (
                  <div
                    key={photo.id}
                    onClick={() => {
                      onSelectPhoto(photo.id);
                      onToggleGrid(false);
                    }}
                    className={`batch-grid-card ${isSelected ? 'active' : ''}`}
                  >
                    <div className="batch-grid-img-wrap">
                      <img src={photo.thumbnailUrl} alt={photo.name} />
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
                        onClick={() => {
                          onReplacePhoto(photo.id);
                        }}
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
