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
        <span className="batch-counter">
          Lote Actual ({photos.length} {photos.length === 1 ? 'Foto' : 'Fotos'})
        </span>

        <div className="thumbnail-bar-actions">
          <button onClick={onAddMorePhotos} className="btn-secondary btn-sm">
            <Plus size={14} />
            <span>Añadir</span>
          </button>

          <button onClick={onClearAll} className="btn-secondary btn-sm text-danger">
            <Trash2 size={14} />
            <span>Vaciar</span>
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
                title="Eliminar esta foto del lote"
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
