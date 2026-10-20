import React, { useRef } from 'react';
import { ImagePlus, Sparkles, Frame, Sliders, ShieldCheck, FolderOpen } from 'lucide-react';

interface BatchDropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
}

export const BatchDropzone: React.FC<BatchDropzoneProps> = ({
  onFilesSelected,
}) => {
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
    <div
      className="home-launchpad"
      onDragOver={handleDragOver}
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

      <div className="launchpad-card card-glass">
        <div className="launchpad-hero">
          <div className="launchpad-icon-ring">
            <img
              src="/logo-bereasnap-icon.jpg"
              alt="BereaSnap"
              className="launchpad-app-icon"
            />
          </div>

          <div className="dropzone-badge-tag" style={{ marginBottom: '0.65rem' }}>
            <ShieldCheck size={13} style={{ color: 'var(--color-brand-light)' }} />
            <span>Estudio 100% Offline • Privacidad Total</span>
          </div>

          <h2 className="launchpad-title">
            Berea<span className="brand-highlight">Snap</span>
          </h2>
          <p className="launchpad-subtitle">
            Revelado digital en lote, firma institucional y marcos dinámicos listos en tu dispositivo.
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

        {/* Píldoras de Capacidades Nativas */}
        <div className="launchpad-capabilities">
          <div className="capability-item">
            <Sliders size={15} style={{ color: '#38bdf8' }} />
            <div>
              <strong>Revelado & Presets</strong>
              <span>Luz, nitidez y color</span>
            </div>
          </div>

          <div className="capability-item">
            <Frame size={15} style={{ color: '#fbbf24' }} />
            <div>
              <strong>Marcos Dinámicos</strong>
              <span>Centenario personalizable</span>
            </div>
          </div>

          <div className="capability-item">
            <Sparkles size={15} style={{ color: '#34d399' }} />
            <div>
              <strong>Lotes & WhatsApp</strong>
              <span>Exportación directa o ZIP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
