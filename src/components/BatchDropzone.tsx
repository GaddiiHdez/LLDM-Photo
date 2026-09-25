import React, { useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, Frame, PlayCircle, Sliders, ShieldCheck } from 'lucide-react';

interface BatchDropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  onLoadSamples: () => void;
}

export const BatchDropzone: React.FC<BatchDropzoneProps> = ({
  onFilesSelected,
  onLoadSamples,
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
      className="dropzone-container card-glass"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.cr2,.nef,.arw,.dng,.raf"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      <div className="dropzone-icon">
        <UploadCloud size={48} />
      </div>

      <div className="dropzone-badge-tag">
        <ShieldCheck size={13} style={{ color: 'var(--color-brand-light)' }} />
        <span>Procesamiento 100% Local y Privado en tu Navegador</span>
      </div>

      <h2 className="dropzone-title">Arrastra tu lote de fotos aquí</h2>
      <p className="dropzone-subtitle">
        Soporte nativo para cámaras <strong>Nikon</strong> (<code>.NEF</code>), <strong>Canon</strong> (<code>.CR2</code>), <strong>Sony</strong> (<code>.ARW</code>), <strong>Adobe</strong> (<code>.DNG</code>) y archivos <code>.JPG</code> / <code>.PNG</code>
      </p>

      {/* Atajos de Funciones Principales de la App */}
      <div className="dropzone-features">
        <div
          className="feature-chip"
          title="Optimización adaptativa del rango dinámico para iluminaciones complejas de iglesia y templos"
        >
          <Sliders size={14} style={{ color: 'var(--color-brand-light)' }} />
          <span>Revelado RAW 14-Bit</span>
        </div>

        <div
          className="feature-chip"
          title="Superposición fija de logotipo o firma institucional en alta resolución"
        >
          <ImageIcon size={14} style={{ color: '#38bdf8' }} />
          <span>Firma & Marca de Agua</span>
        </div>

        <div
          className="feature-chip"
          title="Marcos oficiales PNG y plantillas prediseñadas para eventos y servicios"
        >
          <Frame size={14} style={{ color: '#34d399' }} />
          <span>Marcos Institucionales</span>
        </div>

        <div
          className="feature-chip"
          title="Ajuste automático inteligente de color, balance y nitidez con 1 solo clic"
        >
          <Sparkles size={14} style={{ color: '#fbbf24' }} />
          <span>Presets Automáticos</span>
        </div>
      </div>

      <div className="dropzone-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="btn-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud size={18} />
          <span>Seleccionar Fotografías</span>
        </button>

        <button className="btn-secondary" onClick={onLoadSamples}>
          <PlayCircle size={18} style={{ color: 'var(--color-brand-light)' }} />
          <span>Ver Demostración con Muestras</span>
        </button>
      </div>
    </div>
  );
};
