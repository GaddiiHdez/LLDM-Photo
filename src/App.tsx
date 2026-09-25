import React, { useState } from 'react';
import { Header } from './components/Header';
import { BatchDropzone } from './components/BatchDropzone';
import { ThumbnailBar } from './components/ThumbnailBar';
import { PreviewStage } from './components/PreviewStage';
import { SidebarControls } from './components/SidebarControls';
import { ExportModal } from './components/ExportModal';

import type {
  PhotoItem,
  WatermarkSettings,
  FrameSettings,
  ImageAdjustments,
  CropSettings,
  PresetType,
} from './types/editor';

import { getSamplePhotos } from './utils/samplePhotos';
import { exportSinglePhoto, exportBatchAsZip } from './utils/batchExporter';
import { getDrawableImageUrl } from './utils/rawDecoder';
import { decodeTrueRawFile, computeAdaptiveChurchEnhancement } from './utils/rawProcessingEngine';
import { getDefaultAppSettings, saveDefaultAppSettings, getSavedPngFrames } from './utils/frameStorage';
import { getSavedLogos } from './utils/logoStorage';

const PRESET_ADJUSTMENTS: Record<PresetType, ImageAdjustments> = {
  'auto-church': computeAdaptiveChurchEnhancement(null),
  'warm-worship': {
    brightness: 5,
    contrast: 10,
    saturation: 15,
    warmth: 35,
    shadows: 10,
    highlights: -5,
    sharpness: 15,
  },
  'vibrant-praise': {
    brightness: 10,
    contrast: 22,
    saturation: 30,
    warmth: 0,
    shadows: 15,
    highlights: -15,
    sharpness: 30,
  },
  'elegant-bw': {
    brightness: 5,
    contrast: 30,
    saturation: -100,
    warmth: 0,
    shadows: 10,
    highlights: -10,
    sharpness: 20,
  },
  custom: {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
    shadows: 0,
    highlights: 0,
    sharpness: 0,
  },
};

