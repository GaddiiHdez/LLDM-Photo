import React, { useRef } from 'react';
import {
  Sparkles,
  CheckCheck,
  Plus,
  X,
  Ban,
  Type,
  Calendar,
} from 'lucide-react';
import { formatFrameDate } from '../../utils/eventClassifier';
import { savePngFrame, deleteSavedPngFrame, type SavedPngFrame } from '../../utils/frameStorage';
import type { PhotoItem, FrameSettings } from '../../types/editor';

interface FrameTabProps {
  photo: PhotoItem;
  frame: FrameSettings;
  savedFrames: SavedPngFrame[];
  onChangeSavedFrames: (frames: SavedPngFrame[]) => void;
  onUpdateFrame: (frame: Partial<FrameSettings>) => void;
  onSyncFrameToAll?: () => void;
}

export const FrameTab: React.FC<FrameTabProps> = ({
  photo,
  frame,
  savedFrames,
  onChangeSavedFrames,
  onUpdateFrame,
  onSyncFrameToAll,
}) => {
  const framePngInputRef = useRef<HTMLInputElement>(null);

  const handleFramePngUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          const updated = savePngFrame(fileName || 'Marco PNG', dataUrl, true);
          onChangeSavedFrames(updated);
          onUpdateFrame({
            style: 'custom-png',
            pngDataUrl: dataUrl,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSavedFrame = (f: SavedPngFrame) => {
    onUpdateFrame({
      style: 'custom-png',
      pngDataUrl: f.pngDataUrl,
      eventTitle: f.defaultEventTitle || (f.isDynamic ? (frame.eventTitle || 'Escuela Dominical') : frame.eventTitle),
      dynamicTextEnabled: Boolean(f.isDynamic || f.pngDataUrl.includes('notexto')),
    });
  };

  const handleDeleteSavedFrame = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeSavedFrames(deleteSavedPngFrame(id));
  };

  return (
    <div className="oneui-deck-inner">
      <input
        ref={framePngInputRef}
        type="file"
        accept="image/png,image/webp"
        onChange={handleFramePngUpload}
        style={{ display: 'none' }}
      />

      <div className="oneui-deck-title-row">
        <div className="oneui-param-title-group">
          <span className="oneui-param-title">MARCO INSTITUCIONAL</span>
          {photo?.metadata?.timeFormatted && (
            <span className="oneui-param-meta-tag">
              {photo.metadata.timeFormatted}
              {photo.metadata.cameraModel ? ` • ${photo.metadata.cameraModel}` : ''}
            </span>
          )}
        </div>
        {onSyncFrameToAll && (
          <button
            type="button"
            onClick={onSyncFrameToAll}
            className="oneui-sync-pill-btn"
            title="Sincronizar marco con todas las fotos del lote"
          >
            <CheckCheck size={11} />
            <span>Sync lote</span>
          </button>
        )}
      </div>

      <div className="oneui-frame-cards-row">
        <button
          type="button"
          onClick={() => onUpdateFrame({ style: 'none' })}
          className={`oneui-frame-card ${frame.style === 'none' ? 'active' : ''}`}
          title="Sin marco institucional"
        >
          <div className="frame-card-thumb none">
            <Ban size={15} />
          </div>
          <span>Sin marco</span>
        </button>

        {savedFrames.map((f) => {
          const isActive = frame.style === 'custom-png' && frame.pngDataUrl === f.pngDataUrl;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => handleSelectSavedFrame(f)}
              className={`oneui-frame-card ${isActive ? 'active' : ''}`}
              title={f.name}
            >
              <div className="frame-card-thumb">
                <img src={f.pngDataUrl} alt={f.name} />
              </div>
              <span>{f.name}</span>
              {!f.isOfficial && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteSavedFrame(f.id, e)}
                  className="frame-card-del-btn"
                  title="Eliminar este marco"
                >
                  <X size={9} />
                </button>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => framePngInputRef.current?.click()}
          className="oneui-frame-card add"
          title="Subir marco en formato PNG transparente"
        >
          <div className="frame-card-thumb add">
            <Plus size={15} />
          </div>
          <span>Subir PNG</span>
        </button>
      </div>

      {frame.style === 'custom-png' && (
        <div className="oneui-frame-editor-section">
          <div className="oneui-frame-dual-inputs">
            <div className="oneui-dual-input-box" title="Título del evento (Lado izquierdo del marco)">
              <Type size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <input
                type="text"
                value={frame.eventTitle || ''}
                onChange={(e) => onUpdateFrame({ eventTitle: e.target.value, dynamicTextEnabled: true })}
                placeholder="Evento"
                maxLength={40}
                className="oneui-mini-input"
              />
            </div>

            <div className="oneui-dual-input-box" title="Fecha del evento (Lado derecho del marco)">
              <Calendar size={12} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <input
                type="text"
                value={frame.dynamicTextRight || frame.eventDate || ''}
                onChange={(e) =>
                  onUpdateFrame({
                    dynamicTextRight: e.target.value,
                    eventDate: e.target.value,
                    dynamicTextEnabled: true,
                  })
                }
                placeholder="Fecha (ej. 22 de Octubre, 2026)"
                maxLength={40}
                className="oneui-mini-input"
              />
            </div>
          </div>

          <div className="oneui-chips-row compact">
            {photo?.metadata?.dateFormatted && (
              <button
                type="button"
                onClick={() => {
                  const ev = photo.metadata?.detectedEvent || 'Escuela Dominical';
                  const dt = photo.metadata?.dateFormatted || '';
                  onUpdateFrame({
                    eventTitle: ev,
                    dynamicTextRight: dt,
                    eventDate: dt,
                    dynamicTextEnabled: true,
                  });
                }}
                className="oneui-chip-btn auto-exif"
                title={`Detectado: ${photo.metadata.detectedEvent} • ${photo.metadata.dateFormatted}`}
              >
                <Sparkles size={10} />
                <span>Auto EXIF</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const todayStr = formatFrameDate(new Date());
                onUpdateFrame({
                  dynamicTextRight: todayStr,
                  eventDate: todayStr,
                  dynamicTextEnabled: true,
                });
              }}
              className="oneui-chip-btn"
              title="Usar fecha de hoy"
            >
              Hoy
            </button>

            {['Escuela Dominical', 'Oración 7pm', 'Culto Especial', 'Estudio Bíblico', 'Oración 5am'].map((ev) => {
              const isEvActive = (frame.eventTitle || '').trim().toLowerCase() === ev.toLowerCase();
              return (
                <button
                  key={ev}
                  type="button"
                  onClick={() => onUpdateFrame({ eventTitle: ev, dynamicTextEnabled: true })}
                  className={`oneui-chip-btn ${isEvActive ? 'active' : ''}`}
                >
                  {ev}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
