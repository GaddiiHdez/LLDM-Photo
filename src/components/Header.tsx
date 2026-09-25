import React from 'react';
import { Camera, Download, Plus, Wand2, Sliders } from 'lucide-react';

interface HeaderProps {
  totalPhotos: number;
  onAddPhotosClick: () => void;
  onExportBatch: () => void;
  onApplyPresetAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalPhotos,
  onAddPhotosClick,
  onExportBatch,
  onApplyPresetAll,
}) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo">
          <Camera size={20} />
        </div>
        <div className="brand-titles">
          <h1 className="brand-title">
            LLDM <span className="brand-highlight">Photo Studio</span>
            <span className="badge-pro">PRO</span>
          </h1>
          <p className="brand-subtitle">
            <Sliders size={12} style={{ color: 'var(--color-brand-light)' }} />
            <span>Motor RAW 14-Bit & Edición en Lote</span>
          </p>
        </div>
      </div>

      <div className="header-actions">
        {totalPhotos > 0 && (
          <>
            <button
              onClick={onApplyPresetAll}
              className="btn-secondary header-btn"
              title="Aplicar la optimización adaptativa actual a todas las fotografías de la sesión"
            >
              <Wand2 size={15} style={{ color: '#fbbf24' }} />
              <span className="btn-label-desktop">Auto-Mejorar Sesión ({totalPhotos})</span>
              <span className="btn-label-mobile">Auto ({totalPhotos})</span>
            </button>

            <button
              onClick={onAddPhotosClick}
              className="btn-secondary header-btn"
              title="Añadir más fotos a la sesión actual"
            >
              <Plus size={15} />
              <span className="btn-label-desktop">Añadir Fotos</span>
              <span className="btn-label-mobile">Añadir</span>
            </button>

            <button
              onClick={onExportBatch}
              className="btn-primary header-btn"
              title="Exportar todas las fotos procesadas en archivo ZIP de alta resolución"
            >
              <Download size={15} />
              <span className="btn-label-desktop">Exportar ZIP ({totalPhotos})</span>
              <span className="btn-label-mobile">Exportar ({totalPhotos})</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
