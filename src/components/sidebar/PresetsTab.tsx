import React, { useState, useRef, useEffect } from 'react';
import {
  Star,
  Wand2,
  SunMedium,
  Contrast,
  Sparkles,
  Check,
  X,
  Plus,
  Download,
  Upload,
  RotateCcw,
} from 'lucide-react';
import {
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  exportPresetsToFile,
  importPresetsFromJson,
  type CustomPreset,
} from '../../utils/presetStorage';
import { processImagePixels, type PixelScratchRef } from '../../utils/pixelFilters';
import type { PhotoItem, ImageAdjustments, PresetType } from '../../types/editor';

interface PresetsTabProps {
  photo: PhotoItem;
  customPresets: CustomPreset[];
  onChangeCustomPresets: (presets: CustomPreset[]) => void;
  onApplyPreset: (preset: PresetType, customAdjustments?: ImageAdjustments) => void | Promise<void>;
  onNotify?: (msg: string) => void;
}

const PRESET_THUMB_ADJ: Record<string, ImageAdjustments> = {
  'auto-church': { brightness: 10, contrast: 12, saturation: 8, warmth: 4, shadows: 18, highlights: -14, sharpness: 12, clarity: 6 },
  'warm-worship': { brightness: 5, contrast: 10, saturation: 15, warmth: 35, shadows: 10, highlights: -5, sharpness: 15 },
  'vibrant-praise': { brightness: 10, contrast: 22, saturation: 30, warmth: 0, shadows: 15, highlights: -15, sharpness: 30 },
  'elegant-bw': { brightness: 5, contrast: 30, saturation: -100, warmth: 0, shadows: 10, highlights: -10, sharpness: 20 },
};

const PRESETS_LIST: {
  id: PresetType;
  label: string;
  shortDesc: string;
  icon: React.FC<{ size?: number; className?: string }>;
}[] = [
  { id: 'auto-church', label: 'Auto-Tono', shortDesc: 'Luz y Balance IA', icon: Wand2 },
  { id: 'warm-worship', label: 'Luz Cálida', shortDesc: 'Dorado Solemne', icon: SunMedium },
  { id: 'vibrant-praise', label: 'Escenario', shortDesc: 'Color y Nitidez', icon: Sparkles },
  { id: 'elegant-bw', label: 'Monocromo', shortDesc: 'B&N Editorial', icon: Contrast },
];

