import React from 'react';
import { Trash2, Plus, Check, ChevronUp, ChevronDown, Download } from 'lucide-react';
import type { PhotoItem } from '../types/editor';

interface ThumbnailBarProps {
  photos: PhotoItem[];
  activePhotoId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectPhoto: (id: string) => void;
  onDeletePhoto: (id: string, e: React.MouseEvent) => void;
  onAddMorePhotos: () => void;
  onClearAll: () => void;
  onExportBatch?: () => void;
}

export const ThumbnailBar: React.FC<ThumbnailBarProps> = ({
  photos,
  activePhotoId,
  isCollapsed,
  onToggleCollapse,
  onSelectPhoto,
  onDeletePhoto,
  onAddMorePhotos,
  onClearAll,
  onExportBatch,
}) => {
  return (
    <div className={`thumbnail-bar card-glass ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="thumbnail-bar-header">
        <div className="batch-status-group">
          <button
            onClick={onToggleCollapse}
            className="thumbnail-collapse-btn"
            title={isCollapsed ? 'Expandir tira de fotos' : 'Minimizar tira para ganar espacio de trabajo'}
          >
            {isCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            <span className="btn-label-desktop">{isCollapsed ? 'Mostrar Tira' : 'Ocultar'}</span>
          </button>

          <span className="batch-counter">
            Sesión ({photos.length})
          </span>
          <span className="batch-ready-indicator">
            <span className="dot-pulse" />
            Listo
          </span>
        </div>

        <div className="thumbnail-bar-actions">
          {onExportBatch && photos.length > 0 && (
            <button
              onClick={onExportBatch}
              className="btn-primary btn-sm batch-export-bar-btn"
              title="Descargar lote completo en archivo ZIP"
            >
              <Download size={13} />
              <span>Exportar ZIP ({photos.length})</span>
            </button>
          )}

          <button onClick={onAddMorePhotos} className="btn-secondary btn-sm" title="Añadir más fotos">
            <Plus size={14} />
            <span className="btn-label-desktop">Añadir</span>
          </button>

          <button
            onClick={onClearAll}
            className="btn-secondary btn-sm text-danger"
            title="Cerrar sesión actual y limpiar lote"
          >
            <Trash2 size={13} />
            <span className="btn-label-desktop">Limpiar</span>
          </button>
        </div>
      </div>

      {!isCollapsed && (
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
      )}
    </div>
  );
};
