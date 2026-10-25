import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { Header } from './components/Header';
import { BatchDropzone } from './components/BatchDropzone';
import { PreviewStage } from './components/PreviewStage';
import { SidebarControls } from './components/SidebarControls';
import { ExportModal } from './components/ExportModal';
import { UpdateModal } from './components/UpdateModal';
import { checkForUpdate, type UpdateInfo } from './services/updateService';
import { APP_VERSION } from './version';

import type {
  PhotoItem,
  WatermarkSettings,
  FrameSettings,
  ImageAdjustments,
  CropSettings,
  PresetType,
  ExportOptions,
} from './types/editor';

import { exportSinglePhoto, exportBatchAsZip, exportBatchAsJpgs } from './utils/batchExporter';
import { evictCachedImage } from './utils/canvasEngine';
import { getDrawableImageUrl } from './utils/rawDecoder';
import { analyzeImageHistogram, computeAdaptiveChurchEnhancement } from './utils/rawProcessingEngine';
import { getDefaultAppSettings, saveDefaultAppSettings, getSavedPngFrames } from './utils/frameStorage';
import { extractPhotoMetadata } from './utils/exifParser';
import { classifyChurchEvent } from './utils/eventClassifier';
import {
  computeSmartCropOffsets,
  getFrameAspectRatio,
  resolveCropRatio,
} from './utils/smartCrop';
import {
  saveSessionDraft,
  checkSessionDraft,
  restoreSessionDraft,
  clearSessionDraft,
  type DraftSummary,
} from './utils/sessionDraftStorage';

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


  // Theme State: 'dark' (Grafito Oscuro por defecto para Cuarto Oscuro Fotográfico) o 'light'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedTheme = localStorage.getItem('lldm_studio_theme') as 'light' | 'dark';
      return savedTheme || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    const metaScheme = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
    if (metaScheme) {
      metaScheme.content = theme;
    }
    try {
      localStorage.setItem('lldm_studio_theme', theme);
    } catch (err) {
      console.warn('Error guardando preferencia de tema:', err);
    }
  }, [theme]);

  // Configuración de Barra de Estado Nativa en Android (Evita superposición de notch/reloj)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setOverlaysWebView({ overlay: false });
        StatusBar.setBackgroundColor({ color: '#000000' });
        StatusBar.setStyle({ style: Style.Dark });
      } catch (err) {
        console.warn('Error configurando StatusBar nativo:', err);
      }
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSelectTheme = (mode: 'light' | 'dark') => {
    setTheme(mode);
  };

  // Compare Before/After State
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  // Global Toast Notification (Popover manual + fallback)
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    requestAnimationFrame(() => {
      try {
        (toastRef.current as any)?.showPopover?.();
      } catch {
        // Fallback CSS via .toast-open
      }
    });
    toastTimerRef.current = window.setTimeout(() => {
      try {
        (toastRef.current as any)?.hidePopover?.();
      } catch {}
      setToastMsg(null);
    }, 2800);
  };

  // In-App Update Checker State
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [hasUpdateBadge, setHasUpdateBadge] = useState(false);

  useEffect(() => {
    // Comprobar actualizaciones silenciosamente al iniciar
    checkForUpdate(APP_VERSION)
      .then((info) => {
        if (info.isAvailable) {
          setUpdateInfo(info);
          setHasUpdateBadge(true);
          const dismissed = localStorage.getItem('bereasnap_dismissed_version');
          if (dismissed !== info.latestVersion) {
            setIsUpdateModalOpen(true);
          }
        }
      })
      .catch(() => {
        // Modo offline silencioso
      });
  }, []);


  // State
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string>('');

  // Watermark State (Por defecto desactivada)
  const [watermark, setWatermark] = useState<WatermarkSettings>(
    savedDefaults?.watermark || {
      enabled: false,
      type: 'image',
      text: 'BereaSnap',
      imageDataUrl: '',
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

  // Frame State (Por defecto la foto inicia limpia sin marco 'none')
  const [frame, setFrame] = useState<FrameSettings>(
    savedDefaults?.frame || {
      style: 'none',
      pngDataUrl: defaultPngFrame ? defaultPngFrame.pngDataUrl : '/frames/marco-centenario-V2-notexto.png',
      pngFit: 'stretch',
      borderTop: 24,
      borderBottom: 24,
      borderLeft: 24,
      borderRight: 24,
      borderColor: '#0a0f1d',
      borderColor2: '#0a0f1d',
      useGradient: false,
      borderRadius: 0,
      innerStrokeColor: '#d4af37',
      innerStrokeWidth: 1,
      eventTitle: 'Escuela Dominical',
      eventSubtitle: 'Fotografía Oficial',
      eventDate: 'BereaSnap • Fotografía Oficial',
      textColor: '#ffffff',
      fontFamily: 'serif',
      textAlignment: 'center',
      dynamicTextEnabled: true,
      dynamicTextColorStyle: 'gold',
      dynamicTextPosition: 'centenario-left',
    }
  );

  // Tab Activo del Estudio One UI ('develop' | 'crop' | 'presets' | 'frame' | 'filmstrip' | null)
  const [activeStudioTab, setActiveStudioTab] = useState<'develop' | 'crop' | 'presets' | 'frame' | 'filmstrip' | null>('develop');

  // Export Modal & Progress State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    qualityPreset: 'max',
    filenamePrefix: 'BereaSnap',
    deliveryFormat: 'jpg',
  });

  // Estado del Borrador de Sesión en Segundo Plano (IndexedDB)
  const [pendingDraft, setPendingDraft] = useState<DraftSummary | null>(null);

  // Estados y Refs del Historial de Edición Paso a Paso (Undo / Redo ↺ ↻)
  interface PhotoSnapshot {
    adjustments: ImageAdjustments;
    crop: CropSettings;
    preset: PresetType;
  }
  const historyMapRef = useRef<Map<string, { past: PhotoSnapshot[]; future: PhotoSnapshot[] }>>(new Map());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isHistoryActionRef = useRef(false);
  const historyDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const initialBurstSnapshotRef = useRef<PhotoSnapshot | null>(null);

  // Comprobar borrador previo guardado en IndexedDB al inicio
  useEffect(() => {
    checkSessionDraft().then((summary) => {
      if (summary?.exists && summary.count > 0) {
        setPendingDraft(summary);
      }
    });
  }, []);

  // Guardado Automático de Sesión en IndexedDB (Debounced 1.5s ante cualquier cambio)
  useEffect(() => {
    if (photos.length === 0) return;
    const timer = setTimeout(() => {
      saveSessionDraft(photos, activePhotoId, frame, watermark);
    }, 1500);
    return () => clearTimeout(timer);
  }, [photos, activePhotoId, frame, watermark]);

  // Referencia siempre actualizada del lote (para efectos asíncronos sin cierres obsoletos)
  const photosRef = useRef<PhotoItem[]>([]);

  // Handle uploaded files (Soporta archivos RAW .NEF, .CR2, .ARW, dimensiones reales, metadatos EXIF e histograma adaptativo)
  const handleFilesSelected = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    const newPhotos: PhotoItem[] = await Promise.all(
      fileArray.map(async (file, i) => {
        const isRaw = /\.(cr2|nef|arw|dng|raf)$/i.test(file.name);
        const url = await getDrawableImageUrl(file);
        const id = `${Date.now()}-${i}-${file.name}`;

        let adaptiveAdjustments = { ...PRESET_ADJUSTMENTS['auto-church'] };
        let realWidth = 4000;
        let realHeight = 3000;

        // 1. Extracción de metadatos EXIF y clasificación de evento eclesiástico
        const metadata = await extractPhotoMetadata(file);
        const classification = classifyChurchEvent(metadata.dateTimeOriginal);
        metadata.detectedEvent = classification.eventTitle;
        metadata.dateFormatted = classification.formattedDate;
        metadata.fullDateString = classification.fullDateString;

        // 2. Análisis de histograma del sensor y revelado adaptativo
        const sensorData = await analyzeImageHistogram(url, isRaw);
        if (sensorData) {
          realWidth = sensorData.width;
          realHeight = sensorData.height;
          // Calibración adaptativa inteligente individual para CADA fotografía (RAW y JPEG)
          adaptiveAdjustments = computeAdaptiveChurchEnhancement(sensorData);
        }

        return {
          id,
          file,
          name: file.name,
          sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          originalUrl: url,
          thumbnailUrl: sensorData?.thumbnailDataUrl || url,
          width: realWidth,
          height: realHeight,
          isRaw,
          adjustments: adaptiveAdjustments,
          crop: {
            aspectRatio: 'original',
            orientation: realWidth >= realHeight ? 'landscape' : 'portrait',
            offsetX: 0,
            offsetY: 0,
            zoom: 1.0,
            rotation: 0,
            straighten: 0,
            flipH: false,
            flipV: false,
          },
          preset: 'auto-church',
          metadata,
        };
      })
    );

    // Auto-completar título y fecha del marco según el evento EXIF detectado
    if (newPhotos.length > 0) {
      const firstMeta = newPhotos[0].metadata;
      if (firstMeta?.detectedEvent && firstMeta?.dateFormatted) {
        setFrame((prev) => ({
          ...prev,
          eventTitle: firstMeta.detectedEvent!,
          dynamicTextRight: firstMeta.dateFormatted!,
          eventDate: firstMeta.dateFormatted!,
          dynamicTextEnabled: true,
        }));

        const cameraInfo = firstMeta.cameraModel ? ` • ${firstMeta.cameraModel}` : '';
        showToast(`📸 ${firstMeta.detectedEvent} • ${firstMeta.dateFormatted}${cameraInfo}`);
      }
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
    if (!activePhotoId && newPhotos.length > 0) {
      setActivePhotoId(newPhotos[0].id);
    }
  };

  // Mantener referencia fresca del lote
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Active photo selection
  const activePhoto = photos.find((p) => p.id === activePhotoId) || photos[0];

  // Sincronizar disponibilidad de Undo/Redo al cambiar de foto activa
  useEffect(() => {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }
    initialBurstSnapshotRef.current = null;

    if (!activePhotoId) {
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    const stack = historyMapRef.current.get(activePhotoId) || { past: [], future: [] };
    historyMapRef.current.set(activePhotoId, stack);
    setCanUndo(stack.past.length > 0);
    setCanRedo(stack.future.length > 0);
  }, [activePhotoId]);

  // Registrar un snapshot en el historial para deshacer/rehacer paso a paso
  const recordSnapshot = (photoId: string, currentSnapshot: PhotoSnapshot, immediate: boolean = false) => {
    if (isHistoryActionRef.current) return;

    const commitToPast = (snap: PhotoSnapshot) => {
      const stack = historyMapRef.current.get(photoId) || { past: [], future: [] };
      const last = stack.past[stack.past.length - 1];
      const isIdentical =
        last &&
        last.preset === snap.preset &&
        JSON.stringify(last.adjustments) === JSON.stringify(snap.adjustments) &&
        JSON.stringify(last.crop) === JSON.stringify(snap.crop);

      if (!isIdentical) {
        stack.past.push({
          adjustments: { ...snap.adjustments },
          crop: { ...snap.crop },
          preset: snap.preset,
        });
        if (stack.past.length > 30) stack.past.shift();
      }
      stack.future = [];
      historyMapRef.current.set(photoId, stack);
      if (photoId === activePhotoId) {
        setCanUndo(true);
        setCanRedo(false);
      }
    };

    if (immediate) {
      if (historyDebounceTimerRef.current) {
        clearTimeout(historyDebounceTimerRef.current);
        historyDebounceTimerRef.current = null;
      }
      commitToPast(currentSnapshot);
      initialBurstSnapshotRef.current = null;
    } else {
      if (!initialBurstSnapshotRef.current) {
        initialBurstSnapshotRef.current = {
          adjustments: { ...currentSnapshot.adjustments },
          crop: { ...currentSnapshot.crop },
          preset: currentSnapshot.preset,
        };
      }
      if (historyDebounceTimerRef.current) {
        clearTimeout(historyDebounceTimerRef.current);
      }
      historyDebounceTimerRef.current = setTimeout(() => {
        if (initialBurstSnapshotRef.current) {
          commitToPast(initialBurstSnapshotRef.current);
          initialBurstSnapshotRef.current = null;
        }
        historyDebounceTimerRef.current = null;
      }, 450);
    }
  };

  // Deshacer el último cambio de slider, filtro o encuadre (Undo)
  const handleUndo = () => {
    if (!activePhoto) return;
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }
    initialBurstSnapshotRef.current = null;

    const stack = historyMapRef.current.get(activePhoto.id);
    if (!stack || stack.past.length === 0) return;

    const prevSnapshot = stack.past.pop()!;
    stack.future.push({
      adjustments: { ...activePhoto.adjustments },
      crop: { ...activePhoto.crop },
      preset: activePhoto.preset,
    });
    historyMapRef.current.set(activePhoto.id, stack);

    isHistoryActionRef.current = true;
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === activePhoto.id
          ? {
              ...p,
              adjustments: { ...prevSnapshot.adjustments },
              crop: { ...prevSnapshot.crop },
              preset: prevSnapshot.preset,
            }
          : p
      )
    );

    setCanUndo(stack.past.length > 0);
    setCanRedo(true);
    setTimeout(() => {
      isHistoryActionRef.current = false;
    }, 60);
    showToast('↺ Deshecho');
  };

  // Rehacer el cambio deshecho (Redo)
  const handleRedo = () => {
    if (!activePhoto) return;
    const stack = historyMapRef.current.get(activePhoto.id);
    if (!stack || stack.future.length === 0) return;

    const nextSnapshot = stack.future.pop()!;
    stack.past.push({
      adjustments: { ...activePhoto.adjustments },
      crop: { ...activePhoto.crop },
      preset: activePhoto.preset,
    });
    historyMapRef.current.set(activePhoto.id, stack);

    isHistoryActionRef.current = true;
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === activePhoto.id
          ? {
              ...p,
              adjustments: { ...nextSnapshot.adjustments },
              crop: { ...nextSnapshot.crop },
              preset: nextSnapshot.preset,
            }
          : p
      )
    );

    setCanUndo(true);
    setCanRedo(stack.future.length > 0);
    setTimeout(() => {
      isHistoryActionRef.current = false;
    }, 60);
    showToast('↻ Rehecho');
  };

  // Atajos de teclado para Deshacer (Ctrl+Z) y Rehacer (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhoto]);

  // Manejo de Borrador de Sesión
  const handleRestoreDraft = async () => {
    const res = await restoreSessionDraft();
    if (res && res.photos.length > 0) {
      setPhotos(res.photos);
      setActivePhotoId(res.activePhotoId);
      if (res.frame) setFrame(res.frame);
      if (res.watermark) setWatermark(res.watermark);
      setPendingDraft(null);
      showToast(`✨ Sesión recuperada: ${res.photos.length} fotos cargadas`);
    }
  };

  const handleDiscardDraft = async () => {
    await clearSessionDraft();
    setPendingDraft(null);
    showToast('Sesión anterior descartada');
  };

  // Update adjustments for active photo
  const handleUpdateAdjustments = (newAdjustments: ImageAdjustments) => {
    if (activePhoto) {
      recordSnapshot(
        activePhoto.id,
        {
          adjustments: activePhoto.adjustments,
          crop: activePhoto.crop,
          preset: activePhoto.preset,
        },
        false
      );
    }
    setPhotos((prev) =>
      prev.map((p) => (p.id === activePhotoId ? { ...p, adjustments: newAdjustments, preset: 'custom' } : p))
    );
  };

  // Reencuadre inteligente: conserva rostros y sujeto principal dentro de la proporción/marco activo
  const smartReframe = async (photo: PhotoItem, crop: CropSettings) => {
    const frameRatio =
      frame.style === 'custom-png' && frame.pngDataUrl ? await getFrameAspectRatio(frame.pngDataUrl) : null;
    const ratio = resolveCropRatio(crop, photo.width, photo.height, frameRatio);
    const offsets = await computeSmartCropOffsets(photo.originalUrl, ratio, crop.rotation || 0);
    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, crop: { ...p.crop, ...offsets } } : p))
    );
  };

  // Update crop settings for active photo (al cambiar de proporción se reencuadra de forma inteligente)
  const handleUpdateCrop = (newCrop: CropSettings) => {
    const current = photos.find((p) => p.id === activePhotoId);
    if (current) {
      recordSnapshot(
        current.id,
        {
          adjustments: current.adjustments,
          crop: current.crop,
          preset: current.preset,
        },
        false
      );
    }
    setPhotos((prev) =>
      prev.map((p) => (p.id === activePhotoId ? { ...p, crop: newCrop } : p))
    );
    if (current && current.crop.aspectRatio !== newCrop.aspectRatio && newCrop.aspectRatio !== 'original') {
      smartReframe(current, newCrop);
    }
  };

  const handleSmartCrop = async () => {
    if (!activePhoto) return;
    await smartReframe(activePhoto, activePhoto.crop);
    showToast('✨ Encuadre inteligente aplicado a esta foto');
  };

  // Apply preset to active photo (soporta auto-análisis dinámico y presets personalizados)
  const handleApplyPreset = async (preset: PresetType, customAdjustments?: ImageAdjustments) => {
    if (activePhoto) {
      recordSnapshot(
        activePhoto.id,
        {
          adjustments: activePhoto.adjustments,
          crop: activePhoto.crop,
          preset: activePhoto.preset,
        },
        true
      );
    }

    if (preset === 'auto-church' && activePhoto) {
      showToast('⚡ Analizando rango dinámico e histograma...');
      const sensorData = await analyzeImageHistogram(activePhoto.originalUrl, activePhoto.isRaw);
      const adaptive = computeAdaptiveChurchEnhancement(sensorData);
      setPhotos((prev) =>
        prev.map((p) => (p.id === activePhotoId ? { ...p, adjustments: adaptive, preset: 'auto-church' } : p))
      );
      showToast('✨ Auto-Tono inteligente adaptado (Luces y color protegidos)');
      return;
    }

    const adjustments = customAdjustments || (PRESET_ADJUSTMENTS as any)[preset] || PRESET_ADJUSTMENTS['custom'];
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
    showToast(`✓ Ajustes sincronizados en las ${photos.length} fotos del lote`);
  };

  const handleApplyCropToAll = async () => {
    if (!activePhoto) return;
    const base = activePhoto.crop;
    // Si la foto activa fue acercada a mano se copia su composición; si no, cada foto se reencuadra de forma inteligente
    const copyOffsets = (base.zoom || 1) > 1.01 || base.aspectRatio === 'original';
    const frameRatio =
      frame.style === 'custom-png' && frame.pngDataUrl ? await getFrameAspectRatio(frame.pngDataUrl) : null;

    const updated = await Promise.all(
      photosRef.current.map(async (p) => {
        if (p.id === activePhoto.id) return { id: p.id, crop: { ...base } };
        let offsets = { offsetX: base.offsetX, offsetY: base.offsetY };
        if (!copyOffsets) {
          const ratio = resolveCropRatio(base, p.width, p.height, frameRatio);
          offsets = await computeSmartCropOffsets(p.originalUrl, ratio, base.rotation || 0);
        }
        return { id: p.id, crop: { ...base, ...offsets, orientation: p.crop.orientation } };
      })
    );

    setPhotos((prev) =>
      prev.map((p) => {
        const match = updated.find((u) => u.id === p.id);
        return match ? { ...p, crop: match.crop } : p;
      })
    );
    showToast(`✓ Encuadre (${base.aspectRatio === 'frame' ? 'Ajuste al marco' : base.aspectRatio}) aplicado a las ${photos.length} fotos`);
  };

  const handleSyncFrameToAll = () => {
    showToast(`✓ Marco (${frame.style !== 'none' ? frame.eventTitle || frame.style : 'Limpio'}) aplicado a todo el lote`);
  };

  const handleSyncWatermarkToAll = () => {
    showToast(`✓ Firma (${watermark.enabled ? 'Activa' : 'Desactivada'}) aplicada a todo el lote`);
  };

  // Move photo in session (Reordenar lote)
  const handleMovePhoto = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || fromIndex >= photos.length || toIndex < 0 || toIndex >= photos.length) return;
    if (fromIndex === toIndex) return;

    setPhotos((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      return updated;
    });
    showToast(`✓ Foto #${fromIndex + 1} movida a la posición #${toIndex + 1}`);
  };

  // Determina si la foto activa tiene cambios respecto al estado original
  const hasModifications = Boolean(
    activePhoto &&
      (Object.values(activePhoto.adjustments).some((v) => v !== 0) ||
        (activePhoto.crop?.zoom || 1) !== 1 ||
        (activePhoto.crop?.rotation || 0) !== 0 ||
        (activePhoto.crop?.straighten || 0) !== 0 ||
        (activePhoto.crop?.offsetX || 0) !== 0 ||
        (activePhoto.crop?.offsetY || 0) !== 0 ||
        (activePhoto.crop?.aspectRatio || 'original') !== 'original' ||
        frame.style !== 'none')
  );

  // Revertir foto activa a estado original/neutro
  const handleRevertActivePhoto = () => {
    if (!activePhoto) return;
    recordSnapshot(
      activePhoto.id,
      {
        adjustments: activePhoto.adjustments,
        crop: activePhoto.crop,
        preset: activePhoto.preset,
      },
      true
    );
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === activePhoto.id
          ? {
              ...p,
              adjustments: { ...PRESET_ADJUSTMENTS['auto-church'] },
              preset: 'auto-church',
              crop: {
                aspectRatio: 'original',
                orientation: p.width >= p.height ? 'landscape' : 'portrait',
                offsetX: 0,
                offsetY: 0,
                zoom: 1.0,
                rotation: 0,
                straighten: 0,
                flipH: false,
                flipV: false,
              },
            }
          : p
      )
    );
    setFrame((prev) => ({ ...prev, style: 'none' }));
    showToast('✓ Fotografía restaurada a valores iniciales');
  };

  // Photo Navigation (< y >)
  const currentPhotoIndex = photos.findIndex((p) => p.id === activePhotoId);
  const hasPrevPhoto = currentPhotoIndex > 0;
  const hasNextPhoto = currentPhotoIndex !== -1 && currentPhotoIndex < photos.length - 1;

  const handlePrevPhoto = () => {
    if (hasPrevPhoto) {
      setActivePhotoId(photos[currentPhotoIndex - 1].id);
    }
  };

  const handleNextPhoto = () => {
    if (hasNextPhoto) {
      setActivePhotoId(photos[currentPhotoIndex + 1].id);
    }
  };

  // Single Photo Export (Save): en Android va directo a la Galería
  const handleSingleExport = async () => {
    if (!activePhoto) return;
    try {
      const outcome = await exportSinglePhoto(activePhoto, watermark, frame, exportOptions, 'download');
      if (outcome === 'gallery') {
        showToast('✓ Foto guardada en Galería › BereaSnap');
      } else if (outcome === 'download') {
        showToast('✓ Foto descargada');
      }
    } catch (err) {
      console.error('Error exportando foto:', err);
      showToast('⚠ No se pudo exportar la foto');
    }
  };

  // Single Photo Native Share
  const handleSingleShare = async () => {
    if (!activePhoto) return;
    try {
      await exportSinglePhoto(activePhoto, watermark, frame, exportOptions, 'share');
    } catch (err) {
      console.error('Error compartiendo foto:', err);
    }
  };

  // Open Batch Export Configuration Modal
  const handleExportBatch = () => {
    if (photos.length === 0) return;
    setIsExportModalOpen(true);
  };

  // Execute Batch Export (JPG individuales a Galería o ZIP; descargar o compartir)
  const handleStartBatchExport = async (mode: 'download' | 'share') => {
    if (photos.length === 0) return;
    setIsExporting(true);
    setExportProgress({ current: 0, total: photos.length, currentName: '' });

    const onProgress = (current: number, total: number, currentName: string) => {
      setExportProgress({ current, total, currentName });
    };

    try {
      if ((exportOptions.deliveryFormat || 'jpg') === 'jpg') {
        const result = await exportBatchAsJpgs(photos, watermark, frame, onProgress, exportOptions, mode);
        if (result.outcome === 'gallery') {
          showToast(`✓ ${result.saved} fotos guardadas en Galería › BereaSnap`);
        } else if (result.outcome === 'download') {
          showToast(`✓ ${result.saved} fotos descargadas`);
        }
      } else {
        await exportBatchAsZip(photos, watermark, frame, onProgress, exportOptions, mode);
      }
    } catch (err) {
      console.error('Error en exportación en lote:', err);
      showToast('⚠ No se pudo completar la exportación');
    } finally {
      setIsExporting(false);
      setIsExportModalOpen(false);
    }
  };

  // Delete individual photo (Liberando memoria Blob URL para evitar fugas de RAM en móvil)
  const handleDeletePhoto = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentIndex = photos.findIndex((p) => p.id === id);
    const target = photos[currentIndex];
    if (target?.originalUrl?.startsWith('blob:')) {
      evictCachedImage(target.originalUrl);
      URL.revokeObjectURL(target.originalUrl);
    }
    const filtered = photos.filter((p) => p.id !== id);
    setPhotos(filtered);
    if (activePhotoId === id && filtered.length > 0) {
      const nextIdx = Math.min(currentIndex, filtered.length - 1);
      setActivePhotoId(filtered[Math.max(0, nextIdx)].id);
    }
    showToast('Fotografía eliminada del carrete');
  };

  // Replace individual photo in place (Conservando posición en el carrete y ajustes actuales)
  const handleReplacePhoto = (id: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = false;
    input.accept = 'image/*,.cr2,.nef,.arw,.dng,.raf';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const isRaw = /\.(cr2|nef|arw|dng|raf)$/i.test(file.name);
      const url = await getDrawableImageUrl(file);
      let realWidth = 4000;
      let realHeight = 3000;

      const metadata = await extractPhotoMetadata(file);
      const classification = classifyChurchEvent(metadata.dateTimeOriginal);
      metadata.detectedEvent = classification.eventTitle;
      metadata.dateFormatted = classification.formattedDate;
      metadata.fullDateString = classification.fullDateString;

      const sensorData = await analyzeImageHistogram(url, isRaw);
      if (sensorData) {
        realWidth = sensorData.width;
        realHeight = sensorData.height;
      }

      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          if (p.originalUrl?.startsWith('blob:')) {
            evictCachedImage(p.originalUrl);
            URL.revokeObjectURL(p.originalUrl);
          }
          return {
            ...p,
            file,
            name: file.name,
            sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            originalUrl: url,
            thumbnailUrl: sensorData?.thumbnailDataUrl || url,
            width: realWidth,
            height: realHeight,
            isRaw,
            metadata,
            crop: {
              ...p.crop,
              orientation: realWidth >= realHeight ? 'landscape' : 'portrait',
            },
          };
        })
      );
      setActivePhotoId(id);
      const existing = photosRef.current.find((p) => p.id === id);
      if (existing && existing.crop.aspectRatio !== 'original') {
        // La foto nueva se reencuadra de forma inteligente dentro de la proporción/marco vigente
        smartReframe({ ...existing, originalUrl: url, width: realWidth, height: realHeight }, existing.crop);
      }
      showToast('✓ Fotografía sustituida conservando tus ajustes');
    };
    input.click();
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

  const triggerAddMoreFiles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,.cr2,.nef,.arw,.dng,.raf';
    input.onchange = (e: any) => e.target.files && handleFilesSelected(e.target.files);
    input.click();
  };

  const handleGoHome = async () => {
    if (photos.length === 0) return;
    const confirmLeave = window.confirm('¿Deseas cerrar la sesión actual y volver al inicio?');
    if (!confirmLeave) return;
    photos.forEach((p) => {
      if (p.originalUrl?.startsWith('blob:')) {
        evictCachedImage(p.originalUrl);
        URL.revokeObjectURL(p.originalUrl);
      }
    });
    await clearSessionDraft();
    setPhotos([]);
    setActivePhotoId('');
    setPendingDraft(null);
    setActiveStudioTab('develop');
  };

  return (
    <div className="app-container">
      {/* Unified Studio Top Bar */}
      <Header
        totalPhotos={photos.length}
        currentPhotoIndex={currentPhotoIndex >= 0 ? currentPhotoIndex : 0}
        activePhoto={activePhoto}
        theme={theme}
        showOriginal={showOriginal}
        hasUpdateBadge={hasUpdateBadge}
        hasModifications={hasModifications}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onGoHome={handleGoHome}
        onToggleOriginal={(val) => setShowOriginal((prev) => (typeof val === 'boolean' ? val : !prev))}
        onSelectTheme={handleSelectTheme}
        onToggleTheme={toggleTheme}
        onOpenGrid={() => setActiveStudioTab((current) => current === 'filmstrip' ? 'develop' : 'filmstrip')}
        onOpenAbout={() => setIsUpdateModalOpen(true)}
        onSingleExport={handleSingleExport}
        onSingleShare={handleSingleShare}
        onExportBatch={handleExportBatch}
        onRevert={handleRevertActivePhoto}
        onApplySettingsToAll={handleApplySettingsToAll}
      />

      {/* Main Studio Area */}
      {photos.length === 0 ? (
        <BatchDropzone
          onFilesSelected={handleFilesSelected}
          pendingDraft={pendingDraft}
          onRestoreDraft={handleRestoreDraft}
          onDiscardDraft={handleDiscardDraft}
        />
      ) : (
        <div className={`studio-body ${activeStudioTab ? 'has-deck-open' : ''}`}>
          {/* Main Visual Column: Preview Stage */}
          <div className="studio-main-column">
            <PreviewStage
              photo={activePhoto}
              watermark={watermark}
              frame={frame}
              showOriginal={showOriginal}
              isCropMode={activeStudioTab === 'crop'}
              onToggleOriginal={(val) => setShowOriginal((prev) => (typeof val === 'boolean' ? val : !prev))}
              onSingleExport={handleSingleExport}
              onSingleShare={handleSingleShare}
              onUpdateCrop={handleUpdateCrop}
              onPrevPhoto={handlePrevPhoto}
              onNextPhoto={handleNextPhoto}
              hasPrevPhoto={hasPrevPhoto}
              hasNextPhoto={hasNextPhoto}
            />
          </div>

          {/* Bottom / Right Tool Deck */}
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
            onApplyCropToAll={handleApplyCropToAll}
            onSmartCrop={handleSmartCrop}
            onSyncFrameToAll={handleSyncFrameToAll}
            onSyncWatermarkToAll={handleSyncWatermarkToAll}
            onSaveAsDefaultAppSettings={handleSaveAsDefaultAppSettings}
            totalPhotos={photos.length}
            photos={photos}
            activePhotoId={activePhotoId}
            onSelectPhoto={setActivePhotoId}
            onDeletePhoto={handleDeletePhoto}
            onReplacePhoto={handleReplacePhoto}
            onMovePhoto={handleMovePhoto}
            onAddMorePhotos={triggerAddMoreFiles}
            activeTab={activeStudioTab}
            onChangeTab={setActiveStudioTab}
          />
        </div>
      )}

      {/* Modal Configuración y Progreso de Exportación (Foto Actual o Lote Completo) */}
      <ExportModal
        isOpen={isExportModalOpen || isExporting}
        isProcessing={isExporting}
        current={exportProgress.current}
        total={photos.length}
        currentPhotoIndex={currentPhotoIndex >= 0 ? currentPhotoIndex : 0}
        currentName={exportProgress.currentName}
        options={exportOptions}
        onChangeOptions={setExportOptions}
        onStartExport={handleStartBatchExport}
        onSingleExport={(mode) => {
          if (mode === 'share') {
            handleSingleShare();
          } else {
            handleSingleExport();
          }
        }}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Modal In-App de Actualizaciones & Versión */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          if (updateInfo?.latestVersion) {
            localStorage.setItem('bereasnap_dismissed_version', updateInfo.latestVersion);
          }
        }}
        initialInfo={updateInfo}
      />

      {/* Notificación Toast Flotante No-Intrusiva (Popover Top-Layer + Fallback) */}
      <div
        ref={toastRef}
        {...({ popover: 'manual' } as any)}
        className={`studio-toast-popover ${toastMsg ? 'toast-open' : ''}`}
      >
        <CheckCircle2 size={15} style={{ color: '#34d399', flexShrink: 0 }} />
        <span>{toastMsg}</span>
        <button
          type="button"
          {...({ popovertargetaction: 'hide' } as any)}
          onClick={() => setToastMsg(null)}
          className="toast-close-btn"
          aria-label="Cerrar notificación"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
};

export default App;
