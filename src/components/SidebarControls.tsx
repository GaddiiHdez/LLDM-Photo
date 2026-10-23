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
  Trash2,
  RefreshCw,
  Calendar,
  Shield,
  Download,
  Upload,
} from 'lucide-react';
import { formatFrameDate } from '../utils/eventClassifier';
import { HapticRuler } from './HapticRuler';
import {
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  exportPresetsToFile,
  importPresetsFromJson,
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
  photos?: PhotoItem[];
  activePhotoId?: string;
  onSelectPhoto?: (id: string) => void;
  onDeletePhoto?: (id: string) => void;
  onReplacePhoto?: (id: string) => void;
  onMovePhoto?: (fromIndex: number, toIndex: number) => void;
  onAddMorePhotos?: () => void;
  activeTab?: 'develop' | 'crop' | 'presets' | 'frame' | 'filmstrip' | null;
  onChangeTab?: (tab: 'develop' | 'crop' | 'presets' | 'frame' | 'filmstrip' | null) => void;
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
  photos = [],
  onSelectPhoto,
  onDeletePhoto,
  onReplacePhoto,
  onMovePhoto,
  onAddMorePhotos,
  activeTab: controlledActiveTab,
  onChangeTab,
}) => {
  const [internalTab, setInternalTab] = useState<'develop' | 'crop' | 'presets' | 'frame' | 'filmstrip' | null>('develop');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalTab;

  const handleTabClick = (tab: 'develop' | 'crop' | 'presets' | 'frame' | 'filmstrip') => {
    const nextTab = activeTab === tab ? null : tab;
    if (controlledActiveTab === undefined) {
      setInternalTab(nextTab);
    }
    onChangeTab?.(nextTab);
  };
  const [activeLightParam, setActiveLightParam] = useState<keyof ImageAdjustments>('brightness');
  const [activeCropMode, setActiveCropMode] = useState<'straighten' | 'ratios'>('ratios');
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [showSavePresetInput, setShowSavePresetInput] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');

  const [savedFrames, setSavedFrames] = useState<SavedPngFrame[]>([]);
  const framePngInputRef = useRef<HTMLInputElement>(null);
  const presetJsonInputRef = useRef<HTMLInputElement>(null);

  // Estados de Arrastre Táctil para el Carrete Integrado One UI
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const filmstripScrollerRef = useRef<HTMLDivElement>(null);

  const pointerDownRef = useRef<{
    startX: number;
    startY: number;
    index: number;
    timer: number | null;
    pointerId: number;
    hasMoved: boolean;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>, index: number) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const timer = window.setTimeout(() => {
      setIsDragging(true);
      setDragIndex(index);
      setDropIndex(index);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(35);
      }
    }, 140);

    pointerDownRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      index,
      timer,
      pointerId: e.pointerId,
      hasMoved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const downInfo = pointerDownRef.current;
    if (!downInfo) return;

    const dx = Math.abs(e.clientX - downInfo.startX);
    const dy = Math.abs(e.clientY - downInfo.startY);

    if (!isDragging) {
      if (dx > 8 || dy > 8) {
        if (downInfo.timer) {
          clearTimeout(downInfo.timer);
          downInfo.timer = null;
        }
        downInfo.hasMoved = true;
      }
      return;
    }

    e.preventDefault();
    if (!filmstripScrollerRef.current) return;

    const thumbs = Array.from(
      filmstripScrollerRef.current.querySelectorAll('.oneui-filmstrip-thumb')
    ) as HTMLElement[];

    let closestIndex = downInfo.index;
    let minDistance = Infinity;

    thumbs.forEach((thumb, i) => {
      const rect = thumb.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const dist = Math.abs(e.clientX - centerX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    });

    if (closestIndex !== dropIndex) {
      setDropIndex(closestIndex);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    }
  };

  const handlePointerUp = (_e: React.PointerEvent<HTMLElement>, index: number) => {
    const downInfo = pointerDownRef.current;
    if (downInfo?.timer) {
      clearTimeout(downInfo.timer);
      downInfo.timer = null;
    }

    if (isDragging) {
      if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex && onMovePhoto) {
        onMovePhoto(dragIndex, dropIndex);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([25, 30]);
        }
      }
      setIsDragging(false);
      setDragIndex(null);
      setDropIndex(null);
    } else if (!downInfo?.hasMoved && onSelectPhoto && photos?.[index]) {
      onSelectPhoto(photos[index].id);
    }

    pointerDownRef.current = null;
  };

  const handlePointerCancel = () => {
    if (pointerDownRef.current?.timer) {
      clearTimeout(pointerDownRef.current.timer);
    }
    setIsDragging(false);
    setDragIndex(null);
    setDropIndex(null);
    pointerDownRef.current = null;
  };

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

  const handleExportPresets = () => {
    if (customPresets.length === 0) {
      alert('Guarda al menos un filtro personalizado antes de exportar.');
      return;
    }
    exportPresetsToFile(customPresets);
  };

  const handleImportPresets = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importPresetsFromJson(content);
        if (res.success) {
          setCustomPresets(getCustomPresets());
        }
        alert(res.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
    { key: 'clarity', label: 'Claridad', icon: Sparkles, min: -100, max: 100, step: 1 },
    { key: 'highlights', label: 'Altas Luces', icon: Sun, min: -100, max: 100, step: 1 },
    { key: 'shadows', label: 'Sombras', icon: Moon, min: -100, max: 100, step: 1 },
    { key: 'saturation', label: 'Saturación', icon: Droplets, min: -100, max: 100, step: 1 },
    { key: 'warmth', label: 'Calidez', icon: Thermometer, min: -100, max: 100, step: 1 },
    { key: 'noiseReduction', label: 'Reducir Ruido', icon: Shield, min: 0, max: 100, step: 1 },
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
  const activeValue = Number(photo.adjustments[activeLightParam] ?? 0);

  return (
    <aside className="oneui-bottom-system">
      {/* ============================================================
          PANEL DE CONTROL ESTILO SAMSUNG ONE UI (BOTTOM SHEET)
         ============================================================ */}
      {activeTab && (
        <div className="oneui-floating-card card-glass">
          {/* Manija táctil One UI para cerrar/deslizar */}
          <div
            className="oneui-sheet-handle-row"
            onClick={() => onChangeTab?.(null)}
            title="Tocar para cerrar panel"
          >
            <div className="oneui-sheet-handle" />
          </div>

          {/* TAB 1: AJUSTES DE LUZ Y COLOR (DIALES + REGLA GRADUADA ONE UI) */}
          {activeTab === 'develop' && (
            <div className="oneui-deck-inner">
              {/* Título centrado del parámetro activo con datos EXIF en línea */}
              <div className="oneui-deck-title-row">
                <div className="oneui-param-title-group">
                  <span className="oneui-param-title">{activeParamConfig.label.toUpperCase()}</span>
                  {photo.metadata?.cameraModel && (
                    <span className="oneui-param-meta-tag">
                      {photo.metadata.cameraModel}
                      {photo.metadata.focalLength ? ` • ${photo.metadata.focalLength}` : ''}
                      {photo.metadata.fNumber ? ` • f/${photo.metadata.fNumber}` : ''}
                      {photo.metadata.iso ? ` • ISO ${photo.metadata.iso}` : ''}
                    </span>
                  )}
                </div>
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

              {/* Botón Píldora "Protector de Piel IA" */}
              <button
                type="button"
                onClick={() =>
                  onUpdateAdjustments({
                    ...photo.adjustments,
                    skinToneGuard: photo.adjustments.skinToneGuard === false ? true : false,
                  })
                }
                className={`oneui-auto-pill ${photo.adjustments.skinToneGuard !== false ? 'active' : ''}`}
                title="Protector Inteligente de Tono de Piel: Evita que los rostros queden anaranjados al subir calidez"
              >
                <Shield size={10} style={{ display: 'inline', marginRight: 2 }} />
                <span>Piel IA</span>
              </button>

              {/* Diales Circulares */}
              {lightParams.map((p) => {
                const Icon = p.icon;
                const isSelected = activeLightParam === p.key;
                const val = Number(photo.adjustments[p.key] ?? 0);
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
              /* Carrusel Horizontal de Proporciones estilo One UI (Píldoras táctiles) */
              <div className="oneui-ratios-carousel">
                {ratioList.map((r) => {
                  const isSelected = (photo.crop?.aspectRatio || 'original') === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleCropChange('aspectRatio', r.id)}
                      className={`oneui-ratio-pill-btn ${isSelected ? 'active' : ''}`}
                    >
                      <span>{r.label}</span>
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
                    placeholder="Nombre filtro..."
                    className="oneui-mini-input"
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
                  <input
                    ref={presetJsonInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportPresets}
                    style={{ display: 'none' }}
                  />
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
                    onClick={handleExportPresets}
                    className="oneui-reset-tiny-btn"
                    title="Exportar mis filtros a un archivo JSON"
                  >
                    <Download size={11} />
                    <span>Exportar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => presetJsonInputRef.current?.click()}
                    className="oneui-reset-tiny-btn"
                    title="Importar filtros desde un archivo JSON"
                  >
                    <Upload size={11} />
                    <span>Importar</span>
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

            {/* Carrusel Horizontal de Presets Compacto */}
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
                    title={p.shortDesc}
                  >
                    <div className="oneui-preset-icon-wrap">
                      <Icon size={14} />
                    </div>
                    <strong>{p.label}</strong>
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
                      <Star size={13} fill={isActive ? '#fff' : '#f59e0b'} color={isActive ? '#fff' : '#f59e0b'} />
                    </div>
                    <strong>{cp.name}</strong>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomPresets(deleteCustomPreset(cp.id));
                      }}
                      className="oneui-preset-del"
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

            {/* Encabezado compacto: Título + Metadatos de captura + Sync Lote */}
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

            {/* Fila 1: Selector horizontal compacto de marcos */}
            <div className="oneui-frame-cards-row">
              {/* Opción Sin Marco */}
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

              {/* Marco Oficial Centenario Dinámico */}
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

              {/* Botón para subir nuevo marco PNG */}
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

            {/* Fila 2: Editor Dinámico Compacto (Dos campos en UNA sola fila) */}
            {frame.style === 'custom-png' && (
              <div className="oneui-frame-editor-section">
                <div className="oneui-frame-dual-inputs">
                  {/* Campo Izquierdo: Evento */}
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

                  {/* Campo Derecho: Fecha */}
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

                {/* Fila 3: Chips de acceso rápido en UNA sola línea deslizante */}
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
        )}

        {/* TAB 5: CARRETE DE SESIÓN (REORDENAMIENTO TÁCTIL ONE UI) */}
        {activeTab === 'filmstrip' && (
          <div className="oneui-deck-inner">
            <div className="oneui-deck-title-row">
              <span className="oneui-param-title">CARRETE DE SESIÓN ({photos?.length || 0})</span>
              <div className="oneui-deck-actions-right">
                {onAddMorePhotos && (
                  <button
                    type="button"
                    onClick={onAddMorePhotos}
                    className="oneui-sync-pill-btn"
                    title="Añadir más fotos a la sesión"
                  >
                    <Plus size={11} />
                    <span>Añadir</span>
                  </button>
                )}
                {onReplacePhoto && photo && (
                  <button
                    type="button"
                    onClick={() => onReplacePhoto(photo.id)}
                    className="oneui-sync-pill-btn"
                    title="Sustituir foto activa por otra"
                  >
                    <RefreshCw size={11} />
                    <span>Sustituir</span>
                  </button>
                )}
                {onDeletePhoto && photo && (
                  <button
                    type="button"
                    onClick={() => onDeletePhoto(photo.id)}
                    className="oneui-reset-tiny-btn text-danger"
                    title="Eliminar foto activa"
                  >
                    <Trash2 size={11} />
                    <span>Borrar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tira horizontal de miniaturas arrastrables con el dedo */}
            <div
              className="oneui-filmstrip-strip"
              ref={filmstripScrollerRef}
              onPointerMove={handlePointerMove}
              onPointerCancel={handlePointerCancel}
            >
              {(photos || []).map((p, index) => {
                const isActive = p.id === photo?.id;
                const isBeingDragged = isDragging && dragIndex === index;
                const isDropTarget = isDragging && dropIndex === index && dragIndex !== index;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onPointerDown={(e) => handlePointerDown(e, index)}
                    onPointerUp={(e) => handlePointerUp(e, index)}
                    className={`oneui-filmstrip-thumb ${isActive ? 'active' : ''} ${
                      isBeingDragged ? 'is-dragging' : ''
                    } ${isDropTarget ? 'drop-target' : ''}`}
                    title={`#${index + 1}: ${p.name} (Mantén y arrastra para reordenar)`}
                  >
                    <img src={p.thumbnailUrl} alt={p.name} draggable={false} />
                    <span className="oneui-thumb-num">
                      {isDragging && dragIndex === index ? `⇄ ${dropIndex !== null ? dropIndex + 1 : index + 1}` : index + 1}
                    </span>
                    {p.isRaw && <span className="oneui-thumb-raw">RAW</span>}
                  </button>
                );
              })}

              {onAddMorePhotos && (
                <button
                  type="button"
                  onClick={onAddMorePhotos}
                  className="oneui-filmstrip-add-tile"
                  title="Añadir más fotos"
                  aria-label="Añadir fotos"
                >
                  <Plus size={18} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      )}

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
          onClick={() => handleTabClick('crop')}
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
          onClick={() => handleTabClick('presets')}
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
          onClick={() => handleTabClick('develop')}
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
          onClick={() => handleTabClick('frame')}
          className={`oneui-dock-btn ${activeTab === 'frame' ? 'active' : ''}`}
          title="Marco institucional y textos dinámicos"
        >
          <div className="oneui-dock-icon-circle">
            <FrameIcon size={18} />
          </div>
          <span className="oneui-dock-label">Marco</span>
        </button>

        {/* 6. Carrete de Sesión (Togglable) */}
        <button
          type="button"
          onClick={() => handleTabClick('filmstrip')}
          className={`oneui-dock-btn ${activeTab === 'filmstrip' ? 'active' : ''}`}
          title="Abrir carrete de fotografías y reordenar"
        >
          <div className="oneui-dock-icon-circle">
            <LayoutGrid size={18} />
          </div>
          <span className="oneui-dock-label">Carrete</span>
        </button>
      </nav>
    </aside>
  );
};
