import React, { useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, Frame } from 'lucide-react';

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
        <UploadCloud size={54} />
      </div>

      <h2 className="dropzone-title">Arrastra y suelta tu lote de fotos RAW o JPG aquí</h2>
      <p className="dropzone-subtitle">
        Soporta fotos Nikon (<code>.NEF</code>), Canon (<code>.CR2</code>), Sony (<code>.ARW</code>), Adobe (<code>.DNG</code>) y <code>.JPG</code> / <code>.PNG</code>
      </p>

      {/* Atajos de Funciones Principales de la App */}
      <div className="dropzone-features">
        <div
          className="feature-chip"
          title="Función: Aplica equilibrio de color, sombras y nitidez adaptados a templos e iglesias"
        >
          <Sparkles size={15} style={{ color: '#f59e0b' }} />
          <span>Auto-Edición Iglesia</span>
        </div>

        <div
          className="feature-chip"
          title="Función: Estampa tu logo o marca de agua automáticamente en la misma posición de todo el lote"
        >
          <ImageIcon size={15} style={{ color: '#3b82f6' }} />
          <span>Marca de Agua Automática</span>
        </div>

        <div
          className="feature-chip"
          title="Función: Superpone marcos PNG prediseñados o crea banners de eventos con fecha y título"
        >
          <Frame size={15} style={{ color: '#10b981' }} />
          <span>Marcos de Eventos</span>
        </div>
      </div>

      <div className="dropzone-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="btn-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud size={18} />
          <span>Seleccionar Fotos de tu Cámara</span>
        </button>

        <button className="btn-secondary" onClick={onLoadSamples}>
          <Sparkles size={18} style={{ color: '#f59e0b' }} />
          <span>Probar con Fotos de Ejemplo</span>
        </button>
      </div>
    </div>
  );
};
