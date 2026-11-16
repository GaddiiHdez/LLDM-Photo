import React, { useRef, useState } from 'react';
import {
  Sparkles,
  CheckCheck,
  Plus,
  X,
  Ban,
  Type,
  Calendar,
  Image as ImageIcon,
  Stamp,
  Minus,
} from 'lucide-react';
import { formatFrameDate } from '../../utils/eventClassifier';
import { savePngFrame, deleteSavedPngFrame, type SavedPngFrame } from '../../utils/frameStorage';
import { saveLogo, deleteSavedLogo, type SavedLogo } from '../../utils/logoStorage';
import type {
  PhotoItem,
  FrameSettings,
  WatermarkSettings,
  WatermarkPosition,
} from '../../types/editor';

interface FrameTabProps {
  photo: PhotoItem;
  frame: FrameSettings;
  watermark: WatermarkSettings;
  savedFrames: SavedPngFrame[];
  savedLogos: SavedLogo[];
  onChangeSavedFrames: (frames: SavedPngFrame[]) => void;
  onChangeSavedLogos: (logos: SavedLogo[]) => void;
  onUpdateFrame: (frame: Partial<FrameSettings>) => void;
  onUpdateWatermark: (watermark: Partial<WatermarkSettings>) => void;
  onSyncFrameToAll?: () => void;
  onSyncWatermarkToAll?: () => void;
}

const TEXT_POSITIONS: { id: NonNullable<FrameSettings['dynamicTextPosition']>; label: string }[] = [
  { id: 'centenario-left', label: 'Doble' },
  { id: 'bottom-center', label: 'Centro' },
  { id: 'bottom-left', label: 'Izq' },
  { id: 'bottom-right', label: 'Der' },
];

const TEXT_COLORS: { id: NonNullable<FrameSettings['dynamicTextColorStyle']>; label: string }[] = [
  { id: 'gold', label: 'Oro' },
  { id: 'white', label: 'Blanco' },
  { id: 'silver', label: 'Plata' },
];

const WM_POSITIONS: { id: WatermarkPosition; label: string }[] = [
  { id: 'bottom-right', label: 'Inf. Der' },
  { id: 'bottom-left', label: 'Inf. Izq' },
  { id: 'top-right', label: 'Sup. Der' },
  { id: 'top-left', label: 'Sup. Izq' },
  { id: 'center', label: 'Centro' },
];

