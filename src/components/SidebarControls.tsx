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
  Bookmark,
  Trash2,
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
  MoveHorizontal,
  MoveVertical,
  Target,
  Type,
  Eye,
  Ban,
  Landmark,
  Newspaper,
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
  const [activeCropParam, setActiveCropParam] = useState<'zoom' | 'offsetX' | 'offsetY'>('zoom');
  const [activeWmParam, setActiveWmParam] = useState<'opacity' | 'size'>('opacity');

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
      eventTitle: f.defaultEventTitle || (f.isDynamic ? (frame.eventTitle || 'Escuela Dominical') : frame.eventTitle),
      dynamicTextEnabled: Boolean(f.isDynamic || f.pngDataUrl.includes('notexto')),
    });
  };

  const handleDeleteSavedFrame = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteSavedPngFrame(id);
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

  const ratioList = [
    {
      id: 'original' as AspectRatioType,
      label: 'Original',
      renderIcon: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8V4m0 0h4M4 4l5 5m11-5v4m0-4h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
        </svg>
      ),
    },
    {
      id: '1:1' as AspectRatioType,
      label: '1:1 Cuadrado',
      renderIcon: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      ),
    },
    {
      id: '4:5' as AspectRatioType,
      label: '4:5 Post IG',
      renderIcon: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4.5" y="2" width="15" height="20" rx="2" />
        </svg>
      ),
    },
    {
      id: '9:16' as AspectRatioType,
      label: '9:16 Story',
      renderIcon: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6.5" y="2" width="11" height="20" rx="2" />
        </svg>
      ),
    },
    {
      id: '16:9' as AspectRatioType,
      label: '16:9 Cine',
      renderIcon: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="6.5" width="20" height="11" rx="2" />
        </svg>
      ),
    },
    {
      id: '3:2' as AspectRatioType,
      label: '3:2 Paisaje',
      renderIcon: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="5" width="20" height="14" rx="2" />
        </svg>
      ),
    },
    {
      id: '2:3' as AspectRatioType,
      label: '2:3 Retrato',
      renderIcon: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="2" />
        </svg>
      ),
    },
    {
      id: '3:4' as AspectRatioType,
      label: '3:4 Clásico',
      renderIcon: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="3" width="16" height="18" rx="2" />
        </svg>
      ),
    },
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
          <FrameIcon size={15} />
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
                  Filtros de Revelado BereaSnap
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

        {/* TAB 2: ENCUADRE & RELACIÓN DE ASPECTO (BARRA HORIZONTAL ESTILO SNAPSEED) */}
        {activeTab === 'crop' && (
          <div className="control-section crop-section">
            {/* SLIDER MAESTRO PARA ENCUADRE */}
            <div className="master-slider-card">
              <div className="master-slider-header">
                <div className="slider-label-group">
                  {activeCropParam === 'zoom' && <ZoomIn size={15} className="active-param-icon" />}
                  {activeCropParam === 'offsetX' && <MoveHorizontal size={15} className="active-param-icon" />}
                  {activeCropParam === 'offsetY' && <MoveVertical size={15} className="active-param-icon" />}
                  <span className="slider-param-name">
                    {activeCropParam === 'zoom' ? 'ZOOM / ESCALA' : activeCropParam === 'offsetX' ? 'DESPLAZAMIENTO X' : 'DESPLAZAMIENTO Y'}
                  </span>
                </div>

                <div className="slider-value-bubble">
                  <span>
                    {activeCropParam === 'zoom'
                      ? `${Math.round((photo.crop?.zoom || 1) * 100)}%`
                      : `${(photo.crop as any)?.[activeCropParam] || 0}%`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (activeCropParam === 'zoom') handleCropChange('zoom', 1.0);
                    if (activeCropParam === 'offsetX') handleCropChange('offsetX', 0);
                    if (activeCropParam === 'offsetY') handleCropChange('offsetY', 0);
                  }}
                  className="slider-reset-action"
                  title="Restablecer este parámetro"
                >
                  <span>Reiniciar</span>
                  <RotateCcw size={11} />
                </button>
              </div>

              <div className="master-slider-track-wrap">
                <input
                  type="range"
                  min={activeCropParam === 'zoom' ? 1.0 : -50}
                  max={activeCropParam === 'zoom' ? 2.5 : 50}
                  step={activeCropParam === 'zoom' ? 0.05 : 1}
                  value={activeCropParam === 'zoom' ? (photo.crop?.zoom || 1) : ((photo.crop as any)?.[activeCropParam] || 0)}
                  onChange={(e) => handleCropChange(activeCropParam, Number(e.target.value))}
                  className="master-range-slider"
                />
                <div className="master-slider-ticks">
                  <span className="tick-side">{activeCropParam === 'zoom' ? '100%' : '-50%'}</span>
                  <span className="tick-center">{activeCropParam === 'zoom' ? '175%' : '0'}</span>
                  <span className="tick-side">{activeCropParam === 'zoom' ? '250%' : '+50%'}</span>
                </div>
              </div>
            </div>

            {/* BOTONES DE PARÁMETROS DE ENCUADRE + ACCIONES RÁPIDAS */}
            <div className="develop-quick-actions" style={{ marginBottom: '0.85rem' }}>
              <button
                type="button"
                onClick={() => setActiveCropParam('zoom')}
                className={`develop-action-btn btn-secondary ${activeCropParam === 'zoom' ? 'active' : ''}`}
              >
                <ZoomIn size={13} />
                <span>Zoom</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCropParam('offsetX')}
                className={`develop-action-btn btn-secondary ${activeCropParam === 'offsetX' ? 'active' : ''}`}
              >
                <MoveHorizontal size={13} />
                <span>Posición X</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCropParam('offsetY')}
                className={`develop-action-btn btn-secondary ${activeCropParam === 'offsetY' ? 'active' : ''}`}
              >
                <MoveVertical size={13} />
                <span>Posición Y</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleCropChange('offsetX', 0);
                  handleCropChange('offsetY', 0);
                  handleCropChange('zoom', 1.0);
                }}
                className="develop-action-btn btn-secondary"
                title="Centrar encuadre de la foto"
              >
                <Target size={13} />
                <span>Centrar</span>
              </button>
            </div>

            {/* CINTA HORIZONTAL DE ASPECT RATIOS (ICONOS GEOMÉTRICOS ESTILO REFERENCIA) */}
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.45rem' }}>
              Relación de Aspecto & Recorte
            </span>

            <div className="ratio-icons-carousel">
              {ratioList.map((r) => {
                const isSelected = (photo.crop?.aspectRatio || 'original') === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleCropChange('aspectRatio', r.id)}
                    className={`ratio-icon-pill ${isSelected ? 'active' : ''}`}
                  >
                    <div className={`ratio-icon-box ${isSelected ? 'active' : ''}`}>
                      {r.renderIcon()}
                    </div>
                    <span className="ratio-icon-name">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: FIRMA & LOGOS (MINIMALISTA, HORIZONTAL) */}
        {activeTab === 'watermark' && (
          <div className="control-section watermark-section">
            {/* Encabezado con Interruptor */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Firma & Logotipo Institucional
              </span>
              <button
                type="button"
                onClick={() => onUpdateWatermark({ enabled: !watermark.enabled })}
                className={`toggle-pill-btn ${watermark.enabled ? 'active' : ''}`}
              >
                {watermark.enabled ? '✓ Activa' : 'Desactivada'}
              </button>
            </div>

            {watermark.enabled && (
              <>
                {/* Selector de Modo: Logo PNG vs Texto */}
                <div className="develop-mode-pills" style={{ marginBottom: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => onUpdateWatermark({ type: 'image' })}
                    className={`develop-mode-btn ${watermark.type === 'image' ? 'active' : ''}`}
                  >
                    <ImageIcon size={13} />
                    <span>Logo PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateWatermark({ type: 'text' })}
                    className={`develop-mode-btn ${watermark.type === 'text' ? 'active' : ''}`}
                  >
                    <Type size={13} />
                    <span>Texto Editorial</span>
                  </button>
                </div>

                {/* SLIDER MAESTRO PARA FIRMA (OPACIDAD / TAMAÑO) */}
                <div className="master-slider-card">
                  <div className="master-slider-header">
                    <div className="slider-label-group">
                      {activeWmParam === 'opacity' ? <Eye size={15} className="active-param-icon" /> : <Maximize2 size={15} className="active-param-icon" />}
                      <span className="slider-param-name">
                        {activeWmParam === 'opacity' ? 'OPACIDAD / TRANSPARENCIA' : 'TAMAÑO DE FIRMA'}
                      </span>
                    </div>

                    <div className="slider-value-bubble">
                      <span>
                        {activeWmParam === 'opacity'
                          ? `${Math.round(watermark.opacity * 100)}%`
                          : `${watermark.size}%`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (activeWmParam === 'opacity') onUpdateWatermark({ opacity: 0.75 });
                        if (activeWmParam === 'size') onUpdateWatermark({ size: 24 });
                      }}
                      className="slider-reset-action"
                      title="Restablecer"
                    >
                      <span>Reiniciar</span>
                      <RotateCcw size={11} />
                    </button>
                  </div>

                  <div className="master-slider-track-wrap">
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
                      className="master-range-slider"
                    />
                    <div className="master-slider-ticks">
                      <span className="tick-side">{activeWmParam === 'opacity' ? '10%' : '10%'}</span>
                      <span className="tick-center">{activeWmParam === 'opacity' ? '50%' : '35%'}</span>
                      <span className="tick-side">{activeWmParam === 'opacity' ? '100%' : '60%'}</span>
                    </div>
                  </div>
                </div>

                {/* BOTONES CONMUTADORES DEL SLIDER DE FIRMA */}
                <div className="develop-quick-actions" style={{ marginBottom: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => setActiveWmParam('opacity')}
                    className={`develop-action-btn btn-secondary ${activeWmParam === 'opacity' ? 'active' : ''}`}
                  >
                    <Eye size={13} />
                    <span>Opacidad</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveWmParam('size')}
                    className={`develop-action-btn btn-secondary ${activeWmParam === 'size' ? 'active' : ''}`}
                  >
                    <Maximize2 size={13} />
                    <span>Tamaño</span>
                  </button>
                </div>

                {/* SELECTOR DE LOGOS PNG HORIZONTAL */}
                {watermark.type === 'image' && (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.45rem' }}>
                      Catálogo de Logos Oficiales & Guardados
                    </span>

                    <div className="logo-carousel">
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
                        className="logo-upload-pill"
                        title="Subir nuevo logo PNG"
                      >
                        <Upload size={16} />
                        <span>+ Subir</span>
                      </button>

                      {savedLogos.map((l) => {
                        const isSelected = watermark.imageDataUrl === l.imageDataUrl;
                        return (
                          <div
                            key={l.id}
                            onClick={() => handleSelectSavedLogo(l)}
                            className={`logo-pill-card ${isSelected ? 'active' : ''}`}
                            title={l.name}
                          >
                            <img src={l.imageDataUrl} alt={l.name} className="logo-pill-img" />
                            <span className="logo-pill-name">{l.isOfficial ? 'Oficial' : l.name.slice(0, 8)}</span>
                            {isSelected && <span className="param-modified-dot" />}
                            {!l.isOfficial && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSavedLogo(l.id, e)}
                                className="delete-pill-badge"
                                title="Eliminar logo"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* MODO TEXTO EDITORIAL */}
                {watermark.type === 'text' && (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                      Texto de la Firma:
                    </label>
                    <input
                      type="text"
                      value={watermark.text || ''}
                      onChange={(e) => onUpdateWatermark({ text: e.target.value })}
                      placeholder="Ej. BereaSnap • Fotografía Oficial"
                      className="form-input"
                      style={{ marginBottom: '0.5rem', fontSize: '0.78rem' }}
                    />

                    {/* Presets Rápidos de Texto con 1 toque */}
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                      {['BereaSnap Oficial', 'Berea Prensa & Crónica', 'Berea Fotografía'].map((pt) => (
                        <button
                          key={pt}
                          type="button"
                          onClick={() => onUpdateWatermark({ text: pt })}
                          className="quick-chip-btn"
                        >
                          {pt}
                        </button>
                      ))}
                    </div>

                    {/* Colores nobles */}
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Color:</span>
                      <button
                        type="button"
                        onClick={() => onUpdateWatermark({ color: '#ffffff' })}
                        className={`color-pill-btn ${watermark.color === '#ffffff' ? 'active' : ''}`}
                        style={{ background: '#ffffff' }}
                        title="Blanco Puro"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateWatermark({ color: '#d4af37' })}
                        className={`color-pill-btn ${watermark.color === '#d4af37' ? 'active' : ''}`}
                        style={{ background: '#d4af37' }}
                        title="Oro Noble"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateWatermark({ color: '#94a3b8' })}
                        className={`color-pill-btn ${watermark.color === '#94a3b8' ? 'active' : ''}`}
                        style={{ background: '#94a3b8' }}
                        title="Plata Translúcido"
                      />
                    </div>
                  </div>
                )}

                {/* SELECTOR VISUAL DE POSICIÓN (5 CUADRANTES) */}
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.45rem' }}>
                  Posición en la Foto
                </span>

                <div className="position-pills-row">
                  {[
                    { id: 'top-left', label: '↖ Sup-Izq' },
                    { id: 'top-right', label: '↗ Sup-Der' },
                    { id: 'center', label: '• Centro' },
                    { id: 'bottom-left', label: '↙ Inf-Izq' },
                    { id: 'bottom-right', label: '↘ Inf-Der' },
                  ].map((pos) => {
                    const isPosActive = watermark.position === pos.id;
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => onUpdateWatermark({ position: pos.id as any })}
                        className={`position-pill ${isPosActive ? 'active' : ''}`}
                      >
                        {pos.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: MARCOS FOTOGRÁFICOS FINE-ART & EDITORIAL */}
        {activeTab === 'frame' && (
          <div className="control-section frame-section">
            {/* CINTA HORIZONTAL DE ESTILOS DE MARCO */}
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.45rem' }}>
              Estilo de Marco Fotográfico
            </span>

            <div className="frame-styles-carousel">
              {[
                { id: 'none', label: 'Sin Marco', icon: Ban },
                { id: 'fine-gallery', label: 'Galería Fine-Art', icon: Landmark },
                { id: 'editorial', label: 'Editorial', icon: Newspaper },
                { id: 'gold-accent', label: 'Filo Oro', icon: Sparkles },
                { id: 'custom-png', label: 'PNG Oficial', icon: FrameIcon },
                { id: 'polaroid-card', label: 'Polaroid', icon: Square },
              ].map((st) => {
                const isSelected = frame.style === st.id;
                const Icon = st.icon;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onUpdateFrame({ style: st.id as any })}
                    className={`frame-style-pill ${isSelected ? 'active' : ''}`}
                  >
                    <div className={`frame-style-box ${isSelected ? 'active' : ''}`}>
                      <Icon size={18} />
                    </div>
                    <span className="frame-style-name">{st.label}</span>
                  </button>
                );
              })}
            </div>

            {frame.style !== 'none' && (
              <>
                {/* SLIDER MAESTRO PARA MARGEN / GROSOR DEL MARCO */}
                <div className="master-slider-card">
                  <div className="master-slider-header">
                    <div className="slider-label-group">
                      <FrameIcon size={15} className="active-param-icon" />
                      <span className="slider-param-name">GROSOR / MARGEN DEL MARCO</span>
                    </div>

                    <div className="slider-value-bubble">
                      <span>{frame.borderTop || 24}px</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onUpdateFrame({ borderTop: 24, borderBottom: 24, borderLeft: 24, borderRight: 24 })}
                      className="slider-reset-action"
                      title="Restablecer"
                    >
                      <span>Reiniciar</span>
                      <RotateCcw size={11} />
                    </button>
                  </div>

                  <div className="master-slider-track-wrap">
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
                      className="master-range-slider"
                    />
                    <div className="master-slider-ticks">
                      <span className="tick-side">8px</span>
                      <span className="tick-center">36px</span>
                      <span className="tick-side">70px</span>
                    </div>
                  </div>
                </div>

                {/* SELECTOR DE COLOR PARA GALERÍA Y EDITORIAL */}
                {(frame.style === 'fine-gallery' || frame.style === 'editorial') && (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.45rem' }}>
                      Color del Passepartout / Fondo
                    </span>
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button
                        type="button"
                        onClick={() => onUpdateFrame({ borderColor: '#ffffff', textColor: '#0f172a' })}
                        className={`color-choice-pill ${frame.borderColor === '#ffffff' ? 'active' : ''}`}
                      >
                        <span className="color-dot" style={{ background: '#ffffff', border: '1px solid #cbd5e1' }} />
                        <span>Blanco Galería</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onUpdateFrame({ borderColor: '#0a0f1d', textColor: '#ffffff' })}
                        className={`color-choice-pill ${frame.borderColor === '#0a0f1d' ? 'active' : ''}`}
                      >
                        <span className="color-dot" style={{ background: '#0a0f1d', border: '1px solid #334155' }} />
                        <span>Grafito Oscuro</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* CAMPOS DE TEXTO PARA EDITORIAL */}
                {frame.style === 'editorial' && (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ marginBottom: '0.4rem' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Título de la Obra / Servicio:</label>
                      <input
                        type="text"
                        value={frame.eventTitle || ''}
                        onChange={(e) => onUpdateFrame({ eventTitle: e.target.value })}
                        placeholder="Ej. Servicio de Alabanzas"
                        className="form-input"
                        style={{ fontSize: '0.78rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Subtítulo / Fecha / Lugar:</label>
                      <input
                        type="text"
                        value={frame.eventSubtitle || ''}
                        onChange={(e) => onUpdateFrame({ eventSubtitle: e.target.value })}
                        placeholder="Ej. Fotografía Oficial • BereaSnap"
                        className="form-input"
                        style={{ fontSize: '0.78rem' }}
                      />
                    </div>
                  </div>
                )}

                {/* CARROUSEL DE MARCOS PNG SI ESTÁ EN CUSTOM-PNG */}
                {frame.style === 'custom-png' && (
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Marcos PNG ({savedFrames.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => framePngInputRef.current?.click()}
                        className="btn-secondary btn-sm"
                        style={{ fontSize: '0.68rem', padding: '0.18rem 0.5rem' }}
                      >
                        <Upload size={11} />
                        <span>Subir PNG</span>
                      </button>
                    </div>

                    <input
                      ref={framePngInputRef}
                      type="file"
                      accept="image/png"
                      onChange={handleFramePngUpload}
                      style={{ display: 'none' }}
                    />

                    <div className="logo-carousel">
                      {savedFrames.map((f) => {
                        const isSelected = frame.pngDataUrl === f.pngDataUrl;
                        return (
                          <div
                            key={f.id}
                            onClick={() => handleSelectSavedFrame(f)}
                            className={`logo-pill-card ${isSelected ? 'active' : ''}`}
                            title={f.name}
                          >
                            <img src={f.pngDataUrl} alt={f.name} className="logo-pill-img" />
                            <span className="logo-pill-name">{f.name.slice(0, 10)}</span>
                            {f.isDynamic && <span className="param-modified-dot" title="Marco con texto dinámico" />}
                            {!f.id.includes('official') && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSavedFrame(f.id, e)}
                                className="delete-pill-badge"
                                title="Eliminar marco"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* CONTROLES DE TEXTO DINÁMICO EN MARCO PNG */}
                    {(() => {
                      const selectedFrame = savedFrames.find((f) => f.pngDataUrl === frame.pngDataUrl);
                      const isDynamic = Boolean(selectedFrame?.isDynamic || frame.pngDataUrl?.includes('notexto') || frame.dynamicTextEnabled);

                      return (
                        <div style={{ marginTop: '0.85rem', padding: '0.75rem', background: 'var(--bg-subcard)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Sparkles size={13} style={{ color: '#f59e0b' }} />
                              {isDynamic ? 'Texto Dinámico del Marco' : 'Añadir Texto al Marco'}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateFrame({ dynamicTextEnabled: !(frame.dynamicTextEnabled ?? true) })}
                              className={`toggle-pill-btn ${(frame.dynamicTextEnabled ?? true) ? 'active' : ''}`}
                              style={{ fontSize: '0.62rem', padding: '0.15rem 0.5rem' }}
                            >
                              {(frame.dynamicTextEnabled ?? true) ? '✓ Texto Activo' : 'Ocultar Texto'}
                            </button>
                          </div>

                          {(frame.dynamicTextEnabled ?? true) && (
                            <>
                              <div style={{ marginBottom: '0.45rem' }}>
                                <input
                                  type="text"
                                  value={frame.eventTitle || ''}
                                  onChange={(e) => onUpdateFrame({ eventTitle: e.target.value, dynamicTextEnabled: true })}
                                  placeholder="Ej. Escuela Dominical, Oración 7pm..."
                                  className="form-input"
                                  style={{ fontSize: '0.78rem' }}
                                />
                              </div>

                              {/* Presets Rápidos con 1 Toque */}
                              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.55rem' }}>
                                {[
                                  'Escuela Dominical',
                                  'Oración de 7:00 PM',
                                  'Servicio de Doctrina',
                                  'Culto de Jóvenes',
                                  'Consagración',
                                  'Estudio Bíblico',
                                  'Bautismos',
                                  'Presentación de Niños',
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

                              {/* Selector de Color del Texto */}
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Color:</span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateFrame({ dynamicTextColorStyle: 'gold' })}
                                  className={`color-choice-pill ${(!frame.dynamicTextColorStyle || frame.dynamicTextColorStyle === 'gold') ? 'active' : ''}`}
                                  style={{ padding: '0.22rem 0.5rem', fontSize: '0.66rem' }}
                                >
                                  <span className="color-dot" style={{ background: 'linear-gradient(135deg, #fef08a, #cea544)' }} />
                                  <span>Oro Centenario</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateFrame({ dynamicTextColorStyle: 'white' })}
                                  className={`color-choice-pill ${frame.dynamicTextColorStyle === 'white' ? 'active' : ''}`}
                                  style={{ padding: '0.22rem 0.5rem', fontSize: '0.66rem' }}
                                >
                                  <span className="color-dot" style={{ background: '#ffffff', border: '1px solid #cbd5e1' }} />
                                  <span>Blanco</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
