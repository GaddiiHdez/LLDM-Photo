import React, { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { APP_VERSION } from '../version';

interface BatchDropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
}

export const BatchDropzone: React.FC<BatchDropzoneProps> = ({ onFilesSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <div
      className={`home-launchpad ${isDragOver ? 'drag-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.cr2,.nef,.arw,.dng,.raf"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      <div className="launchpad-card">
        {/* Emblema Central con aura dorada */}
        <div className="launchpad-hero">
          <div className="launchpad-icon-ring">
            <img src="/logo-bereasnap-icon.jpg" alt="BereaSnap" className="launchpad-app-icon" />
          </div>

          <h2 className="launchpad-title">
            Berea<span className="brand-highlight">Snap</span>
          </h2>
          <p className="launchpad-subtitle">
            Estudio de revelado digital y edición fotográfica
          </p>
        </div>

        {/* Botón Principal Táctil Estilo Samsung One UI */}
        <button
          type="button"
          className="oneui-launchpad-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus size={19} />
          <span>Cargar</span>
        </button>

        {/* Chips de Formatos Mínimos */}
        <div className="launchpad-chips-row">
          <span className="launchpad-format-chip">RAW</span>
          <span className="launchpad-format-chip">JPG</span>
          <span className="launchpad-format-chip">PNG</span>
        </div>

        {/* Indicador sutil de arrastre */}
        <span className="launchpad-drag-hint">o arrastra tus fotos aquí</span>
      </div>

      {/* Versión discreta en el fondo */}
      <footer className="launchpad-footer">
        <span>BereaSnap v{APP_VERSION} • 2026</span>
      </footer>
    </div>
  );
};
