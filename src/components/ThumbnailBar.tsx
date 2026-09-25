import React from 'react';
import { Trash2, Plus, Check } from 'lucide-react';
import type { PhotoItem } from '../types/editor';

interface ThumbnailBarProps {
  photos: PhotoItem[];
  activePhotoId: string;
  onSelectPhoto: (id: string) => void;
  onDeletePhoto: (id: string, e: React.MouseEvent) => void;
  onAddMorePhotos: () => void;
  onClearAll: () => void;
}

export const ThumbnailBar: React.FC<ThumbnailBarProps> = ({
  photos,
  activePhotoId,
  onSelectPhoto,
  onDeletePhoto,
  onAddMorePhotos,
  onClearAll,
}) => {
  return (
    <div className="thumbnail-bar card-glass">
      <div className="thumbnail-bar-header">
        <div className="batch-status-group">
          <span className="batch-counter">
            Sesión de Edición · {photos.length} {photos.length === 1 ? 'fotografía' : 'fotografías'}
          </span>
          <span className="batch-ready-indicator">
            <span className="dot-pulse" />
            Listo para procesamiento
          </span>
        </div>

        <div className="thumbnail-bar-actions">
          <button onClick={onAddMorePhotos} className="btn-secondary btn-sm" title="Añadir más fotos">
            <Plus size={14} />
            <span>Añadir</span>
          </button>

          <button
            onClick={onClearAll}
            className="btn-secondary btn-sm text-danger"
            title="Cerrar sesión actual y limpiar lote"
          >
            <Trash2 size={14} />
            <span>Limpiar todo</span>
          </button>
        </div>
      </div>

      <div className="thumbnail-scroll-container">
        {photos.map((photo, index) => {
          const isActive = photo.id === activePhotoId;
          return (
            <div
              key={photo.id}
              onClick={() => onSelectPhoto(photo.id)}
              className={`thumbnail-card ${isActive ? 'active' : ''}`}
            >
              <img src={photo.thumbnailUrl} alt={photo.name} className="thumbnail-img" />

              <div className="thumbnail-overlay">
                <span className="thumbnail-index">#{index + 1}</span>
                {photo.isRaw && <span className="badge-raw">RAW</span>}
              </div>

              {isActive && (
                <div className="active-check">
                  <Check size={12} />
                </div>
              )}

              <button
                onClick={(e) => onDeletePhoto(photo.id, e)}
                className="delete-photo-btn"
                title="Eliminar de la sesión"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
