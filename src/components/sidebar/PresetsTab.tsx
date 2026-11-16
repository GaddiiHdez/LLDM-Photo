import React, { useState, useRef } from 'react';
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
import type { PhotoItem, ImageAdjustments, PresetType } from '../../types/editor';

interface PresetsTabProps {
  photo: PhotoItem;
  customPresets: CustomPreset[];
  onChangeCustomPresets: (presets: CustomPreset[]) => void;
  onApplyPreset: (preset: PresetType, customAdjustments?: ImageAdjustments) => void | Promise<void>;
  onNotify?: (msg: string) => void;
}

const PRESETS_LIST: {
  id: PresetType;
  label: string;
  shortDesc: string;
  icon: React.FC<{ size?: number; className?: string }>;
}[] = [
  { id: 'auto-church', label: 'Auto-Tono', shortDesc: 'Luz y Balance IA', icon: Wand2 },
  { id: 'warm-worship', label: 'Luz Cálida', shortDesc: 'Dorado Solemne', icon: SunMedium },
  { id: 'vibrant-praise', label: 'Escenario Vivo', shortDesc: 'Color y Nitidez', icon: Sparkles },
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
  const presetJsonInputRef = useRef<HTMLInputElement>(null);

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
  };

  const handleExportPresets = () => {
    if (customPresets.length === 0) {
      notify('Guarda al menos un filtro personalizado antes de exportar.');
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

      <div className="oneui-presets-strip">
        {PRESETS_LIST.map((p) => {
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
                  onChangeCustomPresets(deleteCustomPreset(cp.id));
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
  );
};
