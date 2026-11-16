import React, { useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  SunMedium,
  Contrast,
  Droplets,
  Thermometer,
  Moon,
  Sun,
  Focus,
  Copy,
  Shield,
  Palette,
  Pipette,
} from 'lucide-react';
import { HapticRuler } from '../HapticRuler';
import type { PhotoItem, ImageAdjustments, PresetType } from '../../types/editor';

interface DevelopTabProps {
  photo: PhotoItem;
  onUpdateAdjustments: (adjustments: ImageAdjustments) => void;
  onApplyPreset: (preset: PresetType, customAdjustments?: ImageAdjustments) => void | Promise<void>;
  onApplySettingsToAll?: () => void;
  isEyedropperActive?: boolean;
  onToggleEyedropper?: () => void;
}

const LIGHT_PARAMS: {
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
  { key: 'tint', label: 'Matiz', icon: Palette, min: -100, max: 100, step: 1 },
  { key: 'noiseReduction', label: 'Reducir Ruido', icon: Shield, min: 0, max: 100, step: 1 },
  { key: 'sharpness', label: 'Nitidez', icon: Focus, min: 0, max: 100, step: 1 },
];

export const DevelopTab: React.FC<DevelopTabProps> = ({
  photo,
  onUpdateAdjustments,
  onApplyPreset,
  onApplySettingsToAll,
  isEyedropperActive = false,
  onToggleEyedropper,
}) => {
  const [activeLightParam, setActiveLightParam] = useState<keyof ImageAdjustments>('brightness');

  const activeParamConfig = LIGHT_PARAMS.find((p) => p.key === activeLightParam) || LIGHT_PARAMS[0];
  const activeValue = Number(photo.adjustments[activeLightParam] ?? 0);

  const handleSliderChange = (key: keyof ImageAdjustments, value: number) => {
    onUpdateAdjustments({
      ...photo.adjustments,
      [key]: value,
    });
  };

  return (
    <div className="oneui-deck-inner">
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

      <div className="oneui-dials-strip">
        <button
          type="button"
          onClick={() => onApplyPreset('auto-church')}
          className={`oneui-auto-pill ${photo.preset === 'auto-church' ? 'active' : ''}`}
          title="Auto-exposición y balance inteligente"
        >
          <span>Auto</span>
        </button>

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

        {onToggleEyedropper && (
          <button
            type="button"
            onClick={onToggleEyedropper}
            className={`oneui-auto-pill ${isEyedropperActive ? 'active' : ''}`}
            title="Gotero de Balance de Blancos: toca un tono blanco o gris neutro en la foto"
          >
            <Pipette size={10} style={{ display: 'inline', marginRight: 2 }} />
            <span>Gotero WB</span>
          </button>
        )}

        {LIGHT_PARAMS.map((p) => {
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
                <div className={`oneui-dial-circle ${isModified ? 'modified' : ''}`}>
                  <Icon size={16} />
                  {isModified && <span className="oneui-mod-dot" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

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
  );
};
