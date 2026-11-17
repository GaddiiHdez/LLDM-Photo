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

type ParamGroup = 'all' | 'light' | 'color' | 'detail';

const GROUP_LABELS: { id: ParamGroup; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'light', label: 'Luz' },
  { id: 'color', label: 'Color' },
  { id: 'detail', label: 'Detalle' },
];

const LIGHT_PARAMS: {
  key: keyof ImageAdjustments;
  group: Exclude<ParamGroup, 'all'>;
  groupTitle: string;
  label: string;
  icon: React.FC<{ size?: number; className?: string }>;
  min: number;
  max: number;
  step: number;
}[] = [
  { key: 'brightness', group: 'light', groupTitle: 'Luz', label: 'Exposición', icon: SunMedium, min: -100, max: 100, step: 1 },
  { key: 'contrast', group: 'light', groupTitle: 'Luz', label: 'Contraste', icon: Contrast, min: -100, max: 100, step: 1 },
  { key: 'highlights', group: 'light', groupTitle: 'Luz', label: 'Altas Luces', icon: Sun, min: -100, max: 100, step: 1 },
  { key: 'shadows', group: 'light', groupTitle: 'Luz', label: 'Sombras', icon: Moon, min: -100, max: 100, step: 1 },
  { key: 'clarity', group: 'light', groupTitle: 'Luz', label: 'Claridad', icon: Sparkles, min: -100, max: 100, step: 1 },
  { key: 'saturation', group: 'color', groupTitle: 'Color', label: 'Saturación', icon: Droplets, min: -100, max: 100, step: 1 },
  { key: 'warmth', group: 'color', groupTitle: 'Color', label: 'Calidez', icon: Thermometer, min: -100, max: 100, step: 1 },
  { key: 'tint', group: 'color', groupTitle: 'Color', label: 'Matiz', icon: Palette, min: -100, max: 100, step: 1 },
  { key: 'noiseReduction', group: 'detail', groupTitle: 'Detalle', label: 'Reducir Ruido', icon: Shield, min: 0, max: 100, step: 1 },
  { key: 'sharpness', group: 'detail', groupTitle: 'Detalle', label: 'Nitidez', icon: Focus, min: 0, max: 100, step: 1 },
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
  const [activeGroup, setActiveGroup] = useState<ParamGroup>('all');

  const activeParamConfig = LIGHT_PARAMS.find((p) => p.key === activeLightParam) || LIGHT_PARAMS[0];
  const visibleParams = activeGroup === 'all' ? LIGHT_PARAMS : LIGHT_PARAMS.filter((p) => p.group === activeGroup);
  const activeValue = Number(photo.adjustments[activeLightParam] ?? 0);
  const formattedActiveVal = activeValue > 0 ? `+${activeValue}` : `${activeValue}`;
  const skinGuardEnabled = photo.adjustments.skinToneGuard !== false;

  const handleSelectGroup = (group: ParamGroup) => {
    setActiveGroup(group);
    if (group !== 'all' && activeParamConfig.group !== group) {
      const firstInGroup = LIGHT_PARAMS.find((p) => p.group === group);
      if (firstInGroup) setActiveLightParam(firstInGroup.key);
    }
  };

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
          <span className="oneui-param-title">
            {activeParamConfig.groupTitle.toUpperCase()} • {activeParamConfig.label.toUpperCase()}
          </span>
          <span className={`oneui-param-val-pill ${activeValue !== 0 ? 'modified' : ''}`}>
            {formattedActiveVal}
          </span>
        </div>
        <div className="oneui-deck-actions-right">
          <button
            type="button"
            disabled={activeValue === 0}
            onClick={() => handleSliderChange(activeLightParam, 0)}
            className="oneui-reset-tiny-btn"
            style={{ opacity: activeValue !== 0 ? 1 : 0.45 }}
            title="Restablecer este parámetro a 0"
            aria-label={`Restablecer ${activeParamConfig.label} a cero`}
          >
            <RotateCcw size={11} />
            <span>0</span>
          </button>
          {onApplySettingsToAll && (
            <button
              type="button"
              onClick={onApplySettingsToAll}
              className="oneui-sync-pill-btn"
              title="Copiar estos ajustes de luz y color a todas las fotos (conserva encuadres)"
            >
              <Copy size={11} />
              <span>A todas</span>
            </button>
          )}
        </div>
      </div>

      {/* Grupos de Ajustes + Ayuda rápida */}
      <div className="oneui-group-chips-row">
        {GROUP_LABELS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => handleSelectGroup(g.id)}
            className={`oneui-group-chip ${activeGroup === g.id ? 'active' : ''}`}
          >
            {g.label}
          </button>
        ))}
        {photo.metadata?.cameraModel && (
          <span className="oneui-param-meta-tag" style={{ marginLeft: 'auto' }}>
            {photo.metadata.cameraModel}
            {photo.metadata.iso ? ` • ISO ${photo.metadata.iso}` : ''}
          </span>
        )}
      </div>

      <div className="oneui-dials-strip">
        <button
          type="button"
          onClick={() => onApplyPreset('auto-church')}
          className={`oneui-auto-pill ${photo.preset === 'auto-church' ? 'active' : ''}`}
          title="Auto-Tono inteligente para luz interior y rostros"
          aria-pressed={photo.preset === 'auto-church'}
        >
          <span>Auto-Tono</span>
        </button>

        <button
          type="button"
          onClick={() =>
            onUpdateAdjustments({
              ...photo.adjustments,
              skinToneGuard: !skinGuardEnabled,
            })
          }
          className={`oneui-auto-pill ${skinGuardEnabled ? 'active' : ''}`}
          title="Protector de piel: evita rostros naranjas al subir calidez"
          aria-pressed={skinGuardEnabled}
        >
          <Shield size={11} style={{ marginRight: 3 }} />
          <span>Piel IA</span>
        </button>

        {onToggleEyedropper && (
          <button
            type="button"
            onClick={onToggleEyedropper}
            className={`oneui-auto-pill ${isEyedropperActive ? 'active' : ''}`}
            title="Gotero de balance: toca una zona blanca o gris neutra en la foto"
            aria-pressed={isEyedropperActive}
          >
            <Pipette size={11} style={{ marginRight: 3 }} />
            <span>Gotero WB</span>
          </button>
        )}

        {visibleParams.map((p) => {
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
              aria-label={`${p.label}: ${val > 0 ? `+${val}` : val}`}
              aria-pressed={isSelected}
            >
              {isSelected ? (
                <div className="oneui-active-dial-circle">
                  <div
                    className="oneui-dial-pie"
                    style={{
                      background: val !== 0
                        ? `conic-gradient(var(--oneui-accent) ${Math.abs(val) * 1.8}deg, var(--oneui-surface-subtle) 0deg)`
                        : 'var(--oneui-surface-subtle)',
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
          ariaLabel={`${activeParamConfig.label} (${formattedActiveVal})`}
        />
      </div>

      {(isEyedropperActive || activeLightParam === 'warmth' || activeLightParam === 'tint') && (
        <p className="oneui-helper-tip">
          {isEyedropperActive
            ? 'Gotero WB activo: toca una superficie blanca o gris neutra en la foto para calibrar.'
            : skinGuardEnabled
            ? 'Piel IA activa: protege los rostros para evitar saturación naranja excesiva.'
            : 'Piel IA desactivada: la calidez afecta por igual rostros y fondo.'}
        </p>
      )}
    </div>
  );
};