export const App: React.FC = () => {
  const savedDefaults = getDefaultAppSettings();
  const savedPngFrames = getSavedPngFrames();
  const defaultPngFrame = savedPngFrames.find((f) => f.isDefault) || savedPngFrames[0];

  const savedLogos = getSavedLogos();
  const defaultLogo = savedLogos.find((l) => l.isDefault) || savedLogos.find((l) => l.id === 'official-logo-lineal') || savedLogos[0];

  // State
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string>('');

  // Watermark State (Carga default guardado o inicial)
  const [watermark, setWatermark] = useState<WatermarkSettings>(
    savedDefaults?.watermark || {
      enabled: true,
      type: 'image',
      text: 'LLDM Photo Studio',
      imageDataUrl: defaultLogo ? defaultLogo.imageDataUrl : '/logo-lldm-studio-lineal.jpg',
      position: 'bottom-right',
      opacity: 0.75,
      size: 24,
      color: '#ffffff',
      logoTintEnabled: false,
      logoTintColor: '#ffffff',
      dropShadow: true,
      shadowColor: 'rgba(0, 0, 0, 0.75)',
      shadowBlur: 8,
      strokeEnabled: false,
      strokeColor: '#000000',
      strokeWidth: 2,
      blendMode: 'normal',
    }
  );

  // Frame State (Si hay un marco PNG predeterminado guardado, se activa por defecto)
  const [frame, setFrame] = useState<FrameSettings>(
    savedDefaults?.frame || {
      style: defaultPngFrame ? 'custom-png' : 'church-event',
      pngDataUrl: defaultPngFrame ? defaultPngFrame.pngDataUrl : null,
      pngFit: 'stretch',
      borderTop: 20,
      borderBottom: 60,
      borderLeft: 20,
      borderRight: 20,
      borderColor: '#0f172a',
      borderColor2: '#1e3a8a',
      useGradient: true,
      borderRadius: 0,
      innerStrokeColor: '#f59e0b',
      innerStrokeWidth: 2,
      eventTitle: 'Servicio de Alabanzas',
      eventSubtitle: 'Fotografía de Iglesia Local',
      eventDate: 'Agosto 2026 • LLDM App',
      textColor: '#ffffff',
      fontFamily: 'sans-serif',
      textAlignment: 'center',
    }
  );

  // Export Progress State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, currentName: '' });

  // Handle uploaded files (Soporta archivos RAW .NEF, .CR2, .ARW y cálculo adaptativo de rango dinámico)
  const handleFilesSelected = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    const newPhotos: PhotoItem[] = await Promise.all(
      fileArray.map(async (file, i) => {
        const isRaw = /\.(cr2|nef|arw|dng|raf)$/i.test(file.name);
        const url = await getDrawableImageUrl(file);
        const id = `${Date.now()}-${i}-${file.name}`;

        let adaptiveAdjustments = { ...PRESET_ADJUSTMENTS['auto-church'] };

        if (isRaw) {
          const sensorData = await decodeTrueRawFile(file);
          if (sensorData) {
            adaptiveAdjustments = computeAdaptiveChurchEnhancement(sensorData);
          }
        }

        return {
          id,
          file,
          name: file.name,
          sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          originalUrl: url,
          thumbnailUrl: url,
          width: 6000,
          height: 4000,
          isRaw,
          adjustments: adaptiveAdjustments,
          crop: {
            aspectRatio: 'original',
            orientation: 'landscape',
            offsetX: 0,
            offsetY: 0,
            zoom: 1.0,
          },
          preset: 'auto-church',
        };
      })
    );

    setPhotos((prev) => [...prev, ...newPhotos]);
    if (!activePhotoId && newPhotos.length > 0) {
      setActivePhotoId(newPhotos[0].id);
    }
  };

  // Sample photos
  const handleLoadSamples = () => {
    const samples = getSamplePhotos();
    setPhotos(samples);
    setActivePhotoId(samples[0].id);
  };

  // Active photo selection
  const activePhoto = photos.find((p) => p.id === activePhotoId) || photos[0];

  // Update adjustments for active photo
  const handleUpdateAdjustments = (newAdjustments: ImageAdjustments) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === activePhotoId ? { ...p, adjustments: newAdjustments, preset: 'custom' } : p))
    );
  };

  // Update crop settings for active photo
  const handleUpdateCrop = (newCrop: CropSettings) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === activePhotoId ? { ...p, crop: newCrop } : p))
    );
  };

  // Apply preset to active photo
  const handleApplyPreset = (preset: PresetType) => {
    const adjustments = PRESET_ADJUSTMENTS[preset];
    setPhotos((prev) =>
      prev.map((p) => (p.id === activePhotoId ? { ...p, adjustments, preset } : p))
    );
  };

  // Apply active settings to ALL photos in batch
  const handleApplySettingsToAll = () => {
    if (!activePhoto) return;
    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        adjustments: { ...activePhoto.adjustments },
        crop: { ...activePhoto.crop },
        preset: activePhoto.preset,
      }))
    );
  };

  // Single Photo Export
  const handleSingleExport = async () => {
    if (!activePhoto) return;
    try {
      await exportSinglePhoto(activePhoto, watermark, frame);
    } catch (err) {
      console.error('Error exportando foto:', err);
    }
  };

  // Batch Export ZIP
  const handleExportBatch = async () => {
    if (photos.length === 0) return;
    setIsExporting(true);
    setExportProgress({ current: 0, total: photos.length, currentName: '' });

    try {
      await exportBatchAsZip(
        photos,
        watermark,
        frame,
        (current, total, currentName) => {
          setExportProgress({ current, total, currentName });
        }
      );
    } catch (err) {
      console.error('Error en exportación en lote:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Delete individual photo
  const handleDeletePhoto = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = photos.filter((p) => p.id !== id);
    setPhotos(filtered);
    if (activePhotoId === id && filtered.length > 0) {
      setActivePhotoId(filtered[0].id);
    }
  };

  // Guardar configuración actual como Default global
  const handleSaveAsDefaultAppSettings = () => {
    const sampleCrop = photos[0]?.crop || {
      aspectRatio: 'original',
      orientation: 'landscape',
      offsetX: 0,
      offsetY: 0,
      zoom: 1.0,
    };
    saveDefaultAppSettings({
      frame,
      watermark,
      crop: sampleCrop,
    });
  };

  return (
    <div className="app-container">
      {/* Top Header Bar */}
      <Header
        totalPhotos={photos.length}
        onAddPhotosClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = 'image/*,.cr2,.nef,.arw,.dng,.raf';
          input.onchange = (e: any) => e.target.files && handleFilesSelected(e.target.files);
          input.click();
        }}
        onExportBatch={handleExportBatch}
      />

      {/* Main Studio Area */}
      {photos.length === 0 ? (
        <BatchDropzone
          onFilesSelected={handleFilesSelected}
          onLoadSamples={handleLoadSamples}
        />
      ) : (
        <div className="studio-body">
          {/* Central Live Preview Stage */}
          <PreviewStage
            photo={activePhoto}
            watermark={watermark}
            frame={frame}
            onSingleExport={handleSingleExport}
            onUpdateCrop={handleUpdateCrop}
          />

          {/* Right Sidebar Controls */}
          <SidebarControls
            photo={activePhoto}
            watermark={watermark}
            frame={frame}
            onUpdateAdjustments={handleUpdateAdjustments}
            onUpdateCrop={handleUpdateCrop}
            onApplyPreset={handleApplyPreset}
            onUpdateWatermark={(wm) => setWatermark((prev) => ({ ...prev, ...wm }))}
            onUpdateFrame={(f) => setFrame((prev) => ({ ...prev, ...f }))}
            onApplySettingsToAll={handleApplySettingsToAll}
            onSaveAsDefaultAppSettings={handleSaveAsDefaultAppSettings}
          />
        </div>
      )}

      {/* Bottom Thumbnail Bar */}
      {photos.length > 0 && (
        <ThumbnailBar
          photos={photos}
          activePhotoId={activePhotoId}
          onSelectPhoto={setActivePhotoId}
          onDeletePhoto={handleDeletePhoto}
          onAddMorePhotos={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*,.cr2,.nef,.arw,.dng,.raf';
            input.onchange = (e: any) => e.target.files && handleFilesSelected(e.target.files);
            input.click();
          }}
          onClearAll={() => {
            setPhotos([]);
            setActivePhotoId('');
          }}
        />
      )}

      {/* Modal Progreso de Exportación ZIP */}
      <ExportModal
        isOpen={isExporting}
        current={exportProgress.current}
        total={exportProgress.total}
        currentName={exportProgress.currentName}
      />
    </div>
  );
};

export default App;
