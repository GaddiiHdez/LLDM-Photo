import React, { useState, useRef, useEffect } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  Image as ImageIcon,
  Frame,
  Upload,
  RotateCcw,
  Palette,
  Layers,
  Crop,
  Maximize2,
  Smartphone,
  Square,
  Monitor,
  Bookmark,
  Trash2,
  Star,
  FolderHeart,
  Wand2,
  SunMedium,
  Contrast,
  Calendar,
  CheckCheck,
  Droplets,
  Thermometer,
  Moon,
  Plus,
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
  WatermarkPosition,
  FrameStyle,
  AspectRatioType,
} from '../types/editor';

import {
  getSavedPngFrames,
  savePngFrame,
  deleteSavedPngFrame,
  setDefaultPngFrame,
} from '../utils/frameStorage';
import type { SavedPngFrame } from '../utils/frameStorage';

import {
  getSavedLogos,
  saveLogo,
  deleteSavedLogo,
  setDefaultLogo,
} from '../utils/logoStorage';
import type { SavedLogo } from '../utils/logoStorage';

interface SidebarControlsProps {
  photo: PhotoItem;
  watermark: WatermarkSettings;
  frame: FrameSettings;
  onUpdateAdjustments: (adjustments: ImageAdjustments) => void;
  onUpdateCrop: (crop: CropSettings) => void;
  onApplyPreset: (preset: PresetType, customAdjustments?: ImageAdjustments) => void;
  onUpdateWatermark: (watermark: Partial<WatermarkSettings>) => void;
  onUpdateFrame: (frame: Partial<FrameSettings>) => void;
  onApplySettingsToAll: () => void;
  onSaveAsDefaultAppSettings: () => void;
  totalPhotos?: number;
  onToggleFilmstrip?: () => void;
  isFilmstripCollapsed?: boolean;
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
  onSaveAsDefaultAppSettings,
  totalPhotos,
  onToggleFilmstrip,
  isFilmstripCollapsed,
}) => {
  const [activeTab, setActiveTab] = useState<'develop' | 'crop' | 'watermark' | 'frame'>('develop');
  const [developSubMode, setDevelopSubMode] = useState<'manual' | 'presets'>('manual');
  const [activeLightParam, setActiveLightParam] = useState<keyof ImageAdjustments>('contrast');
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [showSavePresetModal, setShowSavePresetModal] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [savePresetToast, setSavePresetToast] = useState<string | null>(null);

  const [savedFrames, setSavedFrames] = useState<SavedPngFrame[]>([]);
  const [savedLogos, setSavedLogos] = useState<SavedLogo[]>([]);
  const [savedDefaultToast, setSavedDefaultToast] = useState<boolean>(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const framePngInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedFrames(getSavedPngFrames());
    setSavedLogos(getSavedLogos());
    setCustomPresets(getCustomPresets());
  }, []);

  const handleSaveCustomPreset = () => {
    if (!newPresetName.trim()) return;
    const updated = saveCustomPreset(newPresetName, photo.adjustments);
    setCustomPresets(updated);
    const createdId = updated[0]?.id || 'custom';
    onApplyPreset(createdId, photo.adjustments);
    setNewPresetName('');
    setShowSavePresetModal(false);
    setSavePresetToast('¡Preset guardado!');
    setTimeout(() => setSavePresetToast(null), 2500);
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
    { key: 'saturation', label: 'Saturación', icon: Droplets, min: -100, max: 100, step: 1 },
    { key: 'warmth', label: 'Calidez', icon: Thermometer, min: -100, max: 100, step: 1 },
    { key: 'shadows', label: 'Sombras', icon: Moon, min: -100, max: 100, step: 1 },
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
          // Guardar automáticamente en el catálogo persistente
          const updated = saveLogo(name || 'Logo de la Iglesia', dataUrl, true);
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

  const handleSetDefaultLogo = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = setDefaultLogo(id);
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
          const updated = savePngFrame(fileName || 'Marco de la Iglesia', dataUrl, true);
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
    });
  };

  const handleDeleteSavedFrame = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteSavedPngFrame(id);
    setSavedFrames(updated);
  };

  const handleSetDefaultFrame = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = setDefaultPngFrame(id);
    setSavedFrames(updated);
  };

  const handleSaveCurrentDefault = () => {
    onSaveAsDefaultAppSettings();
    setSavedDefaultToast(true);
    setTimeout(() => setSavedDefaultToast(false), 2500);
  };

  const presetsList: { id: PresetType; label: string; icon: React.FC<{ size?: number; className?: string }>; desc: string }[] = [
    {
      id: 'auto-church',
      label: 'Auto Enhance',
      icon: Wand2,
      desc: 'Optimización inteligente de balance de blancos, sombras y rango dinámico',
    },
    {
      id: 'warm-worship',
      label: 'Warm Light',
      icon: SunMedium,
      desc: 'Atmósfera dorada envolvente, ideal para retratos y cultos de adoración',
    },
    {
      id: 'vibrant-praise',
      label: 'Vivid Stage',
      icon: Sparkles,
      desc: 'Colores vivos, micro-contraste y saturación selectiva para eventos',
    },
    {
      id: 'elegant-bw',
      label: 'Classic Monochrome',
      icon: Contrast,
      desc: 'Blanco y negro cinematográfico con transiciones tonales ricas',
    },
  ];

  const isPhotoVertical = photo ? photo.height > photo.width : false;
  const aspectRatios: { id: AspectRatioType; label: string; icon: any; desc: string; badge: string }[] = [
    {
      id: 'original',
      label: `Original de Cámara (${isPhotoVertical ? 'Vertical' : 'Horizontal'})`,
      icon: Maximize2,
      desc: `${photo?.width || 6000} × ${photo?.height || 4000} px · Sin Recorte`,
      badge: 'NATIVO',
    },
    { id: '1:1', label: 'Cuadrado (1:1)', icon: Square, desc: 'Feed de Instagram / Portada', badge: '1:1' },
    { id: '4:5', label: 'Vertical Post (4:5)', icon: Smartphone, desc: 'Publicación Vertical IG', badge: '4:5' },
    { id: '9:16', label: 'Historia Vertical (9:16)', icon: Smartphone, desc: 'Reels / Stories / TikTok', badge: '9:16' },
    { id: '16:9', label: 'Panorámico (16:9)', icon: Monitor, desc: 'Pantalla Completa / YouTube', badge: '16:9' },
    { id: '3:4', label: 'Retrato Clásico (3:4)', icon: Crop, desc: 'Fotografía Editorial', badge: '3:4' },
    { id: '3:2', label: 'Horizontal Clásico (3:2)', icon: Maximize2, desc: 'Estándar Paisaje', badge: '3:2' },
    { id: '2:3', label: 'Vertical Clásico (2:3)', icon: Smartphone, desc: 'Estándar Retrato', badge: '2:3' },
  ];

  return (
    <aside className="sidebar-controls card-glass">
      {/* Control Tabs Header (Dock de Navegación) */}
      <div className="sidebar-tabs">
        <button
          onClick={() => setActiveTab('develop')}
          className={`sidebar-tab ${activeTab === 'develop' ? 'active' : ''}`}
          title="Revelado: Presets y Ajustes Manuales de Luz"
        >
          <Sparkles size={15} />
          <span>Revelado</span>
        </button>

        <button
          onClick={() => setActiveTab('crop')}
          className={`sidebar-tab ${activeTab === 'crop' ? 'active' : ''}`}
          title="Relación de aspecto y encuadre"
        >
          <Crop size={15} />
          <span>Encuadre</span>
        </button>

        <button
          onClick={() => setActiveTab('watermark')}
          className={`sidebar-tab ${activeTab === 'watermark' ? 'active' : ''}`}
          title="Marca de agua y logotipo institucional"
        >
          <ImageIcon size={15} />
          <span>Firma</span>
        </button>

        <button
          onClick={() => setActiveTab('frame')}
          className={`sidebar-tab ${activeTab === 'frame' ? 'active' : ''}`}
          title="Marcos institucionales y de eventos"
        >
          <Frame size={15} />
          <span>Marcos</span>
        </button>

        {onToggleFilmstrip && (
          <button
            onClick={onToggleFilmstrip}
            className={`sidebar-tab tab-session ${!isFilmstripCollapsed ? 'active' : ''}`}
            title="Ver o gestionar tira de fotos de la sesión"
          >
            <Bookmark size={15} />
            <span>Sesión {totalPhotos ? `(${totalPhotos})` : ''}</span>
          </button>
        )}
      </div>

      {/* Barra de Sincronización de Sesión Minimalista */}
      <div className="session-sync-bar">
        <button
          onClick={onApplySettingsToAll}
          className="sync-pill-btn"
          title="Copiar los ajustes actuales a todas las fotos del lote"
        >
          <CheckCheck size={13} style={{ color: 'var(--color-brand-light)' }} />
          <span>Sincronizar Lote</span>
        </button>

        <button
          onClick={() => setShowSavePresetModal((prev) => !prev)}
          className="default-pill-btn"
          title="Guardar estos ajustes como un nuevo preset personalizado"
        >
          <Plus size={13} />
          <span>Guardar Preset</span>
        </button>

        <button
          onClick={handleSaveCurrentDefault}
          className={`default-pill-btn ${savedDefaultToast ? 'saved' : ''}`}
          title="Guardar esta configuración como inicio predeterminado global"
          style={{ display: 'none' }}
        >
          <Bookmark size={13} />
          <span>Predeterminar</span>
        </button>
      </div>

      <div className="sidebar-content">
        {/* TAB UNIFICADO: REVELADO (PRESETS + AJUSTES MANUALES ESTILO SNAPSEED / LIGHTROOM) */}
        {activeTab === 'develop' && (
          <div className="control-section develop-section">
            {/* Modal / Card para Guardar Preset Personalizado */}
            {showSavePresetModal && (
              <div className="save-preset-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <strong style={{ fontSize: '0.78rem', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Star size={13} fill="var(--color-accent)" />
                    Guardar Preset de Revelado
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Guarda en tu navegador</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Ej. Retrato Cálido Culto..."
                    className="form-input"
                    style={{ flex: 1, padding: '0.42rem 0.65rem', fontSize: '0.78rem' }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCustomPreset();
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomPreset}
                    className="btn-primary"
                    style={{ padding: '0.42rem 0.75rem', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSavePresetModal(false)}
                    className="btn-secondary"
                    style={{ padding: '0.42rem 0.55rem', fontSize: '0.75rem' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {savePresetToast && (
              <div className="preset-toast-badge">
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <span>{savePresetToast}</span>
              </div>
            )}

            {/* Selector de Sub-modo: Ajustes Manuales vs Presets */}
            <div className="develop-mode-pills">
              <button
                type="button"
                onClick={() => setDevelopSubMode('manual')}
                className={`develop-mode-btn ${developSubMode === 'manual' ? 'active' : ''}`}
              >
                <SlidersHorizontal size={13} />
                <span>Ajustes Manuales</span>
              </button>

              <button
                type="button"
                onClick={() => setDevelopSubMode('presets')}
                className={`develop-mode-btn ${developSubMode === 'presets' ? 'active' : ''}`}
              >
                <Wand2 size={13} />
                <span>Presets ({presetsList.length + customPresets.length})</span>
              </button>
            </div>

            {/* MODO 1: AJUSTES MANUALES (VISTA 1: SLIDER MAESTRO ACTIVO + CINTA DE PARÁMETROS) */}
            {developSubMode === 'manual' && (
              <div className="manual-develop-container">
                {(() => {
                  const activeParamConfig = lightParams.find((p) => p.key === activeLightParam) || lightParams[1];
                  const ActiveIcon = activeParamConfig.icon;
                  const activeValue = photo.adjustments[activeLightParam] ?? 0;

                  return (
                    <div className="master-slider-card">
                      <div className="master-slider-header">
                        <div className="slider-label-group">
                          <ActiveIcon size={15} className="active-param-icon" />
                          <span className="slider-param-name">{activeParamConfig.label.toUpperCase()}</span>
                        </div>

                        <div className="slider-value-bubble">
                          <span>{activeValue > 0 ? `+${activeValue}` : activeValue}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSliderChange(activeLightParam, 0)}
                          className="slider-reset-action"
                          title="Restablecer este parámetro a 0"
                        >
                          <span>Reiniciar</span>
                          <RotateCcw size={11} />
                        </button>
                      </div>

                      <div className="master-slider-track-wrap">
                        <input
                          type="range"
                          min={activeParamConfig.min}
                          max={activeParamConfig.max}
                          step={activeParamConfig.step}
                          value={activeValue}
                          onChange={(e) => handleSliderChange(activeLightParam, Number(e.target.value))}
                          className="master-range-slider"
                        />
                        <div className="master-slider-ticks">
                          <span className="tick-side">-100</span>
                          <span className="tick-center">0</span>
                          <span className="tick-side">+100</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* CINTA DE PARÁMETROS CON ICONOS (VISTA 1) */}
                <div className="param-icons-carousel">
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
                        className={`param-icon-pill ${isSelected ? 'active' : ''}`}
                      >
                        <div className={`param-icon-circle ${isSelected ? 'active' : ''}`}>
                          <Icon size={18} />
                          {isModified && <span className="param-modified-dot" />}
                        </div>
                        <span className="param-icon-name">{p.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* ACCIONES RÁPIDAS EN DESARROLLO MANUAL */}
                <div className="develop-quick-actions">
                  <button
                    type="button"
                    onClick={() => onApplyPreset('auto-church')}
                    className="btn-secondary develop-action-btn"
                    title="Calcular y aplicar balance tonal óptimo automáticamente"
                  >
                    <Wand2 size={13} style={{ color: '#38bdf8' }} />
                    <span>Auto-Tono</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSavePresetModal(true)}
                    className="btn-secondary develop-action-btn"
                    title="Guardar ajuste actual como preset personalizado"
                  >
                    <Star size={13} style={{ color: '#f59e0b' }} />
                    <span>Guardar Preset</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onApplyPreset('custom')}
                    className="btn-secondary develop-action-btn"
                    title="Restablecer todos los sliders a neutro"
                  >
                    <RotateCcw size={13} />
                    <span>Restablecer</span>
                  </button>
                </div>
              </div>
            )}

            {/* MODO 2: PRESETS (PREAJUSTES DE FÁBRICA + PRESETS PROPIOS) */}
            {developSubMode === 'presets' && (
              <div className="presets-develop-container">
                {/* PRESETS PROPIOS DEL USUARIO */}
                {customPresets.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ★ Mis Presets Guardados ({customPresets.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSavePresetModal(true)}
                        className="btn-secondary btn-sm"
                        style={{ fontSize: '0.68rem', padding: '0.18rem 0.5rem' }}
                      >
                        <Plus size={11} />
                        <span>Nuevo</span>
                      </button>
                    </div>

                    <div className="preset-grid">
                      {customPresets.map((cp) => {
                        const isActive = photo.preset === cp.id;
                        return (
                          <div
                            key={cp.id}
                            onClick={() => onApplyPreset(cp.id, cp.adjustments)}
                            className={`preset-card user-preset ${isActive ? 'active' : ''}`}
                          >
                            <div className={`preset-icon-wrapper user-preset ${isActive ? 'active' : ''}`}>
                              <Star size={16} fill={isActive ? '#ffffff' : '#f59e0b'} color={isActive ? '#ffffff' : '#f59e0b'} />
                            </div>
                            <div className="preset-info">
                              <strong className="preset-name">{cp.name}</strong>
                              <span className="preset-desc" style={{ color: 'var(--text-muted)' }}>Mío · {cp.createdAt}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = deleteCustomPreset(cp.id);
                                setCustomPresets(updated);
                              }}
                              className="delete-preset-btn"
                              title="Eliminar preset personalizado"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PRESETS DE FÁBRICA */}
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.45rem' }}>
                  Filtros de Revelado LLDM
                </span>

                <div className="preset-grid">
                  {presetsList.map((p) => {
                    const IconComponent = p.icon;
                    const isActive = photo.preset === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => onApplyPreset(p.id)}
                        className={`preset-card ${isActive ? 'active' : ''}`}
                      >
                        <div className={`preset-icon-wrapper ${isActive ? 'active' : ''}`}>
                          <IconComponent size={18} />
                        </div>
                        <div className="preset-info">
                          <strong className="preset-name">{p.label}</strong>
                          <span className="preset-desc">{p.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => onApplyPreset('custom')}
                  className="btn-secondary btn-block"
                  style={{ marginTop: '0.85rem' }}
                >
                  <RotateCcw size={14} />
                  <span>Restablecer Ajustes Originales</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FORMATO / RECORTE Y ENCUADRE PROFESIONAL */}
        {activeTab === 'crop' && (
          <div className="control-section">
            <h3 className="section-title">Encuadre & Relación de Aspecto</h3>
            <p className="section-desc">Recorta y encuadra sin deformar la foto original</p>

            {/* Detector de Orientación Automático */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.6rem 0.8rem',
                background: 'var(--bg-subcard)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>SENSOR DETECTADO</span>
                <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  {isPhotoVertical ? 'Vertical (Retrato)' : 'Horizontal (Paisaje)'} · {photo?.width || 6000}×{photo?.height || 4000}
                </strong>
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: 'var(--color-brand-light)',
                  background: 'rgba(59, 130, 246, 0.15)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '0.3rem',
                }}
              >
                CÁMARA REAL
              </span>
            </div>

            <div className="form-group">
              <label>Selecciona el Formato de Salida:</label>
              <div className="preset-grid">
                {aspectRatios.map((ar) => {
                  const Icon = ar.icon;
                  const isActive = photo.crop?.aspectRatio === ar.id;
                  return (
                    <button
                      key={ar.id}
                      onClick={() => handleCropChange('aspectRatio', ar.id)}
                      className={`preset-card ${isActive ? 'active' : ''}`}
                    >
                      <div className={`preset-icon-wrapper ${isActive ? 'active' : ''}`}>
                        <Icon size={18} />
                      </div>
                      <div className="preset-info" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong className="preset-name">{ar.label}</strong>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontFamily: 'var(--font-mono)',
                              color: isActive ? 'var(--color-brand-light)' : 'var(--text-muted)',
                              fontWeight: 700,
                            }}
                          >
                            {ar.badge}
                          </span>
                        </div>
                        <span className="preset-desc">{ar.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="control-subcard">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  Ajuste Fino de Posición
                </strong>
                <button
                  type="button"
                  onClick={() => {
                    handleCropChange('offsetX', 0);
                    handleCropChange('offsetY', 0);
                    handleCropChange('zoom', 1.0);
                  }}
                  className="btn-secondary btn-sm"
                  style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}
                  title="Restablecer encuadre al centro"
                >
                  <RotateCcw size={11} />
                  <span>Centrar</span>
                </button>
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <label>Desplazamiento Horizontal (X)</label>
                  <span>{photo.crop?.offsetX || 0}%</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={photo.crop?.offsetX || 0}
                  onChange={(e) => handleCropChange('offsetX', Number(e.target.value))}
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <label>Desplazamiento Vertical (Y)</label>
                  <span>{photo.crop?.offsetY || 0}%</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={photo.crop?.offsetY || 0}
                  onChange={(e) => handleCropChange('offsetY', Number(e.target.value))}
                />
              </div>

              <div className="slider-group" style={{ marginBottom: 0 }}>
                <div className="slider-header">
                  <label>Acercamiento / Escala (Zoom)</label>
                  <span>{((photo.crop?.zoom || 1) * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  value={photo.crop?.zoom || 1}
                  onChange={(e) => handleCropChange('zoom', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MARCA DE AGUA, LOGOS Y CATÁLOGO PERSISTENTE */}
        {activeTab === 'watermark' && (
          <div className="control-section">
            <div className="toggle-header">
              <h3 className="section-title" style={{ margin: 0 }}>Marca de Agua & Logos</h3>
              <input
                type="checkbox"
                checked={watermark.enabled}
                onChange={(e) => onUpdateWatermark({ enabled: e.target.checked })}
                className="toggle-checkbox"
              />
            </div>

            {watermark.enabled && (
              <>
                <div className="radio-group" style={{ marginTop: '0.85rem' }}>
                  <label className={`radio-label ${watermark.type === 'text' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="wmType"
                      checked={watermark.type === 'text'}
                      onChange={() => onUpdateWatermark({ type: 'text' })}
                    />
                    <span>Texto</span>
                  </label>

                  <label className={`radio-label ${watermark.type === 'image' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="wmType"
                      checked={watermark.type === 'image'}
                      onChange={() => onUpdateWatermark({ type: 'image' })}
                    />
                    <span>Catálogo de Logos PNG</span>
                  </label>
                </div>

                {watermark.type === 'text' ? (
                  <div className="form-group" style={{ marginTop: '0.85rem' }}>
                    <label>Texto de la Marca de Agua:</label>
                    <input
                      type="text"
                      value={watermark.text || ''}
                      onChange={(e) => onUpdateWatermark({ text: e.target.value })}
                      placeholder="Ej. LLDM App • Fotografía"
                      className="form-input"
                    />

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.72rem' }}>Color Texto:</label>
                        <input
                          type="color"
                          value={watermark.color || '#ffffff'}
                          onChange={(e) => onUpdateWatermark({ color: e.target.value })}
                          style={{ width: '100%', height: '2rem', borderRadius: '0.3rem', cursor: 'pointer', border: 'none' }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="form-group" style={{ marginTop: '0.85rem' }}>
                    {/* CATÁLOGO DE LOGOS GUARDADOS */}
                    <div className="control-subcard" style={{ marginTop: 0 }}>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                        <FolderHeart size={15} style={{ display: 'inline', marginRight: '4px', color: 'var(--color-brand)' }} />
                        Catálogo de Logos PNG Guardados ({savedLogos.length})
                      </strong>

                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/svg+xml"
                        onChange={handleLogoUpload}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        className="btn-secondary btn-block"
                        style={{ marginBottom: '0.75rem', fontSize: '0.78rem' }}
                      >
                        <Upload size={14} />
                        <span>Subir y Guardar Nuevo Logo PNG</span>
                      </button>

                      {savedLogos.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {savedLogos.map((l) => {
                            const isSelected = watermark.type === 'image' && watermark.imageDataUrl === l.imageDataUrl;
                            return (
                              <div
                                key={l.id}
                                onClick={() => handleSelectSavedLogo(l)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.5rem 0.65rem',
                                  borderRadius: '0.375rem',
                                  background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-surface)',
                                  border: `1px solid ${isSelected ? 'var(--color-brand)' : 'var(--border-color)'}`,
                                  cursor: 'pointer',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <img
                                    src={l.imageDataUrl}
                                    alt={l.name}
                                    style={{ width: '2.2rem', height: '2.2rem', objectFit: 'contain', background: '#0a0f1d', borderRadius: '0.25rem', padding: '2px', border: '1px solid rgba(255,255,255,0.08)' }}
                                  />
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                                        {l.name}
                                      </span>
                                      {l.isOfficial && (
                                        <span style={{ fontSize: '0.58rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '0.05rem 0.35rem', borderRadius: '9999px', fontWeight: 700 }}>
                                          OFICIAL
                                        </span>
                                      )}
                                    </div>
                                    {l.isDefault && (
                                      <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700 }}>★ FIRMA POR DEFECTO</span>
                                    )}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <button
                                    onClick={(e) => handleSetDefaultLogo(l.id, e)}
                                    style={{ background: 'transparent', border: 'none', color: l.isDefault ? '#f59e0b' : 'var(--text-muted)', cursor: 'pointer' }}
                                    title="Establecer como marca de agua por defecto"
                                  >
                                    <Star size={14} fill={l.isDefault ? '#f59e0b' : 'none'} />
                                  </button>

                                  {!l.isOfficial && (
                                    <button
                                      onClick={(e) => handleDeleteSavedLogo(l.id, e)}
                                      style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                                      title="Eliminar logo guardado"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                          No tienes logos guardados en el catálogo aún. Subes uno y quedará guardado para siempre.
                        </p>
                      )}
                    </div>

                    {watermark.imageDataUrl && (
                      <div className="control-subcard">
                        <div className="toggle-header" style={{ marginBottom: '0.4rem' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                            <Palette size={14} style={{ display: 'inline', marginRight: '4px', color: '#f59e0b' }} />
                            Cambiar Color del Logo Seleccionado
                          </label>
                          <input
                            type="checkbox"
                            checked={watermark.logoTintEnabled}
                            onChange={(e) => onUpdateWatermark({ logoTintEnabled: e.target.checked })}
                          />
                        </div>

                        {watermark.logoTintEnabled && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
                            <input
                              type="color"
                              value={watermark.logoTintColor || '#ffffff'}
                              onChange={(e) => onUpdateWatermark({ logoTintColor: e.target.value })}
                              style={{ width: '2.5rem', height: '2rem', borderRadius: '0.3rem', border: 'none', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Convertir a {watermark.logoTintColor}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* EFECTOS DE SOMBRA Y BORDE */}
                <div className="control-subcard">
                  <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.4rem' }}>
                    <Layers size={14} style={{ display: 'inline', marginRight: '4px', color: 'var(--color-brand)' }} />
                    Efectos de Marca y Sombra
                  </strong>

                  <div className="toggle-header" style={{ marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem' }}>Sombra Paralela (Drop Shadow)</label>
                    <input
                      type="checkbox"
                      checked={watermark.dropShadow}
                      onChange={(e) => onUpdateWatermark({ dropShadow: e.target.checked })}
                    />
                  </div>

                  {watermark.type === 'text' && (
                    <div className="toggle-header">
                      <label style={{ fontSize: '0.75rem' }}>Borde Exterior (Stroke)</label>
                      <input
                        type="checkbox"
                        checked={watermark.strokeEnabled}
                        onChange={(e) => onUpdateWatermark({ strokeEnabled: e.target.checked })}
                      />
                    </div>
                  )}
                </div>

                {/* Ubicación */}
                <div className="form-group" style={{ marginTop: '0.85rem' }}>
                  <label>Ubicación en la foto:</label>
                  <select
                    value={watermark.position}
                    onChange={(e) => onUpdateWatermark({ position: e.target.value as WatermarkPosition })}
                    className="form-select"
                  >
                    <option value="bottom-right">Esquina Inferior Derecha</option>
                    <option value="bottom-left">Esquina Inferior Izquierda</option>
                    <option value="top-right">Esquina Superior Derecha</option>
                    <option value="top-left">Esquina Superior Izquierda</option>
                    <option value="center">Centro</option>
                  </select>
                </div>

                {/* Opacidad */}
                <div className="slider-group" style={{ marginTop: '0.85rem' }}>
                  <div className="slider-header">
                    <label>Opacidad / Transparencia</label>
                    <span>{Math.round(watermark.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={watermark.opacity}
                    onChange={(e) => onUpdateWatermark({ opacity: Number(e.target.value) })}
                  />
                </div>

                {/* Tamaño */}
                <div className="slider-group">
                  <div className="slider-header">
                    <label>Tamaño de la Marca</label>
                    <span>{watermark.size}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={watermark.size}
                    onChange={(e) => onUpdateWatermark({ size: Number(e.target.value) })}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 5: MARCOS DIGITALES & BIBLIOTECA DE MARCOS PERSISTENTES */}
        {activeTab === 'frame' && (
          <div className="control-section">
            <h3 className="section-title">Estilo de Marco Digital</h3>

            {/* GALERÍA DE MARCOS INTEGRADOS / BUILT-IN */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                ✨ Marcos Integrados de la Iglesia
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {/* Marco Escuela Dominical LLDM */}
                {(() => {
                  const isActive = frame.style === 'custom-png' && frame.pngDataUrl === '/frames/marco-escuela-dominical.png';
                  return (
                    <div
                      onClick={() => onUpdateFrame({ style: 'custom-png', pngDataUrl: '/frames/marco-escuela-dominical.png' })}
                      style={{
                        cursor: 'pointer',
                        borderRadius: '0.5rem',
                        border: `2px solid ${isActive ? 'var(--color-brand)' : 'var(--border-color)'}`,
                        background: isActive ? 'rgba(59,130,246,0.15)' : 'var(--bg-surface)',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                        boxShadow: isActive ? '0 0 14px var(--color-brand-glow)' : 'none',
                      }}
                    >
                      <img
                        src="/frames/marco-escuela-dominical.png"
                        alt="Escuela Dominical LLDM"
                        style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                      />
                      <div style={{ padding: '0.35rem 0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isActive ? 'var(--color-brand-light)' : 'var(--text-primary)', display: 'block' }}>
                          Escuela Dominical
                        </span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>LLDM Vistas de la Cantera</span>
                      </div>
                    </div>
                  );
                })()}
                {/* Placeholder para más marcos integrados futuros */}
                <div
                  style={{
                    borderRadius: '0.5rem',
                    border: '2px dashed var(--border-color)',
                    background: 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem 0.5rem',
                    gap: '0.3rem',
                    opacity: 0.5,
                  }}
                >
                  <Frame size={22} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>Más marcos próximamente</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Estilo de Marco:</label>
              <select
                value={frame.style}
                onChange={(e) => onUpdateFrame({ style: e.target.value as FrameStyle })}
                className="form-select"
              >
                <option value="none">Sin Marco (Puro)</option>
                <option value="custom-png">Marco PNG Personalizado</option>
                <option value="custom-designer">Diseñador de Marco de Estudio</option>
                <option value="church-event">Marco con Placa de Evento</option>
                <option value="classic-white">Marco Clásico Blanco</option>
                <option value="classic-dark">Marco Clásico Grafito</option>
                <option value="gold-accent">Marco con Acento Dorado</option>
                <option value="polaroid-card">Tarjeta Estilo Polaroid</option>
              </select>
            </div>

            {/* BIBLIOTECA DE MARCOS GUARDADOS */}
            <div className="control-subcard">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FolderHeart size={14} style={{ color: 'var(--color-brand-light)' }} />
                  <span>Biblioteca de Marcos ({savedFrames.length})</span>
                </strong>
              </div>

              <input
                ref={framePngInputRef}
                type="file"
                accept="image/png"
                onChange={handleFramePngUpload}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => framePngInputRef.current?.click()}
                className="btn-secondary btn-block"
                style={{ marginBottom: '0.75rem', fontSize: '0.78rem' }}
              >
                <Upload size={14} />
                <span>Subir y Guardar Nuevo Marco PNG</span>
              </button>

              {savedFrames.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {savedFrames.map((f) => {
                    const isSelected = frame.style === 'custom-png' && frame.pngDataUrl === f.pngDataUrl;
                    return (
                      <div
                        key={f.id}
                        onClick={() => handleSelectSavedFrame(f)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.65rem',
                          borderRadius: '0.375rem',
                          background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-surface)',
                          border: `1px solid ${isSelected ? 'var(--color-brand)' : 'var(--border-color)'}`,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <img
                            src={f.pngDataUrl}
                            alt={f.name}
                            style={{ width: '2rem', height: '2rem', objectFit: 'contain', background: '#1e293b', borderRadius: '0.25rem' }}
                          />
                          <div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                              {f.name}
                            </span>
                            {f.isDefault && (
                              <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700 }}>★ DEFAULT</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            onClick={(e) => handleSetDefaultFrame(f.id, e)}
                            style={{ background: 'transparent', border: 'none', color: f.isDefault ? '#f59e0b' : 'var(--text-muted)', cursor: 'pointer' }}
                            title="Establecer como marco predeterminado"
                          >
                            <Star size={14} fill={f.isDefault ? '#f59e0b' : 'none'} />
                          </button>

                          <button
                            onClick={(e) => handleDeleteSavedFrame(f.id, e)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                            title="Eliminar marco guardado"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No tienes marcos PNG guardados aún. Subes uno y quedará guardado para siempre.
                </p>
              )}
            </div>

            {/* DISEÑADOR DE MARCO PERSONALIZADO */}
            {frame.style === 'custom-designer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
                {/* VISTA PREVIA EN VIVO DEL MARCO */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Vista Previa del Marco en Vivo
                  </span>
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '16/10',
                      background: frame.useGradient
                        ? `linear-gradient(135deg, ${frame.borderColor || '#0f172a'}, ${frame.borderColor2 || '#1e3a8a'})`
                        : (frame.borderColor || '#0f172a'),
                      borderRadius: '0.375rem',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: `${Math.max(4, (frame.borderTop || 20) * 0.2)}px ${Math.max(4, (frame.borderRight || 20) * 0.2)}px ${Math.max(12, (frame.borderBottom || 60) * 0.2)}px ${Math.max(4, (frame.borderLeft || 20) * 0.2)}px`,
                      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
                      position: 'relative',
                    }}
                  >
                    {/* Foto simulada en el interior */}
                    <div
                      style={{
                        flex: 1,
                        background: '#1e293b',
                        borderRadius: '0.2rem',
                        border: `${Math.max(1, (frame.innerStrokeWidth || 2) * 0.5)}px solid ${frame.innerStrokeColor || '#f59e0b'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ImageIcon size={18} style={{ color: 'rgba(255,255,255,0.25)' }} />
                    </div>

                    {/* Banner de texto en miniatura */}
                    {(frame.eventTitle || frame.eventDate) && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 2,
                          left: 0,
                          right: 0,
                          textAlign: 'center',
                          padding: '0 4px',
                        }}
                      >
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: frame.textColor || '#ffffff', display: 'block', lineHeight: 1.2 }}>
                          {frame.eventTitle || 'Título del Evento'}
                        </span>
                        <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.75)', display: 'block' }}>
                          {frame.eventDate || 'Fecha'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* PALETAS DE COLOR PREDISEÑADAS */}
                <div className="control-subcard">
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                    Estilos Rápidos de Color:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => onUpdateFrame({
                        borderColor: '#091428',
                        borderColor2: '#1e3a8a',
                        useGradient: true,
                        innerStrokeColor: '#f59e0b',
                        textColor: '#ffffff',
                      })}
                      className="btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', justifyContent: 'flex-start', padding: '0.3rem 0.5rem' }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#1e3a8a', display: 'inline-block', marginRight: 4 }} />
                      Azul & Dorado
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateFrame({
                        borderColor: '#111827',
                        borderColor2: '#1f2937',
                        useGradient: false,
                        innerStrokeColor: '#e2e8f0',
                        textColor: '#ffffff',
                      })}
                      className="btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', justifyContent: 'flex-start', padding: '0.3rem 0.5rem' }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#111827', display: 'inline-block', marginRight: 4 }} />
                      Grafito Mate
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateFrame({
                        borderColor: '#3b0716',
                        borderColor2: '#831843',
                        useGradient: true,
                        innerStrokeColor: '#fbbf24',
                        textColor: '#ffffff',
                      })}
                      className="btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', justifyContent: 'flex-start', padding: '0.3rem 0.5rem' }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#831843', display: 'inline-block', marginRight: 4 }} />
                      Burdeos Noble
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateFrame({
                        borderColor: '#ffffff',
                        borderColor2: '#f1f5f9',
                        useGradient: false,
                        innerStrokeColor: '#0f172a',
                        textColor: '#0f172a',
                      })}
                      className="btn-secondary btn-sm"
                      style={{ fontSize: '0.7rem', justifyContent: 'flex-start', padding: '0.3rem 0.5rem' }}
                    >
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffffff', display: 'inline-block', marginRight: 4 }} />
                      Marfil Puro
                    </button>
                  </div>
                </div>

                <div className="control-subcard">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Color / Gradiente de Marco:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={frame.borderColor || '#0f172a'}
                      onChange={(e) => onUpdateFrame({ borderColor: e.target.value })}
                      style={{ width: '2.5rem', height: '2rem', border: 'none', cursor: 'pointer', borderRadius: '0.25rem' }}
                    />

                    <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={frame.useGradient}
                        onChange={(e) => onUpdateFrame({ useGradient: e.target.checked })}
                      />
                      <span>Gradiente</span>
                    </label>

                    {frame.useGradient && (
                      <input
                        type="color"
                        value={frame.borderColor2 || '#1e3a8a'}
                        onChange={(e) => onUpdateFrame({ borderColor2: e.target.value })}
                        style={{ width: '2.5rem', height: '2rem', border: 'none', cursor: 'pointer', borderRadius: '0.25rem' }}
                      />
                    )}
                  </div>
                </div>

                <div className="control-subcard">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Grosor de Bordes (px):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Arriba: {frame.borderTop}px</span>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        value={frame.borderTop}
                        onChange={(e) => onUpdateFrame({ borderTop: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Abajo: {frame.borderBottom}px</span>
                      <input
                        type="range"
                        min="0"
                        max="150"
                        value={frame.borderBottom}
                        onChange={(e) => onUpdateFrame({ borderBottom: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Izquierda: {frame.borderLeft}px</span>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        value={frame.borderLeft}
                        onChange={(e) => onUpdateFrame({ borderLeft: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Derecha: {frame.borderRight}px</span>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        value={frame.borderRight}
                        onChange={(e) => onUpdateFrame({ borderRight: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="control-subcard">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Línea / Filete Interior:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="color"
                      value={frame.innerStrokeColor || '#f59e0b'}
                      onChange={(e) => onUpdateFrame({ innerStrokeColor: e.target.value })}
                      style={{ width: '2rem', height: '1.8rem', border: 'none', cursor: 'pointer', borderRadius: '0.25rem' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Grosor: {frame.innerStrokeWidth}px</span>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={frame.innerStrokeWidth}
                      onChange={(e) => onUpdateFrame({ innerStrokeWidth: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="control-subcard">
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Leyenda y Textos del Banner:
                  </label>
                  <div className="form-group">
                    <input
                      type="text"
                      value={frame.eventTitle || ''}
                      onChange={(e) => onUpdateFrame({ eventTitle: e.target.value })}
                      placeholder="Título Principal (ej. Escuela Dominical)"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <input
                      type="text"
                      value={frame.eventSubtitle || ''}
                      onChange={(e) => onUpdateFrame({ eventSubtitle: e.target.value })}
                      placeholder="Subtítulo / Congregación"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="text"
                      value={frame.eventDate || ''}
                      onChange={(e) => onUpdateFrame({ eventDate: e.target.value })}
                      placeholder="Fecha (ej. 25 de Septiembre de 2026)"
                      className="form-input"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const formatted = now.toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        });
                        onUpdateFrame({ eventDate: formatted });
                      }}
                      className="btn-secondary btn-sm"
                      title="Insertar fecha de hoy"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Calendar size={13} />
                      <span>Hoy</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {frame.style === 'church-event' && (
              <>
                <div className="form-group" style={{ marginTop: '0.85rem' }}>
                  <label>Nombre del Evento / Servicio:</label>
                  <input
                    type="text"
                    value={frame.eventTitle || ''}
                    onChange={(e) => onUpdateFrame({ eventTitle: e.target.value })}
                    placeholder="Ej. Servicio Especial de Doctrina"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Fecha o Ubicación:</label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="text"
                      value={frame.eventDate || ''}
                      onChange={(e) => onUpdateFrame({ eventDate: e.target.value })}
                      placeholder="Ej. Septiembre 2026 • LLDM Vistas de la Cantera"
                      className="form-input"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const formatted = now.toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        });
                        onUpdateFrame({ eventDate: formatted });
                      }}
                      className="btn-secondary btn-sm"
                      title="Insertar fecha de hoy"
                    >
                      <Calendar size={13} />
                      <span>Hoy</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
