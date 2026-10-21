import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Ban, Check, FolderOpen, Type } from 'lucide-react';
import { getSavedPngFrames, type SavedPngFrame } from '../utils/frameStorage';
import type { FrameSettings } from '../types/editor';

interface BatchDropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  frame: FrameSettings;
  onUpdateFrame: (frame: Partial<FrameSettings>) => void;
}

export const BatchDropzone: React.FC<BatchDropzoneProps> = ({
  onFilesSelected,
  frame,
  onUpdateFrame,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [frames, setFrames] = useState<SavedPngFrame[]>(() => getSavedPngFrames());

  // Los marcos del usuario se hidratan de forma asíncrona desde IndexedDB
  useEffect(() => {
    const sync = () => setFrames(getSavedPngFrames());
    window.addEventListener('bereasnap-storage-updated', sync);
    return () => window.removeEventListener('bereasnap-storage-updated', sync);
  }, []);

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

  const handleSelectFrame = (f: SavedPngFrame) => {
    onUpdateFrame({
      style: 'custom-png',
      pngDataUrl: f.pngDataUrl,
      eventTitle: f.defaultEventTitle || (f.isDynamic ? frame.eventTitle || 'Escuela Dominical' : frame.eventTitle),
      dynamicTextEnabled: Boolean(f.isDynamic || f.pngDataUrl.includes('notexto')),
    });
  };

  const noFrame = frame.style === 'none';
  const activePng = frames.find((f) => frame.style === 'custom-png' && f.pngDataUrl === frame.pngDataUrl);
  const showTitleField = Boolean(activePng && (activePng.isDynamic || activePng.pngDataUrl.includes('notexto')));

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
          <p className="launchpad-subtitle">Elige tu marco e importa tus fotos: el encuadre se ajusta solo.</p>
        </div>

        {/* PASO 1: MARCO */}
        <div className="launchpad-step-label">
          <span className="launchpad-step-num">1</span>
          <span>Elige tu marco</span>
        </div>

        <div className="launchpad-frame-strip">
          <button
            type="button"
            onClick={() => onUpdateFrame({ style: 'none' })}
            className={`launchpad-frame-card ${noFrame ? 'active' : ''}`}
          >
            <div className="launchpad-frame-thumb none">
              <Ban size={22} />
            </div>
            <span>Sin marco</span>
            {noFrame && <Check size={12} className="launchpad-frame-check" />}
          </button>

          {frames.map((f) => {
            const isActive = frame.style === 'custom-png' && frame.pngDataUrl === f.pngDataUrl;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleSelectFrame(f)}
                className={`launchpad-frame-card ${isActive ? 'active' : ''}`}
              >
                <div className="launchpad-frame-thumb">
                  <img src={f.pngDataUrl} alt={f.name} />
                </div>
                <span>{f.name}</span>
                {isActive && <Check size={12} className="launchpad-frame-check" />}
              </button>
            );
          })}
        </div>

        {showTitleField && (
          <div className="launchpad-title-field">
            <Type size={14} />
            <input
              type="text"
              value={frame.eventTitle}
              onChange={(e) => onUpdateFrame({ eventTitle: e.target.value, dynamicTextEnabled: true })}
              placeholder="Título del evento (ej. Escuela Dominical)"
              maxLength={42}
            />
          </div>
        )}

        {/* PASO 2: IMPORTAR */}
        <div className="launchpad-step-label">
          <span className="launchpad-step-num">2</span>
          <span>Importa tus fotografías</span>
        </div>

        <button type="button" className="launchpad-primary-cta" onClick={() => fileInputRef.current?.click()}>
          <div className="cta-icon-circle">
            <ImagePlus size={24} />
          </div>
          <div className="cta-text-col">
            <span className="cta-main-label">Importar Fotografías</span>
            <span className="cta-sub-label">Galería, Memoria SD o RAW (.NEF, .CR2, .JPG)</span>
          </div>
          <FolderOpen size={18} style={{ opacity: 0.75, marginLeft: 'auto' }} />
        </button>
      </div>
    </div>
  );
};
