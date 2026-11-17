import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Plus,
  X,
  Ban,
  Type,
  Calendar,
  Image as ImageIcon,
  Stamp,
  Minus,
  Layers,
  Pencil,
  Check,
  Maximize2,
} from 'lucide-react';
import { formatFrameDate } from '../../utils/eventClassifier';
import { describeEventSuggestion } from '../../utils/batchScope';
import { getFrameAspectRatio, resolveCropRatio } from '../../utils/smartCrop';
import { hasCenterBottomEmblem, isAspectRatioMismatched } from '../../utils/frameLayout';
import {
  savePngFrame,
  deleteSavedPngFrame,
  renameSavedPngFrame,
  type SavedPngFrame,
} from '../../utils/frameStorage';
import {
  saveLogo,
  deleteSavedLogo,
  renameSavedLogo,
  type SavedLogo,
} from '../../utils/logoStorage';
import type {
  PhotoItem,
  FrameSettings,
  WatermarkSettings,
  WatermarkPosition,
} from '../../types/editor';

interface FrameTabProps {
  photo: PhotoItem;
  totalPhotos?: number;
  frame: FrameSettings;
  watermark: WatermarkSettings;
  savedFrames: SavedPngFrame[];
  savedLogos: SavedLogo[];
  onChangeSavedFrames: (frames: SavedPngFrame[]) => void;
  onChangeSavedLogos: (logos: SavedLogo[]) => void;
  onUpdateFrame: (frame: Partial<FrameSettings>) => void;
  onUpdateWatermark: (watermark: Partial<WatermarkSettings>) => void;
  onAdaptCropToFrame?: () => void;
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

const WM_POS_GRID: { id: WatermarkPosition | null; label: string }[] = [
  { id: 'top-left', label: 'Superior izquierda' },
  { id: null, label: '' },
  { id: 'top-right', label: 'Superior derecha' },
  { id: null, label: '' },
  { id: 'center', label: 'Centro' },
  { id: null, label: '' },
  { id: 'bottom-left', label: 'Inferior izquierda' },
  { id: null, label: '' },
  { id: 'bottom-right', label: 'Inferior derecha' },
];

export const FrameTab: React.FC<FrameTabProps> = ({
  photo,
  totalPhotos = 1,
  frame,
  watermark,
  savedFrames,
  savedLogos,
  onChangeSavedFrames,
  onChangeSavedLogos,
  onUpdateFrame,
  onUpdateWatermark,
  onAdaptCropToFrame,
}) => {
  const [subMode, setSubMode] = useState<'frame' | 'logo'>('frame');
  const [editingFrameId, setEditingFrameId] = useState<string | null>(null);
  const [editingFrameName, setEditingFrameName] = useState('');
  const [editingLogoId, setEditingLogoId] = useState<string | null>(null);
  const [editingLogoName, setEditingLogoName] = useState('');
  const [frameRatioMismatch, setFrameRatioMismatch] = useState<{ frameRatio: number; photoRatio: number } | null>(null);
  const framePngInputRef = useRef<HTMLInputElement>(null);
  const logoPngInputRef = useRef<HTMLInputElement>(null);
  const metaSuggestion = describeEventSuggestion(photo?.metadata);

  // Detectar diferencia significativa entre proporción actual de la foto y el marco PNG activo
  useEffect(() => {
    let cancelled = false;
    if (frame.style !== 'custom-png' || !frame.pngDataUrl || photo.crop?.aspectRatio === 'frame') {
      setFrameRatioMismatch(null);
      return;
    }
    getFrameAspectRatio(frame.pngDataUrl).then((fRatio) => {
      if (cancelled || !fRatio) {
        if (!cancelled) setFrameRatioMismatch(null);
        return;
      }
      const pRatio = resolveCropRatio(photo.crop, photo.width, photo.height, fRatio);
      if (isAspectRatioMismatched(pRatio, fRatio, 0.16)) {
        setFrameRatioMismatch({ frameRatio: fRatio, photoRatio: pRatio });
      } else {
        setFrameRatioMismatch(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [frame.style, frame.pngDataUrl, photo.crop, photo.width, photo.height]);

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
            dynamicTextEnabled: false,
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
    const supportsDynamic = Boolean(f.isDynamic || hasCenterBottomEmblem(f.pngDataUrl));
    onUpdateFrame({
      style: 'custom-png',
      pngDataUrl: f.pngDataUrl,
      eventTitle: f.defaultEventTitle || (supportsDynamic ? (frame.eventTitle || 'Escuela Dominical') : frame.eventTitle),
      dynamicTextEnabled: supportsDynamic,
    });
  };

  const handleDeleteSavedFrame = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = savedFrames.find((f) => f.id === id);
    const updated = deleteSavedPngFrame(id);
    onChangeSavedFrames(updated);
    if (target && frame.pngDataUrl === target.pngDataUrl) {
      onUpdateFrame({ style: 'none', pngDataUrl: null });
    }
  };

  const handleDeleteSavedLogo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = savedLogos.find((l) => l.id === id);
    const updated = deleteSavedLogo(id);
    onChangeSavedLogos(updated);
    if (target && watermark.imageDataUrl === target.imageDataUrl) {
      onUpdateWatermark({ enabled: false, imageDataUrl: null });
    }
  };

  const commitFrameRename = () => {
    if (editingFrameId && editingFrameName.trim()) {
      onChangeSavedFrames(renameSavedPngFrame(editingFrameId, editingFrameName));
    }
    setEditingFrameId(null);
  };

  const commitLogoRename = () => {
    if (editingLogoId && editingLogoName.trim()) {
      onChangeSavedLogos(renameSavedLogo(editingLogoId, editingLogoName));
    }
    setEditingLogoId(null);
  };

  const activeSavedFrame = savedFrames.find((f) => frame.style === 'custom-png' && f.pngDataUrl === frame.pngDataUrl);
  const activeSavedLogo = savedLogos.find((l) => watermark.type === 'image' && l.imageDataUrl === watermark.imageDataUrl);
  const hasProtectedEmblem = hasCenterBottomEmblem(frame.pngDataUrl);
  const availableTextPositions = hasProtectedEmblem
    ? TEXT_POSITIONS.filter((p) => p.id !== 'bottom-center')
    : TEXT_POSITIONS;

  const currentScale = frame.dynamicTextScale || 100;
  const activeTextPos =
    frame.dynamicTextPosition ||
    (hasProtectedEmblem ? 'centenario-left' : 'bottom-center');
  const activeTextColor = frame.dynamicTextColorStyle || 'gold';
  const isTextEnabled = Boolean(frame.dynamicTextEnabled);

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
            <span className="oneui-param-meta-tag" title={metaSuggestion.label}>
              {photo.metadata.timeFormatted}
            </span>
          )}
        </div>
        <span
          className="oneui-param-meta-tag"
          title="Marco, textos y firma se aplican automáticamente a todo el lote"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <Layers size={10} />
          <span>{totalPhotos > 1 ? `Global (${totalPhotos} fotos)` : 'Sesión global'}</span>
        </span>
      </div>

      {subMode === 'frame' ? (
        <div className="oneui-frame-sections-stack">
          {/* Bloque 1: Selección y Gestión de Marco */}
          <div className="oneui-subcard-panel">
            <div className="oneui-subcard-header">
              <span className="oneui-presets-section-label">1. Marco de sesión</span>
              {activeSavedFrame && !activeSavedFrame.isOfficial && (
                editingFrameId === activeSavedFrame.id ? (
                  <div className="oneui-inline-save" style={{ padding: '0.1rem 0.35rem' }}>
                    <input
                      type="text"
                      value={editingFrameName}
                      onChange={(e) => setEditingFrameName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && commitFrameRename()}
                      placeholder="Nombre marco"
                      className="oneui-mini-input"
                      style={{ width: 95 }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={commitFrameRename}
                      className="oneui-mini-action-btn primary"
                      aria-label="Guardar nombre del marco"
                    >
                      <Check size={11} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFrameId(activeSavedFrame.id);
                      setEditingFrameName(activeSavedFrame.name);
                    }}
                    className="oneui-reset-tiny-btn"
                    title="Renombrar marco seleccionado"
                  >
                    <Pencil size={10} />
                    <span>Renombrar</span>
                  </button>
                )
              )}
            </div>

            <div className="oneui-frame-cards-row">
              <button
                type="button"
                onClick={() => onUpdateFrame({ style: 'none' })}
                className={`oneui-frame-card ${frame.style === 'none' ? 'active' : ''}`}
                title="Sin marco institucional"
                aria-pressed={frame.style === 'none'}
              >
                <div className="frame-card-thumb none">
                  <Ban size={15} />
                </div>
                <span>Sin marco</span>
              </button>

              {savedFrames.map((f) => {
                const isActive = frame.style === 'custom-png' && frame.pngDataUrl === f.pngDataUrl;
                return (
                  <div
                    key={f.id}
                    className={`oneui-frame-card ${isActive ? 'active' : ''}`}
                    title={f.name}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectSavedFrame(f)}
                      className="oneui-frame-select-btn"
                      aria-pressed={isActive}
                      aria-label={`Marco ${f.name}`}
                    >
                      <div className="frame-card-thumb">
                        <img src={f.pngDataUrl} alt={f.name} />
                      </div>
                      <span>{f.name}</span>
                    </button>
                    {!f.isOfficial && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedFrame(f.id, e)}
                        className="frame-card-del-btn"
                        title={`Eliminar marco ${f.name}`}
                        aria-label={`Eliminar marco ${f.name}`}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
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

            {frameRatioMismatch && onAdaptCropToFrame && (
              <div className="oneui-fit-mismatch-bar">
                <span>
                  El encuadre actual difiere de la proporción del marco
                </span>
                <button
                  type="button"
                  onClick={onAdaptCropToFrame}
                  className="oneui-chip-btn auto-exif"
                  title="Ajusta el recorte a la proporción del marco (reversible con Deshacer)"
                >
                  <Maximize2 size={10} />
                  <span>Adaptar al marco</span>
                </button>
              </div>
            )}
          </div>

          {/* Bloque 2: Texto Dinámico del Evento */}
          {frame.style === 'custom-png' && (
            <div className="oneui-subcard-panel">
              <div className="oneui-subcard-header">
                <span className="oneui-presets-section-label">2. Texto sobre marco</span>
                <button
                  type="button"
                  onClick={() => onUpdateFrame({ dynamicTextEnabled: !isTextEnabled })}
                  className={`oneui-chip-btn ${isTextEnabled ? 'active' : ''}`}
                  aria-pressed={isTextEnabled}
                >
                  {isTextEnabled ? 'Texto: ON' : 'Texto: OFF'}
                </button>
              </div>

              {isTextEnabled && (
                <div className="oneui-frame-editor-section">
                  <div className="oneui-frame-dual-inputs">
                    <div className="oneui-dual-input-box" title="Título del evento">
                      <Type size={12} style={{ color: 'var(--oneui-accent)', flexShrink: 0 }} />
                      <input
                        type="text"
                        value={frame.eventTitle || ''}
                        onChange={(e) => onUpdateFrame({ eventTitle: e.target.value, dynamicTextEnabled: true })}
                        placeholder="Nombre del evento"
                        maxLength={40}
                        className="oneui-mini-input"
                        aria-label="Nombre del evento"
                      />
                    </div>

                    <div className="oneui-dual-input-box" title="Fecha o texto secundario (vacío = ocultar)">
                      <Calendar size={12} style={{ color: 'var(--color-brand-light)', flexShrink: 0 }} />
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
                        placeholder="Fecha (opcional)"
                        maxLength={40}
                        className="oneui-mini-input"
                        aria-label="Fecha o texto secundario"
                      />
                    </div>
                  </div>

                  <div className="oneui-chips-row compact">
                    {availableTextPositions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onUpdateFrame({ dynamicTextPosition: p.id, dynamicTextEnabled: true })}
                        className={`oneui-chip-btn ${activeTextPos === p.id ? 'active' : ''}`}
                        title={`Posición de texto: ${p.label}`}
                        aria-pressed={activeTextPos === p.id}
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
                        aria-pressed={activeTextColor === c.id}
                      >
                        {c.label}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => onUpdateFrame({ dynamicTextScale: Math.max(70, currentScale - 10) })}
                      className="oneui-chip-btn"
                      title="Reducir tamaño de texto"
                      aria-label="Reducir tamaño de texto"
                    >
                      <Minus size={10} /> A
                    </button>
                    <span className="oneui-param-meta-tag">{currentScale}%</span>
                    <button
                      type="button"
                      onClick={() => onUpdateFrame({ dynamicTextScale: Math.min(140, currentScale + 10) })}
                      className="oneui-chip-btn"
                      title="Aumentar tamaño de texto"
                      aria-label="Aumentar tamaño de texto"
                    >
                      <Plus size={10} /> A
                    </button>
                  </div>

                  <div className="oneui-chips-row compact">
                    {photo?.metadata?.dateFormatted && (
                      <button
                        type="button"
                        onClick={() => {
                          const ev = photo.metadata?.detectedEvent || 'Culto Especial';
                          const dt = photo.metadata?.dateFormatted || '';
                          onUpdateFrame({
                            eventTitle: ev,
                            dynamicTextRight: dt,
                            eventDate: dt,
                            dynamicTextEnabled: true,
                          });
                        }}
                        className="oneui-chip-btn auto-exif"
                        title={metaSuggestion.label}
                      >
                        <Sparkles size={10} />
                        <span>
                          {metaSuggestion.isEstimatedDate ? 'Usar fecha archivo' : 'Usar datos EXIF'}
                        </span>
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

                  {hasProtectedEmblem && (
                    <span className="oneui-helper-tip" style={{ textAlign: 'left', padding: 0 }}>
                      El centro inferior queda libre automáticamente para no tapar el emblema del marco.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Bloque 3: LOGO / FIRMA (WATERMARK) con selector visual 3x3 y controles amplios */
        <div className="oneui-frame-sections-stack">
          <div className="oneui-subcard-panel">
            <div className="oneui-chips-row compact">
              <button
                type="button"
                onClick={() => onUpdateWatermark({ enabled: !watermark.enabled })}
                className={`oneui-chip-btn ${watermark.enabled ? 'active' : ''}`}
                aria-pressed={watermark.enabled}
              >
                {watermark.enabled ? 'Firma: ON' : 'Firma: OFF'}
              </button>
              <button
                type="button"
                onClick={() => onUpdateWatermark({ type: 'image', enabled: true })}
                className={`oneui-chip-btn ${watermark.type === 'image' ? 'active' : ''}`}
                aria-pressed={watermark.type === 'image'}
              >
                Logo PNG
              </button>
              <button
                type="button"
                onClick={() => onUpdateWatermark({ type: 'text', enabled: true })}
                className={`oneui-chip-btn ${watermark.type === 'text' ? 'active' : ''}`}
                aria-pressed={watermark.type === 'text'}
              >
                Texto / Firma
              </button>
              {activeSavedLogo && !activeSavedLogo.isOfficial && (
                editingLogoId === activeSavedLogo.id ? (
                  <div className="oneui-inline-save" style={{ marginLeft: 'auto', padding: '0.1rem 0.35rem' }}>
                    <input
                      type="text"
                      value={editingLogoName}
                      onChange={(e) => setEditingLogoName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && commitLogoRename()}
                      placeholder="Nombre logo"
                      className="oneui-mini-input"
                      style={{ width: 90 }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={commitLogoRename}
                      className="oneui-mini-action-btn primary"
                      aria-label="Guardar nombre del logo"
                    >
                      <Check size={11} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLogoId(activeSavedLogo.id);
                      setEditingLogoName(activeSavedLogo.name);
                    }}
                    className="oneui-reset-tiny-btn"
                    style={{ marginLeft: 'auto' }}
                    title="Renombrar logo seleccionado"
                  >
                    <Pencil size={10} />
                    <span>Renombrar</span>
                  </button>
                )
              )}
            </div>

            {watermark.type === 'image' ? (
              <div className="oneui-frame-cards-row">
                <button
                  type="button"
                  onClick={() => onUpdateWatermark({ enabled: false })}
                  className={`oneui-frame-card ${!watermark.enabled ? 'active' : ''}`}
                  aria-pressed={!watermark.enabled}
                >
                  <div className="frame-card-thumb none">
                    <Ban size={15} />
                  </div>
                  <span>Sin logo</span>
                </button>

                {savedLogos.map((l) => {
                  const isActive = watermark.enabled && watermark.imageDataUrl === l.imageDataUrl;
                  return (
                    <div key={l.id} className={`oneui-frame-card ${isActive ? 'active' : ''}`} title={l.name}>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateWatermark({ enabled: true, type: 'image', imageDataUrl: l.imageDataUrl })
                        }
                        className="oneui-frame-select-btn"
                        aria-pressed={isActive}
                        aria-label={`Logo ${l.name}`}
                      >
                        <div className="frame-card-thumb">
                          <img src={l.imageDataUrl} alt={l.name} />
                        </div>
                        <span>{l.name}</span>
                      </button>
                      {!l.isOfficial && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedLogo(l.id, e)}
                          className="frame-card-del-btn"
                          title={`Eliminar logo ${l.name}`}
                          aria-label={`Eliminar logo ${l.name}`}
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
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
              <div className="oneui-frame-dual-inputs" style={{ marginTop: '0.25rem' }}>
                <div className="oneui-dual-input-box">
                  <Type size={12} style={{ color: 'var(--oneui-accent)', flexShrink: 0 }} />
                  <input
                    type="text"
                    value={watermark.text || ''}
                    onChange={(e) => onUpdateWatermark({ text: e.target.value, type: 'text', enabled: true })}
                    placeholder="Ej. LLDM Vistas de la Cantera"
                    maxLength={48}
                    className="oneui-mini-input"
                    aria-label="Texto de firma"
                  />
                </div>
                <div className="oneui-chips-row compact">
                  {['#ffffff', '#fbbf24', '#000000'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onUpdateWatermark({ color: c, enabled: true })}
                      className={`oneui-chip-btn ${watermark.color === c ? 'active' : ''}`}
                      title={`Color ${c}`}
                      aria-label={`Color ${c}`}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: c,
                          border: '1px solid var(--oneui-border)',
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {watermark.enabled && (
            <div className="oneui-subcard-panel">
              <div className="oneui-wm-controls-layout">
                <div>
                  <span className="oneui-presets-section-label">Posición en marco</span>
                  <div className="oneui-wm-pos-grid" role="group" aria-label="Posición de la firma o logo">
                    {WM_POS_GRID.map((cell, idx) =>
                      cell.id ? (
                        <button
                          key={cell.id}
                          type="button"
                          onClick={() => onUpdateWatermark({ position: cell.id!, enabled: true })}
                          className={`oneui-wm-pos-dot ${watermark.position === cell.id ? 'active' : ''}`}
                          title={cell.label}
                          aria-label={cell.label}
                          aria-pressed={watermark.position === cell.id}
                        />
                      ) : (
                        <span key={`empty-${idx}`} className="oneui-wm-pos-spacer" />
                      )
                    )}
                  </div>
                </div>

                <div className="oneui-wm-sliders-col">
                  <div className="oneui-crop-zoom-row" style={{ marginTop: 0 }}>
                    <span className="oneui-crop-zoom-label">Tamaño</span>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      value={watermark.size}
                      onChange={(e) => onUpdateWatermark({ size: Number(e.target.value) })}
                      aria-label="Tamaño de logo o firma"
                      className="oneui-crop-zoom-range"
                    />
                    <span className="oneui-crop-zoom-val">{watermark.size}%</span>
                  </div>

                  <div className="oneui-crop-zoom-row" style={{ marginTop: '0.15rem' }}>
                    <span className="oneui-crop-zoom-label">Opacidad</span>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={Math.round(watermark.opacity * 100)}
                      onChange={(e) => onUpdateWatermark({ opacity: Number(e.target.value) / 100 })}
                      aria-label="Opacidad de logo o firma"
                      className="oneui-crop-zoom-range"
                    />
                    <span className="oneui-crop-zoom-val">{Math.round(watermark.opacity * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
