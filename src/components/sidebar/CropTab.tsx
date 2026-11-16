import React, { useState } from 'react';
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal2,
  Compass,
  Wand2,
  CheckCheck,
} from 'lucide-react';
import { HapticRuler } from '../HapticRuler';
import type { PhotoItem, CropSettings, AspectRatioType } from '../../types/editor';

interface CropTabProps {
  photo: PhotoItem;
  hasPngFrame: boolean;
  onUpdateCrop: (crop: CropSettings) => void;
  onSmartCrop?: () => void;
  onApplyCropToAll?: () => void;
}

export const CropTab: React.FC<CropTabProps> = ({
  photo,
  hasPngFrame,
  onUpdateCrop,
  onSmartCrop,
  onApplyCropToAll,
}) => {
  const [activeCropMode, setActiveCropMode] = useState<'straighten' | 'ratios'>('ratios');

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

  const handleCropChange = (key: keyof CropSettings, value: any) => {
    onUpdateCrop({
      ...photo.crop,
      [key]: value,
    });
  };

  return (
    <div className="oneui-deck-inner">
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
  );
};
