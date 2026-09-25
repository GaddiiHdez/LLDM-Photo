import React from 'react';
import { Camera, Download, Plus, Sparkles, Sliders } from 'lucide-react';

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
          <Camera size={22} />
        </div>
        <div>
          <h1 className="brand-title">
            LLDM <span className="brand-highlight">Photo Studio</span>
            <span className="badge-pro">PRO v2.0</span>
          </h1>
          <p className="brand-subtitle">
            <Sliders size={13} style={{ color: 'var(--color-brand-light)' }} />
            <span>Motor de Procesamiento RAW 14-bits & Edición en Lote</span>
          </p>
        </div>
      </div>

      <div className="header-actions">
        {totalPhotos > 0 && (
          <>
            <button
              onClick={onApplyPresetAll}
              className="btn-secondary"
              title="Aplicar el preajuste automático a todas las fotos del lote"
            >
              <Sparkles size={16} style={{ color: '#f59e0b' }} />
              <span>⚡ Auto-Mejorar Todo ({totalPhotos})</span>
            </button>

            <button onClick={onAddPhotosClick} className="btn-secondary">
              <Plus size={16} />
              <span>📁 Añadir Fotos</span>
            </button>

            <button onClick={onExportBatch} className="btn-primary">
              <Download size={16} />
              <span>📥 Exportar Lote ZIP ({totalPhotos})</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
