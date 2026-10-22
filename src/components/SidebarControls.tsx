import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Frame as FrameIcon,
  RotateCcw,
  Crop,
  Star,
  Wand2,
  SunMedium,
  Contrast,
  CheckCheck,
  Droplets,
  Thermometer,
  Moon,
  Plus,
  Sun,
  Focus,
  RotateCw,
  FlipHorizontal2,
  Compass,
  Check,
  X,
  Ban,
  Type,
  LayoutGrid,
  Copy,
} from 'lucide-react';
import { HapticRuler } from './HapticRuler';
import {
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  type CustomPreset,
} from '../utils/presetStorage';
import type {
  PhotoItem,
  ImageAdjustments,
  WatermarkSettings,
  FrameSettings,
  CropSettings,
  PresetType,
  AspectRatioType,
} from '../types/editor';
import {
  getSavedPngFrames,
  savePngFrame,
  deleteSavedPngFrame,
} from '../utils/frameStorage';
import type { SavedPngFrame } from '../utils/frameStorage';

interface SidebarControlsProps {
  photo: PhotoItem;
  watermark: WatermarkSettings;
  frame: FrameSettings;
  onUpdateAdjustments: (adjustments: ImageAdjustments) => void;
  onUpdateCrop: (crop: CropSettings) => void;
  onApplyPreset: (preset: PresetType, customAdjustments?: ImageAdjustments) => void | Promise<void>;
  onUpdateWatermark: (watermark: Partial<WatermarkSettings>) => void;
  onUpdateFrame: (frame: Partial<FrameSettings>) => void;
  onApplySettingsToAll: () => void;
  onApplyCropToAll?: () => void;
  onSmartCrop?: () => void;
  onSyncFrameToAll?: () => void;
  onSyncWatermarkToAll?: () => void;
  onSaveAsDefaultAppSettings: () => void;
  totalPhotos?: number;
  isFilmstripOpen?: boolean;
  onToggleFilmstrip?: () => void;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  photo,
  frame,
  onUpdateAdjustments,
  onUpdateCrop,
  onApplyPreset,
  onUpdateFrame,
  onApplySettingsToAll,
  onApplyCropToAll,
  onSmartCrop,
  onSyncFrameToAll,
  isFilmstripOpen = false,
  onToggleFilmstrip,
}) => {
  const [activeTab, setActiveTab] = useState<'develop' | 'crop' | 'presets' | 'frame'>('develop');
  const [activeLightParam, setActiveLightParam] = useState<keyof ImageAdjustments>('brightness');
  const [activeCropMode, setActiveCropMode] = useState<'straighten' | 'ratios'>('ratios');
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [showSavePresetInput, setShowSavePresetInput] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');

  const [savedFrames, setSavedFrames] = useState<SavedPngFrame[]>([]);
  const framePngInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncStorage = () => {
      setSavedFrames(getSavedPngFrames());
      setCustomPresets(getCustomPresets());
    };
    syncStorage();
    window.addEventListener('bereasnap-storage-updated', syncStorage);
    return () => window.removeEventListener('bereasnap-storage-updated', syncStorage);
  }, []);

  const handleSaveCustomPreset = () => {
    if (!newPresetName.trim()) return;
    const updated = saveCustomPreset(newPresetName.trim(), photo.adjustments);
    setCustomPresets(updated);
    const createdId = updated[0]?.id || 'custom';
    onApplyPreset(createdId, photo.adjustments);
    setNewPresetName('');
    setShowSavePresetInput(false);
  };

  const lightParams: {
    key: keyof ImageAdjustments;
    label: string;
    icon: React.FC<{ size?: number; className?: string }>;
    min: number;
    max: number;
    step: number;
  }[] = [
    { key: 'brightness', label: 'Exposición', icon: SunMedium, min: -100, max: 100, step: 1 },
    { key: 'contrast', label: 'Contraste', icon: Contrast, min: -100, max: 100, step: 1 },
    { key: 'highlights', label: 'Altas Luces', icon: Sun, min: -100, max: 100, step: 1 },
    { key: 'shadows', label: 'Sombras', icon: Moon, min: -100, max: 100, step: 1 },
    { key: 'saturation', label: 'Saturación', icon: Droplets, min: -100, max: 100, step: 1 },
    { key: 'warmth', label: 'Calidez', icon: Thermometer, min: -100, max: 100, step: 1 },
    { key: 'sharpness', label: 'Nitidez', icon: Focus, min: 0, max: 100, step: 1 },
  ];

  const handleSliderChange = (key: keyof ImageAdjustments, value: number) => {
    onUpdateAdjustments({
      ...photo.adjustments,
      [key]: value,
    });
  };

  const handleCropChange = (key: keyof CropSettings, value: any) => {
    onUpdateCrop({
      ...photo.crop,
      [key]: value,
    });
  };

  const handleFramePngUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          const updated = savePngFrame(fileName || 'Marco PNG', dataUrl, true);
          setSavedFrames(updated);
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
    const updated = deleteSavedPngFrame(id);
    setSavedFrames(updated);
  };

  const presetsList: { id: PresetType; label: string; shortDesc: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    {
      id: 'auto-church',
      label: 'Auto-Tono',
      shortDesc: 'Luz y Balance IA',
      icon: Wand2,
    },
    {
      id: 'warm-worship',
      label: 'Luz Cálida',
      shortDesc: 'Dorado Solemne',
      icon: SunMedium,
    },
    {
      id: 'vibrant-praise',
      label: 'Escenario Vivo',
      shortDesc: 'Color y Nitidez',
      icon: Sparkles,
    },
    {
      id: 'elegant-bw',
      label: 'Monocromo',
      shortDesc: 'B&N Editorial',
      icon: Contrast,
    },
  ];

  const hasPngFrame = frame.style === 'custom-png' && Boolean(frame.pngDataUrl);

  const ratioList: { id: AspectRatioType; label: string }[] = [
    { id: 'original', label: 'Original' },
    ...(hasPngFrame ? [{ id: 'frame' as AspectRatioType, label: 'Marco' }] : []),
    { id: '1:1', label: '1:1' },
    { id: '4:5', label: '4:5' },
    { id: '9:16', label: '9:16' },
    { id: '16:9', label: '16:9' },
    { id: '3:2', label: '3:2' },
    { id: '2:3', label: '2:3' },
    { id: '3:4', label: '3:4' },
  ];

  const activeParamConfig = lightParams.find((p) => p.key === activeLightParam) || lightParams[0];
  const activeValue = photo.adjustments[activeLightParam] ?? 0;

  return (
    <aside className="oneui-bottom-system">
      {/* ============================================================
          TARJETA FLOTANTE DE CONTROL ESTILO SAMSUNG ONE UI (DECK)
         ============================================================ */}
      <div className="oneui-floating-card card-glass">
        {/* TAB 1: AJUSTES DE LUZ Y COLOR (DIALES + REGLA GRADUADA ONE UI) */}
        {activeTab === 'develop' && (
          <div className="oneui-deck-inner">
            {/* Título centrado del parámetro activo (ej. "BALANCE DE LUZ" / "EXPOSICIÓN") */}
            <div className="oneui-deck-title-row">
              <span className="oneui-param-title">{activeParamConfig.label.toUpperCase()}</span>
              <div className="oneui-deck-actions-right">
                {activeValue !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleSliderChange(activeLightParam, 0)}
                    className="oneui-reset-tiny-btn"
                    title="Restablecer este parámetro a 0"
                  >
                    <RotateCcw size={11} />
                    <span>0</span>
                  </button>
                )}
                {onApplySettingsToAll && (
                  <button
                    type="button"
                    onClick={onApplySettingsToAll}
                    className="oneui-sync-pill-btn"
                    title="Copiar estos ajustes de luz a todas las fotos"
                  >
                    <Copy size={11} />
                    <span>A todas</span>
                  </button>
                )}
              </div>
            </div>

            {/* Fila Horizontal de Diales Circulares estilo Samsung One UI */}
            <div className="oneui-dials-strip">
              {/* Botón Píldora "Auto" a la izquierda */}
              <button
                type="button"
                onClick={() => onApplyPreset('auto-church')}
                className={`oneui-auto-pill ${photo.preset === 'auto-church' ? 'active' : ''}`}
                title="Auto-exposición y balance inteligente"
              >
                <span>Auto</span>
              </button>

              {/* Diales Circulares */}
              {lightParams.map((p) => {
                const Icon = p.icon;
                const isSelected = activeLightParam === p.key;
                const val = photo.adjustments[p.key] ?? 0;
                const isModified = val !== 0;

                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setActiveLightParam(p.key)}
                    onDoubleClick={() => handleSliderChange(p.key, 0)}
                    className={`oneui-dial-item ${isSelected ? 'active' : ''}`}
                    title={`${p.label}: ${val > 0 ? `+${val}` : val}`}
                  >
                    {isSelected ? (
                      /* Dial Activo Expandido con valor numérico en el centro */
                      <div className="oneui-active-dial-circle">
                        <div
                          className="oneui-dial-pie"
                          style={{
                            background: val !== 0
                              ? `conic-gradient(#f59e0b ${Math.abs(val) * 1.8}deg, rgba(255,255,255,0.1) 0deg)`
                              : 'rgba(255,255,255,0.1)',
                          }}
                        />
                        <span className="oneui-dial-num">{val > 0 ? `+${val}` : val}</span>
                      </div>
                    ) : (
                      /* Dial Inactivo con Icono sutil */
                      <div className={`oneui-dial-circle ${isModified ? 'modified' : ''}`}>
                        <Icon size={16} />
                        {isModified && <span className="oneui-mod-dot" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Regla Graduada Táctil con Aguja Central (Haptic Ruler Slider) */}
            <div className="oneui-ruler-container">
              <HapticRuler
                value={activeValue}
                min={activeParamConfig.min}
                max={activeParamConfig.max}
                step={activeParamConfig.step}
                onChange={(val) => handleSliderChange(activeLightParam, val)}
                accentColor="#f59e0b"
              />
            </div>
          </div>
        )}

        {/* TAB 2: ENCUADRE, HORIZONTE Y PROPORCIÓN (ESTILO ONE UI) */}
        {activeTab === 'crop' && (
          <div className="oneui-deck-inner">
            {/* Título de Encuadre o Nivelación */}
            <div className="oneui-deck-title-row">
              <span className="oneui-param-title">
                {activeCropMode === 'straighten'
                  ? `ENDEREZAR ${photo.crop?.straighten ? `${photo.crop.straighten > 0 ? '+' : ''}${Number(photo.crop.straighten.toFixed(1))}°` : '0°'}`
                  : 'PROPORCIÓN DE ENCUADRE'}
              </span>

              <div className="oneui-deck-actions-right">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateCrop({
                      ...photo.crop,
                      offsetX: 0,
                      offsetY: 0,
                      zoom: 1.0,
                      rotation: 0,
                      straighten: 0,
                      flipH: false,
                      flipV: false,
                    });
                  }}
                  className="oneui-reset-tiny-btn"
                  title="Restablecer encuadre"
                >
                  <RotateCcw size={11} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Fila de Herramientas Geométricas (Girar 90°, Espejo, Auto-crop, Enderezar) */}
            <div className="oneui-geom-actions-row">
              <button
                type="button"
                onClick={() => setActiveCropMode(activeCropMode === 'straighten' ? 'ratios' : 'straighten')}
                className={`oneui-geom-circle-btn ${activeCropMode === 'straighten' ? 'active' : ''}`}
                title="Nivelar horizonte con regla"
              >
                <Compass size={17} />
              </button>

              <button
                type="button"
                onClick={() => handleCropChange('rotation', ((photo.crop?.rotation || 0) + 90) % 360)}
                className={`oneui-geom-circle-btn ${photo.crop?.rotation ? 'active' : ''}`}
                title="Girar 90° a la derecha"
              >
                <RotateCw size={17} />
              </button>

              <button
                type="button"
                onClick={() => handleCropChange('flipH', !photo.crop?.flipH)}
                className={`oneui-geom-circle-btn ${photo.crop?.flipH ? 'active' : ''}`}
                title="Voltear en espejo horizontal"
              >
                <FlipHorizontal2 size={17} />
              </button>

              {onSmartCrop && (
                <button
                  type="button"
                  onClick={onSmartCrop}
                  className="oneui-geom-circle-btn accent"
                  title="Reencuadre inteligente centrado en rostros"
                >
                  <Wand2 size={16} />
                </button>
              )}

              {onApplyCropToAll && (
                <button
                  type="button"
                  onClick={onApplyCropToAll}
                  className="oneui-geom-circle-btn"
                  title="Sincronizar encuadre con todo el lote"
                >
                  <CheckCheck size={16} />
                </button>
              )}
            </div>

            {/* Regla de Nivelación de Horizonte si está activo Enderezar */}
            {activeCropMode === 'straighten' ? (
              <div className="oneui-ruler-container">
                <HapticRuler
                  value={photo.crop?.straighten || 0}
                  min={-15}
                  max={15}
                  step={0.1}
                  onChange={(val) => handleCropChange('straighten', val)}
                  accentColor="#38bdf8"
                />
              </div>
            ) : (
              /* Carrusel Horizontal de Proporciones estilo One UI (Texto limpio con punto) */
              <div className="oneui-ratios-carousel">
                {ratioList.map((r) => {
                  const isSelected = (photo.crop?.aspectRatio || 'original') === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleCropChange('aspectRatio', r.id)}
                      className={`oneui-ratio-text-btn ${isSelected ? 'active' : ''}`}
                    >
                      <span>{r.label}</span>
                      {isSelected && <span className="oneui-ratio-active-dot" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FILTROS Y ESTILOS DE REVELADO */}
        {activeTab === 'presets' && (
          <div className="oneui-deck-inner">
            <div className="oneui-deck-title-row">
              <span className="oneui-param-title">FILTROS DE ESTUDIO</span>
              {showSavePresetInput ? (
                <div className="oneui-inline-save">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Nombre del filtro..."
                    className="oneui-deck-input"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveCustomPreset()}
                  />
                  <button type="button" onClick={handleSaveCustomPreset} className="oneui-mini-action-btn primary">
                    <Check size={12} />
                  </button>
                  <button type="button" onClick={() => setShowSavePresetInput(false)} className="oneui-mini-action-btn">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="oneui-deck-actions-right">
                  <button
                    type="button"
                    onClick={() => setShowSavePresetInput(true)}
                    className="oneui-reset-tiny-btn"
                    title="Guardar ajustes actuales como un nuevo filtro"
                  >
                    <Plus size={11} />
                    <span>Guardar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onApplyPreset('custom')}
                    className="oneui-reset-tiny-btn"
                    title="Restablecer filtros"
                  >
                    <RotateCcw size={11} />
                    <span>Neutro</span>
                  </button>
                </div>
              )}
            </div>

            {/* Carrusel Horizontal de Presets */}
            <div className="oneui-presets-strip">
              {presetsList.map((p) => {
                const Icon = p.icon;
                const isActive = photo.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onApplyPreset(p.id)}
                    className={`oneui-preset-card ${isActive ? 'active' : ''}`}
                  >
                    <div className="oneui-preset-icon-wrap">
                      <Icon size={17} />
                    </div>
                    <strong>{p.label}</strong>
                    <span>{p.shortDesc}</span>
                  </button>
                );
              })}

              {/* Presets Guardados por el Usuario */}
              {customPresets.map((cp) => {
                const isActive = photo.preset === cp.id;
                return (
                  <div
                    key={cp.id}
                    onClick={() => onApplyPreset(cp.id, cp.adjustments)}
                    className={`oneui-preset-card custom ${isActive ? 'active' : ''}`}
                  >
                    <div className="oneui-preset-icon-wrap">
                      <Star size={15} fill={isActive ? '#fff' : '#f59e0b'} color={isActive ? '#fff' : '#f59e0b'} />
                    </div>
                    <strong>{cp.name}</strong>
                    <span>Personal</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomPresets(deleteCustomPreset(cp.id));
                      }}
                      className="oneui-preset-del"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: MARCO INSTITUCIONAL DINÁMICO (FUSIÓN MARCO Y FIRMA) */}
        {activeTab === 'frame' && (
          <div className="oneui-deck-inner">
            <input
              ref={framePngInputRef}
              type="file"
              accept="image/png,image/webp"
              onChange={handleFramePngUpload}
              style={{ display: 'none' }}
            />

            <div className="oneui-deck-title-row">
              <span className="oneui-param-title">MARCO INSTITUCIONAL</span>
              {onSyncFrameToAll && (
                <button
                  type="button"
                  onClick={onSyncFrameToAll}
                  className="oneui-reset-tiny-btn"
                  title="Sincronizar marco con todas las fotos del lote"
                >
                  <CheckCheck size={11} />
                  <span>Sync Lote</span>
                </button>
              )}
            </div>

            {/* Fila 1: Selección Limpia de Marco */}
            <div className="oneui-frame-cards-row">
              {/* Opción Sin Marco */}
              <button
                type="button"
                onClick={() => onUpdateFrame({ style: 'none' })}
                className={`oneui-frame-card ${frame.style === 'none' ? 'active' : ''}`}
              >
                <div className="frame-card-thumb none">
                  <Ban size={20} />
                </div>
                <span>Sin marco</span>
              </button>

              {/* Marco Oficial Centenario Dinámico */}
              {savedFrames.map((f) => {
                const isActive = frame.style === 'custom-png' && frame.pngDataUrl === f.pngDataUrl;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelectSavedFrame(f)}
                    className={`oneui-frame-card ${isActive ? 'active' : ''}`}
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
                      >
                        <X size={10} />
                      </button>
                    )}
                  </button>
                );
              })}

              {/* Botón para subir nuevo marco PNG */}
              <button
                type="button"
                onClick={() => framePngInputRef.current?.click()}
                className="oneui-frame-card add"
                title="Subir marco en formato PNG transparente"
              >
                <div className="frame-card-thumb add">
                  <Plus size={20} />
                </div>
                <span>Subir PNG</span>
              </button>
            </div>

            {/* Fila 2: Personalización del Título Dinámico en el Marco */}
            {frame.style === 'custom-png' && (
              <div className="oneui-frame-custom-row">
                <div className="oneui-frame-input-wrap">
                  <Type size={14} style={{ color: '#f59e0b' }} />
                  <input
                    type="text"
                    value={frame.eventTitle || ''}
                    onChange={(e) => onUpdateFrame({ eventTitle: e.target.value, dynamicTextEnabled: true })}
                    placeholder="Título del evento (ej. Escuela Dominical)"
                    maxLength={42}
                    className="oneui-deck-input"
                  />
                </div>

                <div className="oneui-chips-row">
                  {['Escuela Dominical', 'Oración 7pm', 'Culto Especial', 'Estudio Bíblico'].map((ev) => {
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
        )}
      </div>

      {/* ============================================================
          BARRA DE NAVEGACIÓN INFERIOR (ONE UI DOCK)
         ============================================================ */}
      <nav className="oneui-dock">
        {/* 1. Botón Auto Destacado (Píldora con destello estilo Samsung One UI) */}
        <button
          type="button"
          onClick={() => onApplyPreset('auto-church')}
          className="oneui-dock-btn auto-highlight"
          title="Mejora automática con IA en un toque"
        >
          <div className="oneui-dock-icon-circle highlight">
            <Sparkles size={17} />
          </div>
          <span className="oneui-dock-label">Auto</span>
        </button>

        {/* 2. Encuadre */}
        <button
          type="button"
          onClick={() => setActiveTab('crop')}
          className={`oneui-dock-btn ${activeTab === 'crop' ? 'active' : ''}`}
          title="Encuadre, proporción y nivelación"
        >
          <div className="oneui-dock-icon-circle">
            <Crop size={18} />
          </div>
          <span className="oneui-dock-label">Encuadre</span>
        </button>

        {/* 3. Filtros */}
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`oneui-dock-btn ${activeTab === 'presets' ? 'active' : ''}`}
          title="Filtros y estilos de revelado"
        >
          <div className="oneui-dock-icon-circle">
            <Wand2 size={18} />
          </div>
          <span className="oneui-dock-label">Filtros</span>
        </button>

        {/* 4. Ajustes */}
        <button
          type="button"
          onClick={() => setActiveTab('develop')}
          className={`oneui-dock-btn ${activeTab === 'develop' ? 'active' : ''}`}
          title="Ajustes de luz, sombras y color"
        >
          <div className="oneui-dock-icon-circle">
            <SunMedium size={18} />
          </div>
          <span className="oneui-dock-label">Ajustes</span>
        </button>

        {/* 5. Marco (Fusión de marco y firma) */}
        <button
          type="button"
          onClick={() => setActiveTab('frame')}
          className={`oneui-dock-btn ${activeTab === 'frame' ? 'active' : ''}`}
          title="Marco institucional y textos dinámicos"
        >
          <div className="oneui-dock-icon-circle">
            <FrameIcon size={18} />
          </div>
          <span className="oneui-dock-label">Marco</span>
        </button>

        {/* 6. Carrete de Sesión (Togglable) */}
        {onToggleFilmstrip && (
          <button
            type="button"
            onClick={onToggleFilmstrip}
            className={`oneui-dock-btn ${isFilmstripOpen ? 'active' : ''}`}
            title="Abrir carrete de fotografías"
          >
            <div className="oneui-dock-icon-circle">
              <LayoutGrid size={18} />
            </div>
            <span className="oneui-dock-label">Carrete</span>
          </button>
        )}
      </nav>
    </aside>
  );
};