export const FrameTab: React.FC<FrameTabProps> = ({
  photo,
  frame,
  watermark,
  savedFrames,
  savedLogos,
  onChangeSavedFrames,
  onChangeSavedLogos,
  onUpdateFrame,
  onUpdateWatermark,
  onSyncFrameToAll,
  onSyncWatermarkToAll,
}) => {
  const [subMode, setSubMode] = useState<'frame' | 'logo'>('frame');
  const framePngInputRef = useRef<HTMLInputElement>(null);
  const logoPngInputRef = useRef<HTMLInputElement>(null);

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
    e.target.value = '';
  };

  const handleLogoPngUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          const updated = saveLogo(fileName || 'Logo', dataUrl, true);
          onChangeSavedLogos(updated);
          onUpdateWatermark({
            enabled: true,
            type: 'image',
            imageDataUrl: dataUrl,
          });
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
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

  const handleDeleteSavedLogo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeSavedLogos(deleteSavedLogo(id));
  };

  const currentScale = frame.dynamicTextScale || 100;
  const activeTextPos =
    frame.dynamicTextPosition ||
    (frame.pngDataUrl?.includes('centenario') || frame.pngDataUrl?.includes('notexto')
      ? 'centenario-left'
      : 'bottom-center');
  const activeTextColor = frame.dynamicTextColorStyle || 'gold';
  const isTextEnabled = frame.dynamicTextEnabled ?? true;

  return (
    <div className="oneui-deck-inner">
      <input
        ref={framePngInputRef}
        type="file"
        accept="image/png,image/webp"
        onChange={handleFramePngUpload}
        style={{ display: 'none' }}
      />
      <input
        ref={logoPngInputRef}
        type="file"
        accept="image/png,image/webp,image/svg+xml"
        onChange={handleLogoPngUpload}
        style={{ display: 'none' }}
      />

      <div className="oneui-deck-title-row">
        <div className="oneui-param-title-group" style={{ gap: '0.35rem' }}>
          <button
            type="button"
            onClick={() => setSubMode('frame')}
            className={`oneui-chip-btn ${subMode === 'frame' ? 'active' : ''}`}
            style={{ fontWeight: 700 }}
          >
            <ImageIcon size={10} />
            <span>Marcos</span>
          </button>
          <button
            type="button"
            onClick={() => setSubMode('logo')}
            className={`oneui-chip-btn ${subMode === 'logo' ? 'active' : ''}`}
            style={{ fontWeight: 700 }}
          >
            <Stamp size={10} />
            <span>Logo / Firma{watermark.enabled ? ' • ON' : ''}</span>
          </button>
          {photo?.metadata?.timeFormatted && subMode === 'frame' && (
            <span className="oneui-param-meta-tag">{photo.metadata.timeFormatted}</span>
          )}
        </div>
        {subMode === 'frame' && onSyncFrameToAll && (
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
        {subMode === 'logo' && onSyncWatermarkToAll && (
          <button
            type="button"
            onClick={onSyncWatermarkToAll}
            className="oneui-sync-pill-btn"
            title="Sincronizar logo/firma con todas las fotos del lote"
          >
            <CheckCheck size={11} />
            <span>Sync lote</span>
          </button>
        )}
      </div>

      {subMode === 'frame' ? (
        <>
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

                <div className="oneui-dual-input-box" title="Fecha o texto secundario (vacío = ocultar)">
                  <Calendar size={12} style={{ color: '#38bdf8', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={frame.dynamicTextRight !== undefined ? frame.dynamicTextRight : (frame.eventDate || '')}
                    onChange={(e) =>
                      onUpdateFrame({
                        dynamicTextRight: e.target.value,
                        eventDate: e.target.value,
                        dynamicTextEnabled: true,
                      })
                    }
                    placeholder="Fecha (vacío para ocultar)"
                    maxLength={40}
                    className="oneui-mini-input"
                  />
                </div>
              </div>

              <div className="oneui-chips-row compact">
                <button
                  type="button"
                  onClick={() => onUpdateFrame({ dynamicTextEnabled: !isTextEnabled })}
                  className={`oneui-chip-btn ${isTextEnabled ? 'active' : ''}`}
                  title="Mostrar u ocultar texto dinámico del marco"
                >
                  Texto: {isTextEnabled ? 'ON' : 'OFF'}
                </button>

                {TEXT_POSITIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onUpdateFrame({ dynamicTextPosition: p.id, dynamicTextEnabled: true })}
                    className={`oneui-chip-btn ${activeTextPos === p.id ? 'active' : ''}`}
                    title={`Posición de texto: ${p.label}`}
                  >
                    {p.label}
                  </button>
                ))}

                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onUpdateFrame({ dynamicTextColorStyle: c.id, dynamicTextEnabled: true })}
                    className={`oneui-chip-btn ${activeTextColor === c.id ? 'active' : ''}`}
                    title={`Color de texto: ${c.label}`}
                  >
                    {c.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => onUpdateFrame({ dynamicTextScale: Math.max(70, currentScale - 10) })}
                  className="oneui-chip-btn"
                  title="Reducir tamaño de texto"
                >
                  <Minus size={9} /> A
                </button>
                <span style={{ fontSize: '0.66rem', color: '#94a3b8', alignSelf: 'center', flexShrink: 0 }}>
                  {currentScale}%
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateFrame({ dynamicTextScale: Math.min(140, currentScale + 10) })}
                  className="oneui-chip-btn"
                  title="Aumentar tamaño de texto"
                >
                  <Plus size={9} /> A
                </button>
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
        </>
      ) : (
        /* SUB-VISTA: LOGO / FIRMA (WATERMARK) */
        <div className="oneui-frame-editor-section" style={{ marginTop: 0 }}>
          <div className="oneui-chips-row compact">
            <button
              type="button"
              onClick={() => onUpdateWatermark({ enabled: !watermark.enabled })}
              className={`oneui-chip-btn ${watermark.enabled ? 'active' : ''}`}
            >
              {watermark.enabled ? 'Activo: ON' : 'Desactivado'}
            </button>
            <button
              type="button"
              onClick={() => onUpdateWatermark({ type: 'image', enabled: true })}
              className={`oneui-chip-btn ${watermark.type === 'image' ? 'active' : ''}`}
            >
              Imagen PNG
            </button>
            <button
              type="button"
              onClick={() => onUpdateWatermark({ type: 'text', enabled: true })}
              className={`oneui-chip-btn ${watermark.type === 'text' ? 'active' : ''}`}
            >
              Texto / Firma
            </button>
            {WM_POSITIONS.map((pos) => (
              <button
                key={pos.id}
                type="button"
                onClick={() => onUpdateWatermark({ position: pos.id, enabled: true })}
                className={`oneui-chip-btn ${watermark.position === pos.id ? 'active' : ''}`}
              >
                {pos.label}
              </button>
            ))}
          </div>

          {watermark.type === 'image' ? (
            <div className="oneui-frame-cards-row">
              <button
                type="button"
                onClick={() => onUpdateWatermark({ enabled: false })}
                className={`oneui-frame-card ${!watermark.enabled ? 'active' : ''}`}
              >
                <div className="frame-card-thumb none">
                  <Ban size={15} />
                </div>
                <span>Sin logo</span>
              </button>

              {savedLogos.map((l) => {
                const isActive = watermark.enabled && watermark.imageDataUrl === l.imageDataUrl;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() =>
                      onUpdateWatermark({ enabled: true, type: 'image', imageDataUrl: l.imageDataUrl })
                    }
                    className={`oneui-frame-card ${isActive ? 'active' : ''}`}
                    title={l.name}
                  >
                    <div className="frame-card-thumb">
                      <img src={l.imageDataUrl} alt={l.name} />
                    </div>
                    <span>{l.name}</span>
                    {!l.isOfficial && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedLogo(l.id, e)}
                        className="frame-card-del-btn"
                        title="Eliminar logo"
                      >
                        <X size={9} />
                      </button>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => logoPngInputRef.current?.click()}
                className="oneui-frame-card add"
                title="Subir logo o emblema PNG"
              >
                <div className="frame-card-thumb add">
                  <Plus size={15} />
                </div>
                <span>Subir Logo</span>
              </button>
            </div>
          ) : (
            <div className="oneui-frame-dual-inputs">
              <div className="oneui-dual-input-box" style={{ flex: 1 }}>
                <Type size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <input
                  type="text"
                  value={watermark.text || ''}
                  onChange={(e) => onUpdateWatermark({ text: e.target.value, type: 'text', enabled: true })}
                  placeholder="Ej. LLDM Vistas de la Cantera"
                  maxLength={48}
                  className="oneui-mini-input"
                />
              </div>
              {['#ffffff', '#fbbf24', '#000000'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onUpdateWatermark({ color: c, enabled: true })}
                  className={`oneui-chip-btn ${watermark.color === c ? 'active' : ''}`}
                  style={{ minWidth: 28, justifyContent: 'center' }}
                  title={`Color ${c}`}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: c,
                      border: '1px solid rgba(255,255,255,0.4)',
                    }}
                  />
                </button>
              ))}
            </div>
          )}

          {watermark.enabled && (
            <div className="oneui-frame-dual-inputs" style={{ marginTop: '0.15rem' }}>
              <div className="oneui-dual-input-box" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Tamaño</span>
                <input
                  type="range"
                  min={10}
                  max={60}
                  value={watermark.size}
                  onChange={(e) => onUpdateWatermark({ size: Number(e.target.value) })}
                  style={{ width: '58%', accentColor: '#f59e0b' }}
                />
                <span style={{ fontSize: '0.68rem', color: '#f8fafc', minWidth: 26, textAlign: 'right' }}>
                  {watermark.size}%
                </span>
              </div>

              <div className="oneui-dual-input-box" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Opacidad</span>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={Math.round(watermark.opacity * 100)}
                  onChange={(e) => onUpdateWatermark({ opacity: Number(e.target.value) / 100 })}
                  style={{ width: '58%', accentColor: '#f59e0b' }}
                />
                <span style={{ fontSize: '0.68rem', color: '#f8fafc', minWidth: 26, textAlign: 'right' }}>
                  {Math.round(watermark.opacity * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
