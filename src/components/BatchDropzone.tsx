import React, { useRef } from 'react';
import { ImagePlus, FolderOpen } from 'lucide-react';

interface BatchDropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
}

export const BatchDropzone: React.FC<BatchDropzoneProps> = ({ onFilesSelected }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    <div className="home-launchpad" onDragOver={handleDragOver} onDrop={handleDrop}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.cr2,.nef,.arw,.dng,.raf"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      <div className="launchpad-card card-glass">
        <div className="launchpad-hero">
          <div className="launchpad-icon-ring">
            <img src="/logo-bereasnap-icon.jpg" alt="BereaSnap" className="launchpad-app-icon" />
          </div>

          <h2 className="launchpad-title">
            Berea<span className="brand-highlight">Snap</span>
          </h2>
          <p className="launchpad-subtitle">
            Estudio de revelado digital y edición fotográfica por lotes
          </p>
        </div>

        {/* Botón Principal Táctil Nativo */}
        <button
          type="button"
          className="launchpad-primary-cta"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="cta-icon-circle">
            <ImagePlus size={24} />
          </div>
          <div className="cta-text-col">
            <span className="cta-main-label">Importar Fotografías</span>
            <span className="cta-sub-label">Galería, Memoria SD o Archivos RAW (.NEF, .CR2, .JPG)</span>
          </div>
          <FolderOpen size={18} style={{ opacity: 0.75, marginLeft: 'auto' }} />
        </button>

        <div className="launchpad-formats-hint">
          <span>Formatos admitidos: RAW (.NEF, .CR2, .ARW, .DNG) • JPG • PNG • Lotes masivos</span>
        </div>
      </div>
    </div>
  );
};