export const PresetsTab: React.FC<PresetsTabProps> = ({
  photo,
  customPresets,
  onChangeCustomPresets,
  onApplyPreset,
  onNotify,
}) => {
  const [showSavePresetInput, setShowSavePresetInput] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [thumbPreviews, setThumbPreviews] = useState<Record<string, string>>({});
  const presetJsonInputRef = useRef<HTMLInputElement>(null);

  // Generar miniaturas acotadas de la fotografía actual para los filtros base y personalizados
  useEffect(() => {
    const srcUrl = photo.thumbnailUrl || photo.originalUrl;
    if (!srcUrl) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled || !img.naturalWidth || !img.naturalHeight) return;
      const targetW = 84;
      const targetH = Math.max(48, Math.min(72, Math.round((img.naturalHeight / img.naturalWidth) * targetW)));
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const scratchRef: PixelScratchRef = { buffer: null };
      const generated: Record<string, string> = {};

      const renderThumb = (id: string, adj: ImageAdjustments) => {
        ctx.clearRect(0, 0, targetW, targetH);
        const br = 1 + (adj.brightness || 0) / 100;
        const ct = 1 + (adj.contrast || 0) / 100;
        const st = Math.max(0, 1 + (adj.saturation || 0) / 100);
        ctx.filter = `brightness(${br}) contrast(${ct}) saturate(${st})`;
        ctx.drawImage(img, 0, 0, targetW, targetH);
        ctx.filter = 'none';
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        processImagePixels(imgData.data, targetW, targetH, adj, true, scratchRef);
        ctx.putImageData(imgData, 0, 0);
        generated[id] = canvas.toDataURL('image/jpeg', 0.72);
      };

      for (const p of PRESETS_LIST) {
        const adj = PRESET_THUMB_ADJ[p.id];
        if (adj) renderThumb(p.id, adj);
      }
      // Limitar miniaturas personalizadas renderizadas a 12 para mantener la RAM acotada
      for (const cp of customPresets.slice(0, 12)) {
        renderThumb(cp.id, cp.adjustments);
      }
      scratchRef.buffer = null;
      canvas.width = 0;
      canvas.height = 0;

      if (!cancelled) {
        setThumbPreviews(generated);
      }
    };
    img.src = srcUrl;

    return () => {
      cancelled = true;
    };
  }, [photo.id, photo.thumbnailUrl, photo.originalUrl, customPresets]);

  const notify = (msg: string) => {
    if (onNotify) onNotify(msg);
    else alert(msg);
  };

  const handleSaveCustomPreset = () => {
    if (!newPresetName.trim()) return;
    const updated = saveCustomPreset(newPresetName.trim(), photo.adjustments);
    onChangeCustomPresets(updated);
    const createdId = updated[0]?.id || 'custom';
    onApplyPreset(createdId, photo.adjustments);
    setNewPresetName('');
    setShowSavePresetInput(false);
    notify('✓ Filtro guardado en "Mis filtros"');
  };

  const handleExportPresets = async () => {
    if (customPresets.length === 0) {
      notify('Guarda al menos un filtro personalizado antes de exportar.');
      return;
    }
    const res = await exportPresetsToFile(customPresets);
    notify(res.message);
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
          onChangeCustomPresets(getCustomPresets());
        }
        notify(res.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="oneui-deck-inner">
      <div className="oneui-deck-title-row">
        <div className="oneui-param-title-group">
          <span className="oneui-param-title">FILTROS</span>
          <span className="oneui-param-meta-tag">
            {photo.preset === 'custom'
              ? 'Personalizado'
              : PRESETS_LIST.find((p) => p.id === photo.preset)?.label ||
                customPresets.find((c) => c.id === photo.preset)?.name ||
                photo.preset}
          </span>
        </div>
        {showSavePresetInput ? (
          <div className="oneui-inline-save">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Nombre del filtro..."
              className="oneui-mini-input"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCustomPreset()}
            />
            <button
              type="button"
              onClick={handleSaveCustomPreset}
              className="oneui-mini-action-btn primary"
              aria-label="Confirmar guardado de filtro"
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              onClick={() => setShowSavePresetInput(false)}
              className="oneui-mini-action-btn"
              aria-label="Cancelar"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="oneui-deck-actions-right">
            <input
              ref={presetJsonInputRef}
              type="file"
              accept="application/json,.json,text/plain"
              onChange={handleImportPresets}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => setShowSavePresetInput(true)}
              className="oneui-reset-tiny-btn"
              title="Guardar ajustes actuales como un nuevo filtro reutilizable"
            >
              <Plus size={11} />
              <span>Guardar</span>
            </button>
            <button
              type="button"
              onClick={handleExportPresets}
              className="oneui-reset-tiny-btn"
              title="Exportar Mis filtros a archivo JSON"
            >
              <Download size={11} />
              <span>Exportar</span>
            </button>
            <button
              type="button"
              onClick={() => presetJsonInputRef.current?.click()}
              className="oneui-reset-tiny-btn"
              title="Importar filtros desde archivo JSON"
            >
              <Upload size={11} />
              <span>Importar</span>
            </button>
            <button
              type="button"
              onClick={() => onApplyPreset('custom')}
              className="oneui-reset-tiny-btn"
              title="Dejar luz y color en neutro (conserva tu encuadre y marco)"
            >
              <RotateCcw size={11} />
              <span>Sin filtro</span>
            </button>
          </div>
        )}
      </div>

      <span className="oneui-presets-section-label">Estilos base</span>
      <div className="oneui-presets-strip">
        {PRESETS_LIST.map((p) => {
          const Icon = p.icon;
          const isActive = photo.preset === p.id;
          const thumbUrl = thumbPreviews[p.id];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onApplyPreset(p.id)}
              className={`oneui-preset-card ${isActive ? 'active' : ''}`}
              title={p.shortDesc}
              aria-pressed={isActive}
            >
              {thumbUrl ? (
                <div className="oneui-preset-thumb">
                  <img src={thumbUrl} alt={p.label} />
                </div>
              ) : (
                <div className="oneui-preset-icon-wrap">
                  <Icon size={14} />
                </div>
              )}
              <strong>{p.label}</strong>
            </button>
          );
        })}
      </div>

      {customPresets.length > 0 && (
        <>
          <span className="oneui-presets-section-label">
            Mis filtros ({customPresets.length})
          </span>
          <div className="oneui-presets-strip">
            {customPresets.map((cp) => {
              const isActive = photo.preset === cp.id;
              const thumbUrl = thumbPreviews[cp.id];
              return (
                <div key={cp.id} className={`oneui-preset-card custom ${isActive ? 'active' : ''}`}>
                  <button
                    type="button"
                    onClick={() => onApplyPreset(cp.id, cp.adjustments)}
                    className="oneui-preset-select-btn"
                    title={`Aplicar filtro ${cp.name}`}
                    aria-pressed={isActive}
                  >
                    {thumbUrl ? (
                      <div className="oneui-preset-thumb">
                        <img src={thumbUrl} alt={cp.name} />
                      </div>
                    ) : (
                      <div className="oneui-preset-icon-wrap">
                        <Star size={13} fill={isActive ? '#fff' : '#f59e0b'} color={isActive ? '#fff' : '#f59e0b'} />
                      </div>
                    )}
                    <strong>{cp.name}</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeCustomPresets(deleteCustomPreset(cp.id))}
                    className="oneui-preset-del"
                    title={`Eliminar filtro ${cp.name}`}
                    aria-label={`Eliminar filtro ${cp.name}`}
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
