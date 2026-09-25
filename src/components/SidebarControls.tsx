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
    onUpdateWatermark({
      type: 'image',
      imageDataUrl: l.imageDataUrl,
      enabled: true,
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

  const presetsList: { id: PresetType; label: string; icon: string; desc: string }[] = [
    { id: 'auto-church', label: 'Auto Iglesia / Evento', icon: '✝️', desc: 'Mejora luz, sombras y contraste ideales para el templo' },
    { id: 'warm-worship', label: 'Cálido Consagración', icon: '🌅', desc: 'Tonos cálidos y atmósfera dorada' },
    { id: 'vibrant-praise', label: 'Alabanza Vívido', icon: '📸', desc: 'Colores vibrantes y escenario nítido' },
    { id: 'elegant-bw', label: 'Blanco & Negro Elegante', icon: '🖤', desc: 'Monocromático de alto contraste' },
  ];

  const aspectRatios: { id: AspectRatioType; label: string; icon: any; desc: string }[] = [
    { id: 'original', label: 'Nativo (Nikon 3:2)', icon: Maximize2, desc: '6000 × 4000 px' },
    { id: '1:1', label: 'Cuadrado 1:1', icon: Square, desc: 'Instagram Feed' },
    { id: '4:5', label: 'Vertical 4:5', icon: Smartphone, desc: 'Instagram Post' },
    { id: '3:4', label: 'Retrato 3:4', icon: Crop, desc: 'Formato Estándar' },
    { id: '9:16', label: 'Historia 9:16', icon: Smartphone, desc: 'Reels / Stories / Status' },
    { id: '16:9', label: 'Panorámico 16:9', icon: Monitor, desc: 'Pantalla Completa' },
  ];

  return (
    <aside className="sidebar-controls card-glass">
      {/* Control Tabs Header */}
      <div className="sidebar-tabs">
        <button
          onClick={() => setActiveTab('presets')}
          className={`sidebar-tab ${activeTab === 'presets' ? 'active' : ''}`}
        >
          <Sparkles size={16} />
          <span>Filtros</span>
        </button>

        <button
          onClick={() => setActiveTab('crop')}
          className={`sidebar-tab ${activeTab === 'crop' ? 'active' : ''}`}
        >
          <Crop size={16} />
          <span>Formato</span>
        </button>

        <button
          onClick={() => setActiveTab('adjust')}
          className={`sidebar-tab ${activeTab === 'adjust' ? 'active' : ''}`}
        >
          <Sliders size={16} />
          <span>Luz</span>
        </button>

        <button
          onClick={() => setActiveTab('watermark')}
          className={`sidebar-tab ${activeTab === 'watermark' ? 'active' : ''}`}
        >
          <ImageIcon size={16} />
          <span>Marca</span>
        </button>

        <button
          onClick={() => setActiveTab('frame')}
          className={`sidebar-tab ${activeTab === 'frame' ? 'active' : ''}`}
        >
          <Frame size={16} />
          <span>Marcos</span>
        </button>
      </div>

      {/* Global Action Banner */}
      <div className="apply-all-banner" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <button onClick={onApplySettingsToAll} className="btn-secondary btn-block">
          <Sparkles size={14} style={{ color: '#f59e0b' }} />
          <span>Aplicar esta configuración a TODAS las fotos</span>
        </button>

        <button onClick={handleSaveCurrentDefault} className="btn-primary btn-block" style={{ fontSize: '0.78rem' }}>
          <Bookmark size={14} />
          <span>{savedDefaultToast ? '¡Guardado como Predeterminado!' : 'Establecer como Plantilla Default'}</span>
        </button>
      </div>

      <div className="sidebar-content">
        {/* TAB 1: PRESETS */}
        {activeTab === 'presets' && (
          <div className="control-section">
            <h3 className="section-title">Preajustes de Auto-Edición</h3>
            <p className="section-desc">Optimiza la foto con 1 solo clic según el ambiente de la iglesia</p>

            <div className="preset-grid">
              {presetsList.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onApplyPreset(p.id)}
                  className={`preset-card ${photo.preset === p.id ? 'active' : ''}`}
                >
                  <span className="preset-icon">{p.icon}</span>
                  <div className="preset-info">
                    <strong className="preset-name">{p.label}</strong>
                    <span className="preset-desc">{p.desc}</span>
                  </div>
                </button>
              ))}
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

        {/* TAB 2: FORMATO / RECORTE Y ORIENTACIÓN */}
        {activeTab === 'crop' && (
          <div className="control-section">
            <h3 className="section-title">Relación de Aspecto & Formato</h3>
            <p className="section-desc">Diseñado para sensor Nikon 6000×4000 px y redes sociales</p>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Orientación de Salida:</label>
              <div className="radio-group">
                <button
                  onClick={() => handleCropChange('orientation', 'landscape')}
                  className={`radio-label ${photo.crop?.orientation === 'landscape' ? 'active' : ''}`}
                >
                  ↔️ Horizontal (Landscape)
                </button>
                <button
                  onClick={() => handleCropChange('orientation', 'portrait')}
                  className={`radio-label ${photo.crop?.orientation === 'portrait' ? 'active' : ''}`}
                >
                  ↕️ Vertical (Portrait)
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Formato de Recorte:</label>
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
                      <Icon size={20} style={{ color: isActive ? 'var(--color-brand)' : 'var(--text-secondary)' }} />
                      <div className="preset-info">
                        <strong className="preset-name">{ar.label}</strong>
                        <span className="preset-desc">{ar.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
              <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.65rem' }}>
                🎯 Ajuste Fino de Re-encuadre
              </strong>

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

              <div className="slider-group">
                <div className="slider-header">
                  <label>Enfoque / Acercamiento (Zoom)</label>
                  <span>{((photo.crop?.zoom || 1) * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="2"
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
            <h3 className="section-title">Ajustes Finos de Imagen</h3>

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
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '0.5rem' }}>
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
                                    style={{ width: '2rem', height: '2rem', objectFit: 'contain', background: '#1e293b', borderRadius: '0.25rem', padding: '2px' }}
                                  />
                                  <div>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                                      {l.name}
                                    </span>
                                    {l.isDefault && (
                                      <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700 }}>★ LOGO DEFAULT</span>
                                    )}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <button
                                    onClick={(e) => handleSetDefaultLogo(l.id, e)}
                                    style={{ background: 'transparent', border: 'none', color: l.isDefault ? '#f59e0b' : 'var(--text-muted)', cursor: 'pointer' }}
                                    title="Establecer como logo predeterminado"
                                  >
                                    <Star size={14} fill={l.isDefault ? '#f59e0b' : 'none'} />
                                  </button>

                                  <button
                                    onClick={(e) => handleDeleteSavedLogo(l.id, e)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                                    title="Eliminar logo guardado"
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
                          No tienes logos guardados en el catálogo aún. Subes uno y quedará guardado para siempre.
                        </p>
                      )}
                    </div>

                    {watermark.imageDataUrl && (
                      <div style={{ marginTop: '0.85rem', padding: '0.65rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
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
                <div style={{ marginTop: '0.85rem', padding: '0.65rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
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
              <label>O selecciona un estilo de marco:</label>
              <select
                value={frame.style}
                onChange={(e) => onUpdateFrame({ style: e.target.value as FrameStyle })}
                className="form-select"
              >
                <option value="none">Sin Marco (Original)</option>
                <option value="custom-png">🖼️ Marco PNG Subido por ti</option>
                <option value="custom-designer">🎨 Diseñador de Marco Personalizado</option>
                <option value="church-event">Marco de Evento de Iglesia (Banner Inferior)</option>
                <option value="classic-white">Marco Clásico Blanco</option>
                <option value="classic-dark">Marco Clásico Oscuro</option>
                <option value="gold-accent">Marco Dorado Elegante</option>
                <option value="polaroid-card">Marco Tarjeta Polaroid</option>
              </select>
            </div>

            {/* TUS MARCOS PNG GUARDADOS PERSISTENTES */}
            <div style={{ marginTop: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '0.5rem' }}>
              <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                📁 Biblioteca de Marcos PNG Guardados ({savedFrames.length})
              </strong>

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
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.65rem', borderRadius: '0.5rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Color / Gradiente de Marco:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={frame.borderColor || '#0f172a'}
                      onChange={(e) => onUpdateFrame({ borderColor: e.target.value })}
                      style={{ width: '2.5rem', height: '2rem', border: 'none', cursor: 'pointer' }}
                    />

                    <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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
                        style={{ width: '2.5rem', height: '2rem', border: 'none', cursor: 'pointer' }}
                      />
                    )}
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.65rem', borderRadius: '0.5rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Grosor de Bordes (px):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem' }}>Arriba: {frame.borderTop}px</span>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        value={frame.borderTop}
                        onChange={(e) => onUpdateFrame({ borderTop: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem' }}>Abajo: {frame.borderBottom}px</span>
                      <input
                        type="range"
                        min="0"
                        max="150"
                        value={frame.borderBottom}
                        onChange={(e) => onUpdateFrame({ borderBottom: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem' }}>Izquierda: {frame.borderLeft}px</span>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        value={frame.borderLeft}
                        onChange={(e) => onUpdateFrame({ borderLeft: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '0.7rem' }}>Derecha: {frame.borderRight}px</span>
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

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.65rem', borderRadius: '0.5rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Línea / Filete Interior:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="color"
                      value={frame.innerStrokeColor || '#f59e0b'}
                      onChange={(e) => onUpdateFrame({ innerStrokeColor: e.target.value })}
                      style={{ width: '2rem', height: '1.8rem', border: 'none', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.75rem' }}>Grosor:</span>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={frame.innerStrokeWidth}
                      onChange={(e) => onUpdateFrame({ innerStrokeWidth: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.65rem', borderRadius: '0.5rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Textos del Banner:
                  </label>
                  <div className="form-group">
                    <input
                      type="text"
                      value={frame.eventTitle || ''}
                      onChange={(e) => onUpdateFrame({ eventTitle: e.target.value })}
                      placeholder="Título Principal (ej. Servicio de Doctrina)"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <input
                      type="text"
                      value={frame.eventSubtitle || ''}
                      onChange={(e) => onUpdateFrame({ eventSubtitle: e.target.value })}
                      placeholder="Subtítulo / Cita Bíblica"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <input
                      type="text"
                      value={frame.eventDate || ''}
                      onChange={(e) => onUpdateFrame({ eventDate: e.target.value })}
                      placeholder="Fecha / Ubicación"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {frame.style === 'church-event' && (
              <>
                <div className="form-group" style={{ marginTop: '0.85rem' }}>
                  <label>Nombre del Evento / Culto:</label>
                  <input
                    type="text"
                    value={frame.eventTitle || ''}
                    onChange={(e) => onUpdateFrame({ eventTitle: e.target.value })}
                    placeholder="Ej. Servicio Especial de Doctrina"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Fecha o Leyenda Adicional:</label>
                  <input
                    type="text"
                    value={frame.eventDate || ''}
                    onChange={(e) => onUpdateFrame({ eventDate: e.target.value })}
                    placeholder="Ej. Agosto 2026 • LLDM App"
                    className="form-input"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
