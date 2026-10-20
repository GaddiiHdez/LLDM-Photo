import React, { useState, useRef, useEffect } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  Image as ImageIcon,
  Frame as FrameIcon,
  Upload,
  RotateCcw,
  Crop,
  Maximize2,
  Star,
  Wand2,
  SunMedium,
  Contrast,
  CheckCheck,
  Droplets,
  Thermometer,
  Moon,
  Plus,
  Square,
  ZoomIn,
  Target,
  Type,
  Eye,
  Ban,
  Landmark,
  Newspaper,
  Sun,
  Focus,
  RotateCw,
  FlipHorizontal2,
  Compass,
  Check,
  X,
} from 'lucide-react';
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

import {
  getSavedLogos,
  saveLogo,
  deleteSavedLogo,
} from '../utils/logoStorage';
import type { SavedLogo } from '../utils/logoStorage';

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
  onSyncFrameToAll?: () => void;
  onSyncWatermarkToAll?: () => void;
  onSaveAsDefaultAppSettings: () => void;
  totalPhotos?: number;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  photo,
  watermark,
  frame,
  onUpdateAdjustments,
  onUpdateCrop,
  onApplyPreset,
  onUpdateWatermark,
  onUpdateFrame,
  onApplySettingsToAll,
  onApplyCropToAll,
  onSyncFrameToAll,
  onSyncWatermarkToAll,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'develop' | 'crop' | 'watermark' | 'frame'>('develop');
  const [frameSubMode, setFrameSubMode] = useState<'style' | 'text'>('style');
  const [activeLightParam, setActiveLightParam] = useState<keyof ImageAdjustments>('brightness');
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [showSavePresetInput, setShowSavePresetInput] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [activeCropParam, setActiveCropParam] = useState<'straighten' | 'zoom'>('straighten');
  const [activeWmParam, setActiveWmParam] = useState<'opacity' | 'size'>('opacity');

  const [savedFrames, setSavedFrames] = useState<SavedPngFrame[]>([]);
  const [savedLogos, setSavedLogos] = useState<SavedLogo[]>([]);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const framePngInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncStorage = () => {
      setSavedFrames(getSavedPngFrames());
      setSavedLogos(getSavedLogos());
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
    shortLabel: string;
    icon: React.FC<{ size?: number; className?: string }>;
    min: number;
    max: number;
    step: number;
  }[] = [
    { key: 'brightness', label: 'Exposición', shortLabel: 'Exposición', icon: SunMedium, min: -100, max: 100, step: 1 },
    { key: 'contrast', label: 'Contraste', shortLabel: 'Contraste', icon: Contrast, min: -100, max: 100, step: 1 },
    { key: 'highlights', label: 'Altas Luces', shortLabel: 'Altas Luces', icon: Sun, min: -100, max: 100, step: 1 },
    { key: 'shadows', label: 'Sombras', shortLabel: 'Sombras', icon: Moon, min: -100, max: 100, step: 1 },
    { key: 'saturation', label: 'Saturación', shortLabel: 'Saturación', icon: Droplets, min: -100, max: 100, step: 1 },
    { key: 'warmth', label: 'Calidez', shortLabel: 'Calidez', icon: Thermometer, min: -100, max: 100, step: 1 },
    { key: 'sharpness', label: 'Nitidez', shortLabel: 'Nitidez', icon: Focus, min: 0, max: 100, step: 1 },
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const name = file.name.replace(/\.[^/.]+$/, '');
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          const updated = saveLogo(name || 'Logo', dataUrl, true);
          setSavedLogos(updated);
          onUpdateWatermark({
            type: 'image',
            imageDataUrl: dataUrl,
            enabled: true,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectSavedLogo = (l: SavedLogo) => {
    const isLineal = l.id === 'official-logo-lineal' || l.name.toLowerCase().includes('lineal');
    onUpdateWatermark({
      type: 'image',
      imageDataUrl: l.imageDataUrl,
      enabled: true,
      ...(isLineal ? { opacity: 0.75 } : {}),
    });
  };

  const handleDeleteSavedLogo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteSavedLogo(id);
    setSavedLogos(updated);
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

  const ratioList: { id: AspectRatioType; label: string; w: number; h: number }[] = [
    { id: 'original', label: 'Libre', w: 18, h: 14 },
    { id: '1:1', label: '1:1', w: 15, h: 15 },
    { id: '4:5', label: '4:5 IG', w: 13, h: 16 },
    { id: '9:16', label: '9:16 Story', w: 10, h: 17 },
    { id: '16:9', label: '16:9 Cine', w: 18, h: 10 },
    { id: '3:2', label: '3:2 Foto', w: 17, h: 12 },
    { id: '2:3', label: '2:3 Retrato', w: 12, h: 17 },
    { id: '3:4', label: '3:4 Clásico', w: 13, h: 17 },
  ];

  const hasAnyAdjustment = Object.values(photo.adjustments).some((v) => v !== 0);

  return (
    <aside className="sidebar-controls card-glass">
      {/* CONTENIDO DEL PANEL DE HERRAMIENTAS (ESTRICTO 2 FILAS EN MÓVIL — CERO SCROLL VERTICAL) */}
      <div className="sidebar-content">
        {/* ============================================================
            TAB 1: FILTROS Y PRESETS (CARRUSEL HORIZONTAL VISUAL)
           ============================================================ */}
        {activeTab === 'presets' && (
          <div className="tool-deck-panel">
            {/* FILA 1: Barra superior de acciones de Presets */}
            <div className="deck-top-row">
              {showSavePresetInput ? (
                <div className="inline-save-preset-row">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Nombre de tu filtro..."
                    className="deck-compact-input"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCustomPreset();
                    }}
                  />
                  <button type="button" onClick={handleSaveCustomPreset} className="deck-mini-btn primary">
                    <Check size={12} />
                    <span>Guardar</span>
                  </button>
                  <button type="button" onClick={() => setShowSavePresetInput(false)} className="deck-mini-btn">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="deck-row-left">
                    <Sparkles size={13} style={{ color: 'var(--color-accent)' }} />
                    <span className="deck-row-title">ESTILOS DE REVELADO</span>
                  </div>
                  <div className="deck-row-actions">
                    <button
                      type="button"
                      onClick={() => setShowSavePresetInput(true)}
                      className="deck-mini-btn accent"
                      title="Guardar tus ajustes actuales como un nuevo filtro"
                    >
                      <Plus size={12} />
                      <span>Guardar Filtro</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onApplyPreset('custom')}
                      className="deck-mini-btn"
                      title="Quitar filtro y volver a valores neutros"
                    >
                      <RotateCcw size={11} />
                      <span>Neutro</span>
                    </button>
                    <button
                      type="button"
                      onClick={onApplySettingsToAll}
                      className="deck-mini-btn sync"
                      title="Aplicar este estilo a todas las fotos del lote"
                    >
                      <CheckCheck size={12} />
                      <span>Sync Lote</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* FILA 2: Carrusel horizontal de tarjetas de filtros */}
            <div className="deck-horizontal-strip presets-strip">
              {/* Presets de Fábrica */}
              {presetsList.map((p) => {
                const IconComponent = p.icon;
                const isActive = photo.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onApplyPreset(p.id)}
                    className={`filter-strip-card ${isActive ? 'active' : ''}`}
                  >
                    <div className={`filter-strip-icon ${isActive ? 'active' : ''}`}>
                      <IconComponent size={16} />
                    </div>
                    <div className="filter-strip-text">
                      <strong>{p.label}</strong>
                      <span>{p.shortDesc}</span>
                    </div>
                  </button>
                );
              })}

              {/* Presets Personalizados del Usuario */}
              {customPresets.map((cp) => {
                const isActive = photo.preset === cp.id;
                return (
                  <div
                    key={cp.id}
                    onClick={() => onApplyPreset(cp.id, cp.adjustments)}
                    className={`filter-strip-card custom ${isActive ? 'active' : ''}`}
                  >
                    <div className={`filter-strip-icon custom ${isActive ? 'active' : ''}`}>
                      <Star size={14} fill={isActive ? '#fff' : '#f59e0b'} color={isActive ? '#fff' : '#f59e0b'} />
                    </div>
                    <div className="filter-strip-text">
                      <strong>{cp.name}</strong>
                      <span>Personalizado</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomPresets(deleteCustomPreset(cp.id));
                      }}
                      className="filter-strip-del"
                      title="Eliminar filtro"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2: AJUSTES DE LUZ Y COLOR (SLIDER COMPACTO + DIALES)
           ============================================================ */}
        {activeTab === 'develop' && (
          <div className="tool-deck-panel">
            {(() => {
              const activeParamConfig = lightParams.find((p) => p.key === activeLightParam) || lightParams[0];
              const ActiveIcon = activeParamConfig.icon;
              const activeValue = photo.adjustments[activeLightParam] ?? 0;

              return (
                <>
                  {/* FILA 1: Slider Maestro Ultracompacto + Botones Rápidos en Línea */}
                  <div className="deck-slider-box">
                    <div className="deck-slider-top">
                      <div className="deck-param-indicator">
                        <ActiveIcon size={14} className="active-param-icon" />
                        <span className="deck-param-title">{activeParamConfig.label.toUpperCase()}</span>
                        <span className={`deck-value-pill ${activeValue !== 0 ? 'modified' : ''}`}>
                          {activeValue > 0 ? `+${activeValue}` : activeValue}
                        </span>
                      </div>

                      <div className="deck-row-actions">
                        <button
                          type="button"
                          onClick={() => onApplyPreset('auto-church')}
                          className="deck-mini-btn"
                          title="Optimización automática de tono e iluminación"
                        >
                          <Wand2 size={11} style={{ color: '#38bdf8' }} />
                          <span>Auto</span>
                        </button>

                        {activeValue !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSliderChange(activeLightParam, 0)}
                            className="deck-mini-btn"
                            title="Poner este control en 0"
                          >
                            <RotateCcw size={11} />
                            <span>0</span>
                          </button>
                        )}

                        {hasAnyAdjustment && (
                          <button
                            type="button"
                            onClick={() => onApplyPreset('custom')}
                            className="deck-mini-btn"
                            title="Restablecer todos los ajustes de luz y color"
                          >
                            <RotateCcw size={11} />
                            <span>Todo</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={onApplySettingsToAll}
                          className="deck-mini-btn sync"
                          title="Sincronizar ajustes con todas las fotos"
                        >
                          <CheckCheck size={12} />
                          <span>Sync</span>
                        </button>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={activeParamConfig.min}
                      max={activeParamConfig.max}
                      step={activeParamConfig.step}
                      value={activeValue}
                      onChange={(e) => handleSliderChange(activeLightParam, Number(e.target.value))}
                      onDoubleClick={() => handleSliderChange(activeLightParam, 0)}
                      className="master-range-slider slim"
                      aria-label={activeParamConfig.label}
                    />
                  </div>

                  {/* FILA 2: Cinta Horizontal de Parámetros con Indicador Numérico */}
                  <div className="deck-horizontal-strip dials-strip">
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
                          className={`dial-pill ${isSelected ? 'active' : ''}`}
                        >
                          <div className={`dial-circle ${isSelected ? 'active' : ''} ${isModified ? 'modified' : ''}`}>
                            <Icon size={16} />
                            {isModified && (
                              <span className="dial-val-badge">{val > 0 ? `+${val}` : val}</span>
                            )}
                          </div>
                          <span className="dial-label">{p.shortLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ============================================================
            TAB 3: ENCUADRE, HORIZONTE Y PROPORCIÓN (2 FILAS SIN SCROLL)
           ============================================================ */}
        {activeTab === 'crop' && (
          <div className="tool-deck-panel">
            {/* FILA 1: Nivelar Horizonte / Zoom + Acciones Geométricas Instantáneas */}
            <div className="deck-slider-box">
              <div className="deck-slider-top">
                <div className="deck-Inline-Segmented">
                  <button
                    type="button"
                    onClick={() => setActiveCropParam('straighten')}
                    className={`seg-btn ${activeCropParam === 'straighten' ? 'active' : ''}`}
                  >
                    <Compass size={12} />
                    <span>Nivelar {photo.crop?.straighten ? `${photo.crop.straighten > 0 ? '+' : ''}${photo.crop.straighten}°` : '0°'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCropParam('zoom')}
                    className={`seg-btn ${activeCropParam === 'zoom' ? 'active' : ''}`}
                  >
                    <ZoomIn size={12} />
                    <span>Zoom {Math.round((photo.crop?.zoom || 1) * 100)}%</span>
                  </button>
                </div>

                <div className="deck-row-actions">
                  <button
                    type="button"
                    onClick={() => handleCropChange('rotation', ((photo.crop?.rotation || 0) + 90) % 360)}
                    className={`deck-mini-btn ${photo.crop?.rotation ? 'active' : ''}`}
                    title="Girar 90° a la derecha"
                  >
                    <RotateCw size={11} />
                    <span>90°</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCropChange('flipH', !photo.crop?.flipH)}
                    className={`deck-mini-btn ${photo.crop?.flipH ? 'active' : ''}`}
                    title="Voltear en espejo horizontal"
                  >
                    <FlipHorizontal2 size={11} />
                    <span>Espejo</span>
                  </button>

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
                    className="deck-mini-btn"
                    title="Restablecer encuadre completo"
                  >
                    <Target size={11} />
                    <span>Reset</span>
                  </button>

                  <button
                    type="button"
                    onClick={onApplyCropToAll || onApplySettingsToAll}
                    className="deck-mini-btn sync"
                    title="Sincronizar este encuadre y proporción con todo el lote"
                  >
                    <CheckCheck size={11} />
                    <span>Sync</span>
                  </button>
                </div>
              </div>

              <input
                type="range"
                min={activeCropParam === 'zoom' ? 1.0 : -15}
                max={activeCropParam === 'zoom' ? 2.5 : 15}
                step={activeCropParam === 'zoom' ? 0.05 : 0.5}
                value={
                  activeCropParam === 'zoom'
                    ? (photo.crop?.zoom || 1)
                    : (photo.crop?.straighten || 0)
                }
                onChange={(e) => handleCropChange(activeCropParam, Number(e.target.value))}
                onDoubleClick={() => handleCropChange(activeCropParam, activeCropParam === 'zoom' ? 1.0 : 0)}
                className="master-range-slider slim"
                aria-label={activeCropParam === 'zoom' ? 'Zoom' : 'Nivelar horizonte'}
              />
            </div>

            {/* FILA 2: Cinta Horizontal de Proporciones (Aspect Ratios) */}
            <div className="deck-horizontal-strip ratios-strip">
              {ratioList.map((r) => {
                const isSelected = (photo.crop?.aspectRatio || 'original') === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleCropChange('aspectRatio', r.id)}
                    className={`dial-pill ${isSelected ? 'active' : ''}`}
                  >
                    <div className={`dial-circle ratio-box ${isSelected ? 'active' : ''}`}>
                      <span
                        className="ratio-shape-preview"
                        style={{ width: `${r.w}px`, height: `${r.h}px` }}
                      />
                    </div>
                    <span className="dial-label">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 4: FIRMA Y MARCA DE AGUA (TODO INTEGRADO EN 2 FILAS)
           ============================================================ */}
        {activeTab === 'watermark' && (
          <div className="tool-deck-panel">
            {/* FILA 1: Estado, Tipo, Posición Esquinas y Slider Opacidad/Tamaño */}
            <div className="deck-slider-box">
              <div className="deck-slider-top">
                <div className="deck-row-left" style={{ gap: '0.3rem' }}>
                  <button
                    type="button"
                    onClick={() => onUpdateWatermark({ enabled: !watermark.enabled })}
                    className={`deck-toggle-chip ${watermark.enabled ? 'on' : 'off'}`}
                  >
                    {watermark.enabled ? '✓ Activa' : 'Off'}
                  </button>

                  {watermark.enabled && (
                    <div className="deck-Inline-Segmented">
                      <button
                        type="button"
                        onClick={() => onUpdateWatermark({ type: 'image' })}
                        className={`seg-btn ${watermark.type === 'image' ? 'active' : ''}`}
                      >
                        <ImageIcon size={11} />
                        <span>Logo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateWatermark({ type: 'text' })}
                        className={`seg-btn ${watermark.type === 'text' ? 'active' : ''}`}
                      >
                        <Type size={11} />
                        <span>Texto</span>
                      </button>
                    </div>
                  )}
                </div>

                {watermark.enabled && (
                  <div className="deck-pos-group">
                    {[
                      { id: 'top-left', label: '↖' },
                      { id: 'top-right', label: '↗' },
                      { id: 'center', label: '•' },
                      { id: 'bottom-left', label: '↙' },
                      { id: 'bottom-right', label: '↘' },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => onUpdateWatermark({ position: pos.id as any })}
                        className={`pos-dot-btn ${watermark.position === pos.id ? 'active' : ''}`}
                        title={`Posición: ${pos.id}`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="deck-row-actions">
                  <button
                    type="button"
                    onClick={onSyncWatermarkToAll || onApplySettingsToAll}
                    className="deck-mini-btn sync"
                    title="Sincronizar firma con todas las fotos"
                  >
                    <CheckCheck size={11} />
                    <span>Sync</span>
                  </button>
                </div>
              </div>

              {watermark.enabled && (
                <div className="deck-inline-slider-row">
                  <button
                    type="button"
                    onClick={() => setActiveWmParam((prev) => (prev === 'opacity' ? 'size' : 'opacity'))}
                    className="deck-param-switch-pill"
                    title="Toca para alternar entre Opacidad y Tamaño"
                  >
                    {activeWmParam === 'opacity' ? <Eye size={11} /> : <Maximize2 size={11} />}
                    <span>
                      {activeWmParam === 'opacity'
                        ? `Opacidad ${Math.round(watermark.opacity * 100)}%`
                        : `Tamaño ${watermark.size}%`}
                    </span>
                  </button>

                  <input
                    type="range"
                    min={activeWmParam === 'opacity' ? 0.1 : 10}
                    max={activeWmParam === 'opacity' ? 1.0 : 60}
                    step={activeWmParam === 'opacity' ? 0.05 : 1}
                    value={activeWmParam === 'opacity' ? watermark.opacity : watermark.size}
                    onChange={(e) => {
                      if (activeWmParam === 'opacity') onUpdateWatermark({ opacity: Number(e.target.value) });
                      if (activeWmParam === 'size') onUpdateWatermark({ size: Number(e.target.value) });
                    }}
                    className="master-range-slider slim"
                  />
                </div>
              )}
            </div>

            {/* FILA 2: Selector de Logos PNG o Editor de Texto de Firma */}
            {watermark.enabled && watermark.type === 'image' && (
              <div className="deck-horizontal-strip logos-strip">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/svg+xml"
                  onChange={handleLogoUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="compact-asset-tile upload"
                  title="Subir nuevo logo PNG"
                >
                  <Upload size={14} />
                  <span>+ Logo</span>
                </button>

                {savedLogos.map((l) => {
                  const isSelected = watermark.imageDataUrl === l.imageDataUrl;
                  return (
                    <div
                      key={l.id}
                      onClick={() => handleSelectSavedLogo(l)}
                      className={`compact-asset-tile ${isSelected ? 'active' : ''}`}
                      title={l.name}
                    >
                      <img src={l.imageDataUrl} alt={l.name} className="compact-asset-img" />
                      <span className="compact-asset-name">{l.isOfficial ? 'Oficial' : l.name.slice(0, 8)}</span>
                      {!l.isOfficial && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedLogo(l.id, e)}
                          className="compact-asset-del"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {watermark.enabled && watermark.type === 'text' && (
              <div className="deck-text-signature-row">
                <div className="deck-text-input-line">
                  <input
                    type="text"
                    value={watermark.text || ''}
                    onChange={(e) => onUpdateWatermark({ text: e.target.value })}
                    placeholder="Texto de firma..."
                    className="deck-compact-input"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateWatermark({ color: '#ffffff' })}
                    className={`color-pill-btn ${watermark.color === '#ffffff' ? 'active' : ''}`}
                    style={{ background: '#ffffff', width: '1.35rem', height: '1.35rem', flexShrink: 0 }}
                    title="Blanco"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateWatermark({ color: '#d4af37' })}
                    className={`color-pill-btn ${watermark.color === '#d4af37' ? 'active' : ''}`}
                    style={{ background: '#d4af37', width: '1.35rem', height: '1.35rem', flexShrink: 0 }}
                    title="Oro"
                  />
                </div>
                <div className="deck-horizontal-strip chips-strip">
                  {['BereaSnap Oficial', 'Berea Prensa & Crónica', 'Berea Fotografía'].map((pt) => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => onUpdateWatermark({ text: pt })}
                      className={`quick-chip-btn ${watermark.text === pt ? 'active' : ''}`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 5: MARCOS INSTITUCIONALES Y DINÁMICOS (2 FILAS SIN SCROLL)
           ============================================================ */}
        {activeTab === 'frame' && (
          <div className="tool-deck-panel">
            <input
              ref={framePngInputRef}
              type="file"
              accept="image/png"
              onChange={handleFramePngUpload}
              style={{ display: 'none' }}
            />

            {/* MODO PLANTILLA DE MARCO */}
            {(frame.style === 'none' || frameSubMode === 'style') && (
              <>
                {/* FILA 1: Controles Contextuales del Marco Activo */}
                <div className="deck-slider-box">
                  <div className="deck-slider-top">
                    <div className="deck-row-left">
                      <FrameIcon size={13} style={{ color: 'var(--color-accent)' }} />
                      <span className="deck-row-title">
                        {frame.style === 'none' ? 'ELIGE UN MARCO' : 'MARCO ACTIVO'}
                      </span>
                    </div>

                    <div className="deck-row-actions">
                      {frame.style !== 'none' && (
                        <button
                          type="button"
                          onClick={() => setFrameSubMode('text')}
                          className="deck-mini-btn accent"
                          title="Personalizar título del evento, fecha o tamaño de letra"
                        >
                          <Type size={11} />
                          <span>Texto: {(frame.eventTitle || 'Editar').slice(0, 14)}</span>
                        </button>
                      )}

                      {frame.style === 'custom-png' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateFrame({
                                dynamicTextColorStyle: frame.dynamicTextColorStyle === 'white' ? 'gold' : 'white',
                              })
                            }
                            className="deck-mini-btn"
                            title="Alternar color de letra entre Oro Imperial y Blanco"
                          >
                            <span
                              className="color-dot"
                              style={{
                                width: 9,
                                height: 9,
                                borderRadius: '50%',
                                background: frame.dynamicTextColorStyle === 'white' ? '#fff' : '#fbbf24',
                              }}
                            />
                            <span>{frame.dynamicTextColorStyle === 'white' ? 'Blanco' : 'Oro'}</span>
                          </button>
                        </>
                      )}

                      {(frame.style === 'fine-gallery' || frame.style === 'editorial') && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateFrame(
                              frame.borderColor === '#ffffff'
                                ? { borderColor: '#0a0f1d', textColor: '#ffffff' }
                                : { borderColor: '#ffffff', textColor: '#0f172a' }
                            )
                          }
                          className="deck-mini-btn"
                        >
                          <span>{frame.borderColor === '#ffffff' ? 'Fondo Blanco' : 'Fondo Oscuro'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={onSyncFrameToAll || onApplySettingsToAll}
                        className="deck-mini-btn sync"
                        title="Sincronizar marco en todas las fotos del lote"
                      >
                        <CheckCheck size={11} />
                        <span>Sync</span>
                      </button>
                    </div>
                  </div>

                  {/* Slider contextual: Escala de texto en PNG o Grosor de borde en Marcos Digitales */}
                  {frame.style === 'custom-png' && (
                    <div className="deck-inline-slider-row">
                      <span className="deck-inline-label">Letra {frame.dynamicTextScale || 100}%</span>
                      <input
                        type="range"
                        min="75"
                        max="135"
                        step="5"
                        value={frame.dynamicTextScale || 100}
                        onChange={(e) => onUpdateFrame({ dynamicTextScale: Number(e.target.value) })}
                        onDoubleClick={() => onUpdateFrame({ dynamicTextScale: 100 })}
                        className="master-range-slider slim"
                      />
                    </div>
                  )}

                  {frame.style !== 'none' && frame.style !== 'custom-png' && (
                    <div className="deck-inline-slider-row">
                      <span className="deck-inline-label">Borde {frame.borderTop || 24}px</span>
                      <input
                        type="range"
                        min="8"
                        max="70"
                        step="2"
                        value={frame.borderTop || 24}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          onUpdateFrame({ borderTop: val, borderBottom: val, borderLeft: val, borderRight: val });
                        }}
                        className="master-range-slider slim"
                      />
                    </div>
                  )}
                </div>

                {/* FILA 2: Carrusel Unificado de Marcos (Sin Marco + Subir PNG + Marcos PNG + Marcos Digitales) */}
                <div className="deck-horizontal-strip logos-strip">
                  {/* 1. Sin Marco */}
                  <button
                    type="button"
                    onClick={() => onUpdateFrame({ style: 'none' })}
                    className={`compact-asset-tile ${frame.style === 'none' ? 'active' : ''}`}
                  >
                    <Ban size={16} />
                    <span className="compact-asset-name">Ninguno</span>
                  </button>

                  {/* 2. Subir PNG */}
                  <button
                    type="button"
                    onClick={() => framePngInputRef.current?.click()}
                    className="compact-asset-tile upload"
                    title="Importar marco PNG transparente desde tu teléfono"
                  >
                    <Upload size={14} />
                    <span className="compact-asset-name">+ PNG</span>
                  </button>

                  {/* 3. Marcos PNG Oficiales y Guardados */}
                  {savedFrames.map((f) => {
                    const isSelected = frame.style === 'custom-png' && frame.pngDataUrl === f.pngDataUrl;
                    return (
                      <div
                        key={f.id}
                        onClick={() => handleSelectSavedFrame(f)}
                        className={`compact-asset-tile ${isSelected ? 'active' : ''}`}
                        title={f.name}
                      >
                        <img src={f.pngDataUrl} alt={f.name} className="compact-asset-img" />
                        <span className="compact-asset-name">{f.name.replace('Centenario ', 'Cent. ').slice(0, 10)}</span>
                        {f.isDynamic && <span className="param-modified-dot" />}
                        {!f.id.includes('official') && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedFrame(f.id, e)}
                            className="compact-asset-del"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* 4. Marcos Digitales Clásicos */}
                  {[
                    { id: 'fine-gallery', label: 'Galería', icon: Landmark },
                    { id: 'editorial', label: 'Editorial', icon: Newspaper },
                    { id: 'gold-accent', label: 'Filo Oro', icon: Sparkles },
                    { id: 'polaroid-card', label: 'Polaroid', icon: Square },
                  ].map((st) => {
                    const Icon = st.icon;
                    const isSelected = frame.style === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onUpdateFrame({ style: st.id as any })}
                        className={`compact-asset-tile ${isSelected ? 'active' : ''}`}
                      >
                        <Icon size={16} />
                        <span className="compact-asset-name">{st.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* MODO EDICIÓN DE TEXTO DEL EVENTO EN EL MARCO */}
            {frame.style !== 'none' && frameSubMode === 'text' && (
              <>
                {/* FILA 1: Inputs de Título y Texto Secundario + Botón Volver */}
                <div className="deck-slider-box">
                  <div className="deck-text-input-line">
                    <button
                      type="button"
                      onClick={() => setFrameSubMode('style')}
                      className="deck-mini-btn"
                      title="Volver a la selección de marcos"
                    >
                      <span>← Marcos</span>
                    </button>

                    <input
                      type="text"
                      value={frame.eventTitle || ''}
                      onChange={(e) => onUpdateFrame({ eventTitle: e.target.value, dynamicTextEnabled: true })}
                      placeholder="Título (Ej. Escuela Dominical)"
                      className="deck-compact-input"
                    />

                    <input
                      type="text"
                      value={frame.dynamicTextRight || ''}
                      onChange={(e) => onUpdateFrame({ dynamicTextRight: e.target.value, dynamicTextEnabled: true })}
                      placeholder="Fecha / Lugar (Opcional)"
                      className="deck-compact-input secondary"
                    />

                    <button
                      type="button"
                      onClick={() => onUpdateFrame({ dynamicTextEnabled: !(frame.dynamicTextEnabled ?? true) })}
                      className={`deck-toggle-chip ${(frame.dynamicTextEnabled ?? true) ? 'on' : 'off'}`}
                    >
                      {(frame.dynamicTextEnabled ?? true) ? '✓' : 'Off'}
                    </button>

                    <button
                      type="button"
                      onClick={onSyncFrameToAll || onApplySettingsToAll}
                      className="deck-mini-btn sync"
                      title="Sincronizar este texto de marco con todo el lote"
                    >
                      <CheckCheck size={11} />
                      <span>Sync</span>
                    </button>
                  </div>
                </div>

                {/* FILA 2: Chips Rápidos de Eventos Institucionales Deslizables */}
                <div className="deck-horizontal-strip chips-strip">
                  {[
                    'Escuela Dominical',
                    'Oración de 7:00 PM',
                    'Servicio de Doctrina',
                    'Culto de Jóvenes',
                    'Consagración',
                    'Estudio Bíblico',
                    'Bautismos',
                    'Santa Cena',
                    'Servicio Especial',
                  ].map((ev) => {
                    const isEvActive = (frame.eventTitle || '').trim().toLowerCase() === ev.toLowerCase();
                    return (
                      <button
                        key={ev}
                        type="button"
                        onClick={() => onUpdateFrame({ eventTitle: ev, dynamicTextEnabled: true })}
                        className={`quick-chip-btn ${isEvActive ? 'active' : ''}`}
                      >
                        {ev}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* BARRA INFERIOR DE NAVEGACIÓN DE 5 PESTAÑAS (ESTILO DARKROOM / LIGHTROOM MOBILE) */}
      <div className="sidebar-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`sidebar-tab ${activeTab === 'presets' ? 'active' : ''}`}
        >
          <Wand2 size={15} />
          <span>Filtros</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('develop')}
          className={`sidebar-tab ${activeTab === 'develop' ? 'active' : ''}`}
        >
          <SlidersHorizontal size={15} />
          <span>Ajustes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('crop')}
          className={`sidebar-tab ${activeTab === 'crop' ? 'active' : ''}`}
        >
          <Crop size={15} />
          <span>Encuadre</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('watermark')}
          className={`sidebar-tab ${activeTab === 'watermark' ? 'active' : ''}`}
        >
          <ImageIcon size={15} />
          <span>Firma</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('frame')}
          className={`sidebar-tab ${activeTab === 'frame' ? 'active' : ''}`}
        >
          <FrameIcon size={15} />
          <span>Marcos</span>
        </button>
      </div>
    </aside>
  );
};
