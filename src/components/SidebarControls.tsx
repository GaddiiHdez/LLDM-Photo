import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Frame as FrameIcon,
  Crop,
  Wand2,
  SunMedium,
  LayoutGrid,
} from 'lucide-react';
import { getCustomPresets, type CustomPreset } from '../utils/presetStorage';
import { getSavedPngFrames, type SavedPngFrame } from '../utils/frameStorage';
import { getSavedLogos, type SavedLogo } from '../utils/logoStorage';
import { DevelopTab } from './sidebar/DevelopTab';
import { CropTab } from './sidebar/CropTab';
import { PresetsTab } from './sidebar/PresetsTab';
import { FrameTab } from './sidebar/FrameTab';
import { FilmstripTab } from './sidebar/FilmstripTab';
import type {
  PhotoItem,
  ImageAdjustments,
  WatermarkSettings,
  FrameSettings,
  CropSettings,
  PresetType,
} from '../types/editor';

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
  onNotify?: (msg: string) => void;
  isEyedropperActive?: boolean;
  onToggleEyedropper?: () => void;
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
  onApplyCropToAll,
  onSmartCrop,
  onSyncFrameToAll,
  onSyncWatermarkToAll,
  photos = [],
  onSelectPhoto,
  onDeletePhoto,
  onReplacePhoto,
  onMovePhoto,
  onAddMorePhotos,
  activeTab: controlledActiveTab,
  onChangeTab,
  onNotify,
  isEyedropperActive = false,
  onToggleEyedropper,
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

  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [savedFrames, setSavedFrames] = useState<SavedPngFrame[]>([]);
  const [savedLogos, setSavedLogos] = useState<SavedLogo[]>([]);

  useEffect(() => {
    const syncStorage = () => {
      setSavedFrames(getSavedPngFrames());
      setCustomPresets(getCustomPresets());
      setSavedLogos(getSavedLogos());
    };
    syncStorage();
    window.addEventListener('bereasnap-storage-updated', syncStorage);
    return () => window.removeEventListener('bereasnap-storage-updated', syncStorage);
  }, []);

  const hasPngFrame = frame.style === 'custom-png' && Boolean(frame.pngDataUrl);

  return (
    <aside className="oneui-bottom-system">
      {activeTab && (
        <div className="oneui-floating-card card-glass">
          <div
            className="oneui-sheet-handle-row"
            onClick={() => onChangeTab?.(null)}
            title="Tocar para cerrar panel"
          >
            <div className="oneui-sheet-handle" />
          </div>

          {activeTab === 'develop' && (
            <DevelopTab
              photo={photo}
              onUpdateAdjustments={onUpdateAdjustments}
              onApplyPreset={onApplyPreset}
              onApplySettingsToAll={onApplySettingsToAll}
              isEyedropperActive={isEyedropperActive}
              onToggleEyedropper={onToggleEyedropper}
            />
          )}

          {activeTab === 'crop' && (
            <CropTab
              photo={photo}
              hasPngFrame={hasPngFrame}
              onUpdateCrop={onUpdateCrop}
              onSmartCrop={onSmartCrop}
              onApplyCropToAll={onApplyCropToAll}
            />
          )}

          {activeTab === 'presets' && (
            <PresetsTab
              photo={photo}
              customPresets={customPresets}
              onChangeCustomPresets={setCustomPresets}
              onApplyPreset={onApplyPreset}
              onNotify={onNotify}
            />
          )}

          {activeTab === 'frame' && (
            <FrameTab
              photo={photo}
              frame={frame}
              watermark={watermark}
              savedFrames={savedFrames}
              savedLogos={savedLogos}
              onChangeSavedFrames={setSavedFrames}
              onChangeSavedLogos={setSavedLogos}
              onUpdateFrame={onUpdateFrame}
              onUpdateWatermark={onUpdateWatermark}
              onSyncFrameToAll={onSyncFrameToAll}
              onSyncWatermarkToAll={onSyncWatermarkToAll}
            />
          )}

          {activeTab === 'filmstrip' && (
            <FilmstripTab
              photo={photo}
              photos={photos}
              isActiveTab={activeTab === 'filmstrip'}
              onSelectPhoto={onSelectPhoto}
              onDeletePhoto={onDeletePhoto}
              onReplacePhoto={onReplacePhoto}
              onMovePhoto={onMovePhoto}
              onAddMorePhotos={onAddMorePhotos}
            />
          )}
        </div>
      )}

      <nav className="oneui-dock">
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
