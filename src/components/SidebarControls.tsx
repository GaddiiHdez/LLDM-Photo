import React, { useState, useRef, useEffect } from 'react';
import {
  Sliders,
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
} from 'lucide-react';
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
  onApplyPreset: (preset: PresetType) => void;
  onUpdateWatermark: (watermark: Partial<WatermarkSettings>) => void;
  onUpdateFrame: (frame: Partial<FrameSettings>) => void;
  onApplySettingsToAll: () => void;
  onSaveAsDefaultAppSettings: () => void;
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
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'crop' | 'adjust' | 'watermark' | 'frame'>('presets');
  const [savedFrames, setSavedFrames] = useState<SavedPngFrame[]>([]);
  const [savedLogos, setSavedLogos] = useState<SavedLogo[]>([]);
  const [savedDefaultToast, setSavedDefaultToast] = useState<boolean>(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const framePngInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedFrames(getSavedPngFrames());
    setSavedLogos(getSavedLogos());
  }, []);

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
      {/* Control Tabs Header */}
      <div className="sidebar-tabs">
        <button
          onClick={() => setActiveTab('presets')}
          className={`sidebar-tab ${activeTab === 'presets' ? 'active' : ''}`}
          title="Preajustes de optimización"
        >
          <Wand2 size={15} />
          <span>Presets</span>
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
          onClick={() => setActiveTab('adjust')}
          className={`sidebar-tab ${activeTab === 'adjust' ? 'active' : ''}`}
          title="Ajustes de iluminación y sensor RAW"
        >
          <Sliders size={15} />
          <span>Luz & RAW</span>
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
          onClick={handleSaveCurrentDefault}
          className={`default-pill-btn ${savedDefaultToast ? 'saved' : ''}`}
          title="Guardar esta configuración como inicio predeterminado"
        >
          <Bookmark size={13} />
          <span>{savedDefaultToast ? 'Guardado ✓' : 'Guardar Preset'}</span>
        </button>
      </div>

      <div className="sidebar-content">
        {/* TAB 1: PRESETS */}
        {activeTab === 'presets' && (
          <div className="control-section">
            <h3 className="section-title">Preajustes de Revelado</h3>
            <p className="section-desc">Optimiza la iluminación y el color con 1 solo clic</p>

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
              style={{ marginTop: '1rem' }}
            >
              <RotateCcw size={14} />
              <span>Restablecer Ajustes Originales</span>
            </button>
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

        {/* TAB 3: AJUSTES MANUALES DE LUZ */}
        {activeTab === 'adjust' && (
          <div className="control-section">
            <h3 className="section-title">Ajustes de Revelado & Luz</h3>
            <p className="section-desc">Control fino del sensor, rango dinámico y temperatura de color</p>

            {/* Botón único de auto-tono en el panel de Luz */}
            <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => onApplyPreset('auto-church')}
                className="btn-secondary"
                style={{ flex: 1, fontSize: '0.78rem', justifyContent: 'center', background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                title="Calcular y aplicar balance tonal óptimo automáticamente"
              >
                <Wand2 size={13} style={{ color: '#38bdf8' }} />
                <span>Auto-Tono Inteligente</span>
              </button>

              <button
                type="button"
                onClick={() => onApplyPreset('custom')}
                className="btn-secondary"
                title="Restablecer todos los sliders a neutro"
                style={{ padding: '0.45rem 0.65rem' }}
              >
                <RotateCcw size={13} />
              </button>
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <label>Brillo / Exposición</label>
                <span>{photo.adjustments.brightness}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={photo.adjustments.brightness}
                onChange={(e) => handleSliderChange('brightness', Number(e.target.value))}
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <label>Contraste</label>
                <span>{photo.adjustments.contrast}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={photo.adjustments.contrast}
                onChange={(e) => handleSliderChange('contrast', Number(e.target.value))}
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <label>Saturación / Color</label>
                <span>{photo.adjustments.saturation}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={photo.adjustments.saturation}
                onChange={(e) => handleSliderChange('saturation', Number(e.target.value))}
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <label>Calidez de Luces (Tono)</label>
                <span>{photo.adjustments.warmth}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={photo.adjustments.warmth}
                onChange={(e) => handleSliderChange('warmth', Number(e.target.value))}
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <label>Recuperación de Sombras</label>
                <span>{photo.adjustments.shadows}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={photo.adjustments.shadows}
                onChange={(e) => handleSliderChange('shadows', Number(e.target.value))}
              />
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
