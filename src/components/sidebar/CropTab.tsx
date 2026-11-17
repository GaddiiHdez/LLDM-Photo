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
    ...(hasPngFrame ? [{ id: 'frame' as AspectRatioType, label: 'Al marco' }] : []),
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

  const cropZoom = Number(photo.crop?.zoom || 1);

  return (
    <div className="oneui-deck-inner">
      <div className="oneui-deck-title-row">
        <div className="oneui-param-title-group">
          <span className="oneui-param-title">
            {activeCropMode === 'straighten'
              ? 'NIVELAR HORIZONTE'
              : 'PROPORCIÓN Y RECORTE'}
          </span>
          <span className="oneui-param-val-pill">
            {activeCropMode === 'straighten'
              ? `${(photo.crop?.straighten || 0) > 0 ? '+' : ''}${Number((photo.crop?.straighten || 0).toFixed(1))}°`
              : `${cropZoom.toFixed(2)}x`}
          </span>
        </div>

        <div className="oneui-deck-actions-right">
          <button
            type="button"
            onClick={() => {
              onUpdateCrop({
                ...photo.crop,
                aspectRatio: 'original',
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
            title="Restablecer proporción, giro y recorte"
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
          className={`oneui-geom-labeled-btn ${activeCropMode === 'straighten' ? 'active' : ''}`}
          title="Nivelar horizonte con regla"
          aria-label="Nivelar horizonte"
          aria-pressed={activeCropMode === 'straighten'}
        >
          <span className="oneui-geom-circle-inner">
            <Compass size={16} />
          </span>
          <span className="oneui-geom-btn-label">Nivelar</span>
        </button>

        <button
          type="button"
          onClick={() => handleCropChange('rotation', ((photo.crop?.rotation || 0) + 90) % 360)}
          className={`oneui-geom-labeled-btn ${photo.crop?.rotation ? 'active' : ''}`}
          title="Girar 90° a la derecha"
          aria-label="Girar 90 grados"
        >
          <span className="oneui-geom-circle-inner">
            <RotateCw size={16} />
          </span>
          <span className="oneui-geom-btn-label">Girar 90°</span>
        </button>

        <button
          type="button"
          onClick={() => handleCropChange('flipH', !photo.crop?.flipH)}
          className={`oneui-geom-labeled-btn ${photo.crop?.flipH ? 'active' : ''}`}
          title="Voltear en espejo horizontal"
          aria-label="Voltear horizontalmente"
          aria-pressed={!!photo.crop?.flipH}
        >
          <span className="oneui-geom-circle-inner">
            <FlipHorizontal2 size={16} />
          </span>
          <span className="oneui-geom-btn-label">Espejo</span>
        </button>

        {onSmartCrop && (
          <button
            type="button"
            onClick={onSmartCrop}
            className="oneui-geom-labeled-btn accent"
            title="Reencuadre inteligente centrado en rostros"
            aria-label="Reencuadre inteligente"
          >
            <span className="oneui-geom-circle-inner">
              <Wand2 size={15} />
            </span>
            <span className="oneui-geom-btn-label">Auto IA</span>
          </button>
        )}

        {onApplyCropToAll && (
          <button
            type="button"
            onClick={onApplyCropToAll}
            className="oneui-geom-labeled-btn"
            title="Aplicar proporción, giro y espejo a todo el lote"
            aria-label="Aplicar encuadre a todas"
          >
            <span className="oneui-geom-circle-inner">
              <CheckCheck size={15} />
            </span>
            <span className="oneui-geom-btn-label">Al lote</span>
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
            ariaLabel="Nivelar horizonte en grados"
          />
        </div>
      ) : (
        <>
          <div className="oneui-ratios-carousel">
            {ratioList.map((r) => {
              const isSelected = (photo.crop?.aspectRatio || 'original') === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleCropChange('aspectRatio', r.id)}
                  className={`oneui-ratio-pill-btn ${isSelected ? 'active' : ''}`}
                  aria-pressed={isSelected}
                >
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>

          <div className="oneui-crop-zoom-row">
            <span className="oneui-crop-zoom-label">Zoom de recorte</span>
            <input
              type="range"
              min={1}
              max={2.5}
              step={0.05}
              value={cropZoom}
              onChange={(e) => handleCropChange('zoom', parseFloat(e.target.value))}
              aria-label="Zoom de recorte de salida"
              className="oneui-crop-zoom-range"
            />
            <span className="oneui-crop-zoom-val">{cropZoom.toFixed(2)}x</span>
          </div>
        </>
      )}
    </div>
  );
};
