import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { Header } from './components/Header';
import { BatchDropzone } from './components/BatchDropzone';
import { PreviewStage } from './components/PreviewStage';
import { SidebarControls } from './components/SidebarControls';
import { ExportModal, type ExportSummaryInfo } from './components/ExportModal';
import { UpdateModal } from './components/UpdateModal';
import { checkForUpdate, type UpdateInfo } from './services/updateService';
import { consumePendingSharedFiles, subscribeSharedFiles } from './services/shareReceiver';
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

import {
  exportSinglePhoto,
  exportBatchAsZip,
  exportBatchAsJpgs,
  shareSavedUris,
  cleanupNativeExportCache,
} from './utils/batchExporter';
import { validateIncomingMediaFiles } from './utils/fileValidation';
import { evictCachedImage, releaseEngineMemory } from './utils/canvasEngine';
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
import {
  shouldAutoFillFrameFromImport,
  buildBatchAdjustmentsSnapshot,
  describeEventSuggestion,
} from './utils/batchScope';
import {
  capturePhotoSnapshot,
  cloneGlobalSnapshot,
  clonePhotoSnapshot,
  popRedoEntry,
  popUndoEntry,
  pushStudioHistoryEntry,
  type PhotoSnapshot,
  type StudioGlobalSnapshot,
  type StudioHistoryEntry,
  type StudioHistoryStack,
} from './utils/editorHistory';

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

  // Configuración de Barra de Estado Nativa en Android coherente con el tema Claro/Oscuro
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        StatusBar.setOverlaysWebView({ overlay: false });
        if (theme === 'light') {
          StatusBar.setBackgroundColor({ color: '#ffffff' });
          StatusBar.setStyle({ style: Style.Light });
        } else {
          StatusBar.setBackgroundColor({ color: '#000000' });
          StatusBar.setStyle({ style: Style.Dark });
        }
      } catch (err) {
        console.warn('Error configurando StatusBar nativo:', err);
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSelectTheme = (mode: 'light' | 'dark') => {
    setTheme(mode);
  };

  // Compare Before/After State & Gotero de Balance de Blancos
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false);

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

  // Export Modal, Confirmation Summary & Progress State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [lastExportSummary, setLastExportSummary] = useState<ExportSummaryInfo | null>(null);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState<boolean>(false);
  const [isRevertPromptOpen, setIsRevertPromptOpen] = useState<boolean>(false);
  const [pendingBatchSync, setPendingBatchSync] = useState<'adjustments' | 'crop' | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    qualityPreset: 'max',
    filenamePrefix: 'BereaSnap',
    deliveryFormat: 'jpg',
  });

  // Estado del Borrador de Sesión en Segundo Plano (IndexedDB)
  const [pendingDraft, setPendingDraft] = useState<DraftSummary | null>(null);

  // Refs actualizadas del estado global para callbacks y Undo/Redo paso a paso
  const frameRef = useRef<FrameSettings>(frame);
  const watermarkRef = useRef<WatermarkSettings>(watermark);
  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);
  useEffect(() => {
    watermarkRef.current = watermark;
  }, [watermark]);

  // Historial unificado de sesión (Ajustes, Encuadre, Filtros, Marco, Texto, Logo y Lote)
  const studioHistoryRef = useRef<StudioHistoryStack>({ past: [], future: [] });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isHistoryActionRef = useRef(false);
  const photoBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPhotoBurstRef = useRef<{ photoId: string; before: PhotoSnapshot; label?: string } | null>(null);
  const globalBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingGlobalBurstRef = useRef<{ before: StudioGlobalSnapshot; label?: string } | null>(null);

  // Comprobar borrador previo guardado en IndexedDB al inicio
  useEffect(() => {
    checkSessionDraft().then((summary) => {
      if (summary?.exists && summary.count > 0) {
        setPendingDraft(summary);
      }
    });
  }, []);

  // Guardado Automático de Sesión en IndexedDB (Debounced 1.5s + guardado inmediato al ocultar la app)
  useEffect(() => {
    if (photos.length === 0) return;
    const timer = setTimeout(() => {
      saveSessionDraft(photos, activePhotoId, frame, watermark);
    }, 1500);
    return () => clearTimeout(timer);
  }, [photos, activePhotoId, frame, watermark]);

  useEffect(() => {
    const flushOnBackground = () => {
      if (document.visibilityState === 'hidden' && photosRef.current.length > 0) {
        saveSessionDraft(photosRef.current, activePhotoId, frameRef.current, watermarkRef.current);
      }
    };
    document.addEventListener('visibilitychange', flushOnBackground);
    window.addEventListener('pagehide', flushOnBackground);
    return () => {
      document.removeEventListener('visibilitychange', flushOnBackground);
      window.removeEventListener('pagehide', flushOnBackground);
    };
  }, [activePhotoId]);

  // Referencia siempre actualizada del lote (para efectos asíncronos sin cierres obsoletos)
  const photosRef = useRef<PhotoItem[]>([]);
  const handleFilesSelectedRef = useRef<(files: FileList | File[]) => Promise<void>>(async () => {});

  // Procesa elementos con concurrencia limitada para evitar picos de RAM en Android con lotes grandes / RAW
  async function mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    let nextIndex = 0;

    const runWorker = async () => {
      while (nextIndex < items.length) {
        const idx = nextIndex++;
        results[idx] = await worker(items[idx], idx);
      }
    };

    const poolSize = Math.min(concurrency, items.length);
    await Promise.all(Array.from({ length: poolSize }, () => runWorker()));
    return results;
  }

  // Handle uploaded files (Validación de entrada + soporte RAW + dimensiones reales + metadatos EXIF + tolerancia a archivos dañados)
  const handleFilesSelected = async (files: FileList | File[]) => {
    const { validFiles, reasonSummary } = validateIncomingMediaFiles(files);
    if (validFiles.length === 0) {
      showToast(`⚠ ${reasonSummary || 'No se seleccionaron imágenes válidas'}`);
      return;
    }

    const hasAnyRaw = validFiles.some((f) => /\.(cr2|nef|arw|dng|raf|orf|pef)$/i.test(f.name));
    const concurrency = hasAnyRaw ? 2 : 3;
    const failedFiles: string[] = [];

    const decodedOrNull = await mapWithConcurrency<File, PhotoItem | null>(validFiles, concurrency, async (file, i) => {
      let url = '';
      try {
        const isRaw = /\.(cr2|nef|arw|dng|raf|orf|pef)$/i.test(file.name);
        url = await getDrawableImageUrl(file);
        const id = `${Date.now()}-${i}-${file.name}`;

        const sensorData = await analyzeImageHistogram(url, isRaw);
        if (!sensorData || !sensorData.width || !sensorData.height) {
          throw new Error('Imagen dañada o ilegible');
        }

        const metadata = await extractPhotoMetadata(file);
        const classification = classifyChurchEvent(metadata.dateTimeOriginal);
        metadata.detectedEvent = classification.eventTitle;
        metadata.dateFormatted = classification.formattedDate;
        metadata.fullDateString = classification.fullDateString;

        const adaptiveAdjustments = computeAdaptiveChurchEnhancement(sensorData);

        return {
          id,
          file,
          name: file.name,
          sizeFormatted: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          originalUrl: url,
          thumbnailUrl: sensorData.thumbnailDataUrl || url,
          width: sensorData.width,
          height: sensorData.height,
          isRaw,
          adjustments: adaptiveAdjustments,
          crop: {
            aspectRatio: 'original',
            orientation: sensorData.width >= sensorData.height ? 'landscape' : 'portrait',
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
      } catch (fileErr) {
        console.warn('[Import] Archivo omitido por estar dañado o corrupto:', file?.name, fileErr);
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
        failedFiles.push(file?.name || 'archivo');
        return null;
      }
    });

    const newPhotos: PhotoItem[] = decodedOrNull.filter((p): p is PhotoItem => p !== null);

    if (newPhotos.length === 0) {
      showToast('⚠ Ninguna imagen pudo abrirse (archivos dañados o no compatibles)');
      return;
    }

    const wasSessionEmpty = photosRef.current.length === 0;

    // Auto-completar título y fecha solo al iniciar una sesión nueva (sin sobrescribir ediciones manuales al añadir fotos)
    if (newPhotos.length > 0) {
      const firstMeta = newPhotos[0].metadata;
      if (shouldAutoFillFrameFromImport(photosRef.current.length, firstMeta) && firstMeta) {
        setFrame((prev) => ({
          ...prev,
          eventTitle: firstMeta.detectedEvent!,
          dynamicTextRight: firstMeta.dateFormatted!,
          eventDate: firstMeta.dateFormatted!,
          dynamicTextEnabled: true,
        }));

        const suggestion = describeEventSuggestion(firstMeta);
        const cameraInfo = firstMeta.cameraModel ? ` • ${firstMeta.cameraModel}` : '';
        if (failedFiles.length > 0 || reasonSummary) {
          showToast(`⚠ Se cargaron ${newPhotos.length} foto(s) y se omitieron ${failedFiles.length + (reasonSummary ? 1 : 0)} dañada(s)/inválida(s)`);
        } else if (suggestion.isEstimatedDate) {
          showToast(`ℹ Sin fecha EXIF: sugerencia "${firstMeta.detectedEvent} • ${firstMeta.dateFormatted}" (fecha de archivo)`);
        } else {
          showToast(`📸 ${suggestion.label}${cameraInfo}`);
        }
      } else if (!wasSessionEmpty) {
        showToast(
          failedFiles.length > 0
            ? `⚠ ${newPhotos.length} añadida(s), ${failedFiles.length} dañada(s) omitida(s)`
            : `✓ ${newPhotos.length} ${newPhotos.length === 1 ? 'foto añadida' : 'fotos añadidas'} (marco y textos actuales conservados)`
        );
      } else if (failedFiles.length > 0 || reasonSummary) {
        showToast(`⚠ Se cargaron ${newPhotos.length} foto(s) y se omitieron archivos dañados/inválidos`);
      }
    }

    setPhotos((prev) => [...prev, ...newPhotos]);
    if (!activePhotoId && newPhotos.length > 0) {
      setActivePhotoId(newPhotos[0].id);
    }
  };
  handleFilesSelectedRef.current = handleFilesSelected;

  // Escuchar fotos compartidas directamente desde Galería Android ("Compartir → BereaSnap")
  useEffect(() => {
    let cleanup = () => {};
    consumePendingSharedFiles().then((files) => {
      if (files.length > 0) {
        handleFilesSelectedRef.current(files);
        showToast(`📲 ${files.length} ${files.length === 1 ? 'foto recibida' : 'fotos recibidas'} desde Galería`);
      }
    });
    subscribeSharedFiles((files) => {
      handleFilesSelectedRef.current(files);
      showToast(`📲 ${files.length} ${files.length === 1 ? 'foto añadida' : 'fotos añadidas'} desde Galería`);
    }).then((unsub) => {
      cleanup = unsub;
    });
    return () => cleanup();
  }, []);

  // Desactivar gotero al cambiar de foto o pestaña
  useEffect(() => {
    setIsEyedropperActive(false);
  }, [activePhotoId, activeStudioTab]);

  // Mantener referencia fresca del lote
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Active photo selection
  const activePhoto = photos.find((p) => p.id === activePhotoId) || photos[0];

  const syncHistoryButtons = () => {
    const hasPendingBurst = Boolean(pendingPhotoBurstRef.current || pendingGlobalBurstRef.current);
    setCanUndo(hasPendingBurst || studioHistoryRef.current.past.length > 0);
    setCanRedo(studioHistoryRef.current.future.length > 0);
  };

  const commitHistoryEntry = (entry: StudioHistoryEntry) => {
    studioHistoryRef.current = pushStudioHistoryEntry(studioHistoryRef.current, entry);
    syncHistoryButtons();
  };

  const flushPendingBursts = () => {
    if (photoBurstTimerRef.current) {
      clearTimeout(photoBurstTimerRef.current);
      photoBurstTimerRef.current = null;
    }
    if (pendingPhotoBurstRef.current) {
      const burst = pendingPhotoBurstRef.current;
      pendingPhotoBurstRef.current = null;
      const latestPhoto = photosRef.current.find((p) => p.id === burst.photoId);
      if (latestPhoto) {
        commitHistoryEntry({
          kind: 'photo',
          photoId: burst.photoId,
          before: burst.before,
          after: capturePhotoSnapshot(latestPhoto),
          label: burst.label,
        });
      }
    }
    if (globalBurstTimerRef.current) {
      clearTimeout(globalBurstTimerRef.current);
      globalBurstTimerRef.current = null;
    }
    if (pendingGlobalBurstRef.current) {
      const gBurst = pendingGlobalBurstRef.current;
      pendingGlobalBurstRef.current = null;
      commitHistoryEntry({
        kind: 'global',
        before: gBurst.before,
        after: cloneGlobalSnapshot({ frame: frameRef.current, watermark: watermarkRef.current }),
        label: gBurst.label,
      });
    }
    syncHistoryButtons();
  };

  // Cerrar ráfagas pendientes al cambiar de fotografía activa
  useEffect(() => {
    flushPendingBursts();
  }, [activePhotoId]);

  const recordPhotoMutation = (
    photoId: string,
    beforeSnap: PhotoSnapshot,
    afterSnap: PhotoSnapshot | null,
    immediate: boolean = false,
    label?: string
  ) => {
    if (isHistoryActionRef.current) return;

    if (immediate && afterSnap) {
      flushPendingBursts();
      commitHistoryEntry({
        kind: 'photo',
        photoId,
        before: clonePhotoSnapshot(beforeSnap),
        after: clonePhotoSnapshot(afterSnap),
        label,
      });
      return;
    }

    if (pendingPhotoBurstRef.current && pendingPhotoBurstRef.current.photoId !== photoId) {
      flushPendingBursts();
    }
    if (!pendingPhotoBurstRef.current) {
      pendingPhotoBurstRef.current = {
        photoId,
        before: clonePhotoSnapshot(beforeSnap),
        label,
      };
    }
    setCanUndo(true);
    setCanRedo(false);
    if (photoBurstTimerRef.current) {
      clearTimeout(photoBurstTimerRef.current);
    }
    photoBurstTimerRef.current = setTimeout(() => {
      flushPendingBursts();
    }, 380);
  };

  const recordGlobalMutation = (
    beforeGlobal: StudioGlobalSnapshot,
    afterGlobal: StudioGlobalSnapshot,
    immediate: boolean = false,
    label?: string
  ) => {
    if (isHistoryActionRef.current) return;

    if (immediate) {
      flushPendingBursts();
      commitHistoryEntry({
        kind: 'global',
        before: cloneGlobalSnapshot(beforeGlobal),
        after: cloneGlobalSnapshot(afterGlobal),
        label,
      });
      return;
    }

    if (!pendingGlobalBurstRef.current) {
      pendingGlobalBurstRef.current = {
        before: cloneGlobalSnapshot(beforeGlobal),
        label,
      };
    }
    setCanUndo(true);
    setCanRedo(false);
    if (globalBurstTimerRef.current) {
      clearTimeout(globalBurstTimerRef.current);
    }
    globalBurstTimerRef.current = setTimeout(() => {
      flushPendingBursts();
    }, 380);
  };

  const applyHistoryEntry = (entry: StudioHistoryEntry, direction: 'undo' | 'redo') => {
    isHistoryActionRef.current = true;
    if (entry.kind === 'photo') {
      const targetSnap = direction === 'undo' ? entry.before : entry.after;
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === entry.photoId
            ? {
                ...p,
                adjustments: { ...targetSnap.adjustments },
                crop: { ...targetSnap.crop },
                preset: targetSnap.preset,
              }
            : p
        )
      );
      if (photosRef.current.some((p) => p.id === entry.photoId) && entry.photoId !== activePhotoId) {
        setActivePhotoId(entry.photoId);
      }
    } else if (entry.kind === 'global') {
      const targetGlobal = direction === 'undo' ? entry.before : entry.after;
      frameRef.current = { ...targetGlobal.frame };
      watermarkRef.current = { ...targetGlobal.watermark };
      setFrame({ ...targetGlobal.frame });
      setWatermark({ ...targetGlobal.watermark });
    } else if (entry.kind === 'batch-photos') {
      const targetList = direction === 'undo' ? entry.before : entry.after;
      const byId = new Map(targetList.map((item) => [item.id, item.snapshot]));
      setPhotos((prev) =>
        prev.map((p) => {
          const snap = byId.get(p.id);
          if (!snap) return p;
          return {
            ...p,
            adjustments: { ...snap.adjustments },
            crop: { ...snap.crop },
            preset: snap.preset,
          };
        })
      );
    }

    setTimeout(() => {
      isHistoryActionRef.current = false;
    }, 60);
  };

  // Deshacer paso a paso (Ajustes, Encuadre, Filtros, Marco, Texto, Logo o Lote)
  const handleUndo = () => {
    flushPendingBursts();
    const { entry, nextStack } = popUndoEntry(studioHistoryRef.current);
    if (!entry) return;
    studioHistoryRef.current = nextStack;
    applyHistoryEntry(entry, 'undo');
    syncHistoryButtons();
    showToast(entry.label ? `↺ Deshecho: ${entry.label}` : '↺ Deshecho');
  };

  // Rehacer paso a paso
  const handleRedo = () => {
    flushPendingBursts();
    const { entry, nextStack } = popRedoEntry(studioHistoryRef.current);
    if (!entry) return;
    studioHistoryRef.current = nextStack;
    applyHistoryEntry(entry, 'redo');
    syncHistoryButtons();
    showToast(entry.label ? `↻ Rehecho: ${entry.label}` : '↻ Rehecho');
  };

  const handleUndoRef = useRef(handleUndo);
  const handleRedoRef = useRef(handleRedo);
  handleUndoRef.current = handleUndo;
  handleRedoRef.current = handleRedo;

  // Atajos de teclado para Deshacer (Ctrl+Z) y Rehacer (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndoRef.current();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedoRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Actualizar Marco global con soporte de Deshacer/Rehacer
  const handleUpdateFrame = (partial: Partial<FrameSettings>) => {
    const before = cloneGlobalSnapshot({ frame: frameRef.current, watermark: watermarkRef.current });
    const nextFrame: FrameSettings = { ...frameRef.current, ...partial };
    const after = cloneGlobalSnapshot({ frame: nextFrame, watermark: watermarkRef.current });
    frameRef.current = nextFrame;
    setFrame(nextFrame);
    const isTextOrScaleOnly = Object.keys(partial).every(
      (k) => k === 'eventTitle' || k === 'eventDate' || k === 'dynamicTextRight' || k === 'dynamicTextScale'
    );
    recordGlobalMutation(before, after, !isTextOrScaleOnly, 'Marco / Texto');
  };

  // Actualizar Logo / Firma global con soporte de Deshacer/Rehacer
  const handleUpdateWatermark = (partial: Partial<WatermarkSettings>) => {
    const before = cloneGlobalSnapshot({ frame: frameRef.current, watermark: watermarkRef.current });
    const nextWatermark: WatermarkSettings = { ...watermarkRef.current, ...partial };
    const after = cloneGlobalSnapshot({ frame: frameRef.current, watermark: nextWatermark });
    watermarkRef.current = nextWatermark;
    setWatermark(nextWatermark);
    const isContinuous = Object.keys(partial).every(
      (k) => k === 'text' || k === 'size' || k === 'opacity'
    );
    recordGlobalMutation(before, after, !isContinuous, 'Logo / Firma');
  };

  // Aplicar balance de blancos muestreado con el gotero
  const handlePickWhiteBalance = (warmth: number, tint: number) => {
    if (!activePhoto) return;
    const before = capturePhotoSnapshot(activePhoto);
    const nextAdjustments = { ...activePhoto.adjustments, warmth, tint };
    const after: PhotoSnapshot = { adjustments: nextAdjustments, crop: { ...activePhoto.crop }, preset: 'custom' };
    recordPhotoMutation(activePhoto.id, before, after, true, 'Gotero WB');
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === activePhoto.id
          ? { ...p, adjustments: nextAdjustments, preset: 'custom' }
          : p
      )
    );
    setIsEyedropperActive(false);
    showToast(`🎯 Balance calibrado (Calidez ${warmth > 0 ? `+${warmth}` : warmth} • Matiz ${tint > 0 ? `+${tint}` : tint})`);
  };

  // Manejo de Borrador de Sesión
  const handleRestoreDraft = async () => {
    const res = await restoreSessionDraft();
    if (res && res.photos.length > 0) {
      studioHistoryRef.current = { past: [], future: [] };
      syncHistoryButtons();
      setPhotos(res.photos);
      setActivePhotoId(res.activePhotoId);
      if (res.frame) {
        frameRef.current = res.frame;
        setFrame(res.frame);
      }
      if (res.watermark) {
        watermarkRef.current = res.watermark;
        setWatermark(res.watermark);
      }
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
      recordPhotoMutation(activePhoto.id, capturePhotoSnapshot(activePhoto), null, false, 'Ajustes');
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
      const immediate = current.crop.aspectRatio !== newCrop.aspectRatio || current.crop.rotation !== newCrop.rotation || current.crop.flipH !== newCrop.flipH;
      const afterSnap: PhotoSnapshot = {
        adjustments: { ...current.adjustments },
        crop: { ...newCrop },
        preset: current.preset,
      };
      recordPhotoMutation(current.id, capturePhotoSnapshot(current), afterSnap, immediate, 'Encuadre');
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
    const before = capturePhotoSnapshot(activePhoto);
    await smartReframe(activePhoto, activePhoto.crop);
    const updatedPhoto = photosRef.current.find((p) => p.id === activePhoto.id);
    if (updatedPhoto) {
      recordPhotoMutation(activePhoto.id, before, capturePhotoSnapshot(updatedPhoto), true, 'Encuadre IA');
    }
    showToast('✨ Encuadre inteligente aplicado a esta foto');
  };

  // Apply preset to active photo (soporta auto-análisis dinámico y presets personalizados)
  const handleApplyPreset = async (preset: PresetType, customAdjustments?: ImageAdjustments) => {
    const target = activePhoto;
    const beforeSnap = target ? capturePhotoSnapshot(target) : null;

    if (preset === 'auto-church' && target) {
      showToast('⚡ Analizando rango dinámico e histograma...');
      const sensorData = await analyzeImageHistogram(target.originalUrl, target.isRaw);
      const adaptive = computeAdaptiveChurchEnhancement(sensorData);
      if (beforeSnap) {
        recordPhotoMutation(
          target.id,
          beforeSnap,
          { adjustments: adaptive, crop: { ...target.crop }, preset: 'auto-church' },
          true,
          'Auto-Tono'
        );
      }
      setPhotos((prev) =>
        prev.map((p) => (p.id === target.id ? { ...p, adjustments: adaptive, preset: 'auto-church' } : p))
      );
      showToast('✨ Auto-Tono inteligente adaptado (Luces y color protegidos)');
      return;
    }

    const adjustments = customAdjustments || (PRESET_ADJUSTMENTS as any)[preset] || PRESET_ADJUSTMENTS['custom'];
    if (target && beforeSnap) {
      recordPhotoMutation(
        target.id,
        beforeSnap,
        { adjustments: { ...adjustments }, crop: { ...target.crop }, preset },
        true,
        'Filtro'
      );
    }
    setPhotos((prev) =>
      prev.map((p) => (p.id === activePhotoId ? { ...p, adjustments, preset } : p))
    );
  };

  // Solicitar confirmación visual antes de aplicar ajustes o encuadre globales al lote
  const handleRequestApplySettingsToAll = () => {
    if (!activePhoto) return;
    if (photos.length <= 1) {
      showToast('Carga al menos 2 fotos para copiar ajustes al lote');
      return;
    }
    setPendingBatchSync('adjustments');
  };

  const handleRequestApplyCropToAll = () => {
    if (!activePhoto) return;
    if (photos.length <= 1) {
      showToast('Carga al menos 2 fotos para copiar el encuadre al lote');
      return;
    }
    setPendingBatchSync('crop');
  };

  const executeConfirmedBatchSync = async () => {
    const mode = pendingBatchSync;
    setPendingBatchSync(null);
    if (!mode || !activePhoto) return;

    flushPendingBursts();
    const beforeBatch = photosRef.current.map((p) => ({
      id: p.id,
      snapshot: capturePhotoSnapshot(p),
    }));

    if (mode === 'adjustments') {
      const nextPhotos = buildBatchAdjustmentsSnapshot(photosRef.current, activePhoto);
      const afterBatch = nextPhotos.map((p) => ({
        id: p.id,
        snapshot: capturePhotoSnapshot(p),
      }));
      commitHistoryEntry({
        kind: 'batch-photos',
        scope: 'adjustments',
        before: beforeBatch,
        after: afterBatch,
        label: 'Luz y color al lote',
      });
      setPhotos(nextPhotos);
      showToast(`✓ Luz, color y filtro aplicados a ${nextPhotos.length} fotos (encuadres conservados)`);
      return;
    }

    const base = activePhoto.crop;
    const copyOffsets = (base.zoom || 1) > 1.01 || base.aspectRatio === 'original';
    const frameRatio =
      frame.style === 'custom-png' && frame.pngDataUrl ? await getFrameAspectRatio(frame.pngDataUrl) : null;

    const updatedCrops = await Promise.all(
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

    const nextPhotos = photosRef.current.map((p) => {
      const match = updatedCrops.find((u) => u.id === p.id);
      return match ? { ...p, crop: match.crop } : p;
    });
    const afterBatch = nextPhotos.map((p) => ({
      id: p.id,
      snapshot: capturePhotoSnapshot(p),
    }));
    commitHistoryEntry({
      kind: 'batch-photos',
      scope: 'crop',
      before: beforeBatch,
      after: afterBatch,
      label: 'Encuadre al lote',
    });
    setPhotos(nextPhotos);
    showToast(`✓ Encuadre (${base.aspectRatio === 'frame' ? 'Ajuste al marco' : base.aspectRatio}) aplicado a ${nextPhotos.length} fotos`);
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

  const hasPhotoModifications = Boolean(
    activePhoto &&
      (activePhoto.adjustments.brightness !== 0 ||
        activePhoto.adjustments.contrast !== 0 ||
        activePhoto.adjustments.saturation !== 0 ||
        activePhoto.adjustments.warmth !== 0 ||
        (activePhoto.adjustments.tint || 0) !== 0 ||
        activePhoto.adjustments.shadows !== 0 ||
        activePhoto.adjustments.highlights !== 0 ||
        activePhoto.adjustments.sharpness !== 0 ||
        (activePhoto.adjustments.clarity || 0) !== 0 ||
        (activePhoto.adjustments.noiseReduction || 0) !== 0 ||
        activePhoto.adjustments.skinToneGuard === false ||
        (activePhoto.crop?.zoom || 1) !== 1 ||
        (activePhoto.crop?.rotation || 0) !== 0 ||
        (activePhoto.crop?.straighten || 0) !== 0 ||
        (activePhoto.crop?.offsetX || 0) !== 0 ||
        (activePhoto.crop?.offsetY || 0) !== 0 ||
        Boolean(activePhoto.crop?.flipH) ||
        Boolean(activePhoto.crop?.flipV) ||
        (activePhoto.crop?.aspectRatio || 'original') !== 'original')
  );

  const hasGlobalModifications = frame.style !== 'none' || watermark.enabled;
  const hasModifications = hasPhotoModifications || hasGlobalModifications;

  const revertPhotoOnly = () => {
    if (!activePhoto) return;
    const beforeSnap = capturePhotoSnapshot(activePhoto);
    const neutralSnap: PhotoSnapshot = {
      adjustments: {
        ...PRESET_ADJUSTMENTS['custom'],
        tint: 0,
        clarity: 0,
        noiseReduction: 0,
        skinToneGuard: true,
      },
      preset: 'custom',
      crop: {
        aspectRatio: 'original',
        orientation: activePhoto.width >= activePhoto.height ? 'landscape' : 'portrait',
        offsetX: 0,
        offsetY: 0,
        zoom: 1.0,
        rotation: 0,
        straighten: 0,
        flipH: false,
        flipV: false,
      },
    };
    recordPhotoMutation(activePhoto.id, beforeSnap, neutralSnap, true, 'Revertir foto');
    setPhotos((prev) =>
      prev.map((p) => (p.id === activePhoto.id ? { ...p, ...neutralSnap } : p))
    );
    showToast('✓ Ajustes y encuadre de esta foto restablecidos');
  };

  const revertGlobalOverlay = () => {
    const beforeGlobal = cloneGlobalSnapshot({ frame: frameRef.current, watermark: watermarkRef.current });
    const nextFrame: FrameSettings = { ...frameRef.current, style: 'none' };
    const nextWatermark: WatermarkSettings = { ...watermarkRef.current, enabled: false };
    const afterGlobal = cloneGlobalSnapshot({ frame: nextFrame, watermark: nextWatermark });
    recordGlobalMutation(beforeGlobal, afterGlobal, true, 'Quitar marco y firma');
    frameRef.current = nextFrame;
    watermarkRef.current = nextWatermark;
    setFrame(nextFrame);
    setWatermark(nextWatermark);
    showToast('✓ Marco y firma quitados del lote');
  };

  // Revertir foto activa o estudio global sin destruir cambios inesperadamente
  const handleRevertActivePhoto = () => {
    if (!activePhoto) return;
    setIsRevertPromptOpen(false);
    if (hasPhotoModifications && hasGlobalModifications) {
      setIsRevertPromptOpen(true);
      return;
    }
    if (hasPhotoModifications) {
      revertPhotoOnly();
      return;
    }
    if (hasGlobalModifications) {
      revertGlobalOverlay();
    }
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

  // Single Photo Export (Save): confirma ubicación real, fallbacks y permite compartir después
  const handleSingleExport = async () => {
    if (!activePhoto) return;
    try {
      const res = await exportSinglePhoto(activePhoto, watermark, frame, exportOptions, 'download');
      const summary: ExportSummaryInfo = {
        scope: 'single',
        format: 'jpg',
        saved: 1,
        total: 1,
        downscaledCount: res.downscaled ? 1 : 0,
        failedCount: 0,
        destination: res.destination,
        outcome: res.outcome,
        shareUris: res.shareUri ? [res.shareUri] : undefined,
      };
      setLastExportSummary(summary);
      setIsExportModalOpen(true);
      showToast(`✓ Foto guardada en ${res.destination}`);
    } catch (err) {
      console.error('Error exportando foto:', err);
      showToast('⚠ No se pudo exportar la foto');
    }
  };

  // Single Photo Native Share
  const handleSingleShare = async () => {
    if (!activePhoto) return;
    try {
      const res = await exportSinglePhoto(activePhoto, watermark, frame, exportOptions, 'share');
      if (res.outcome === 'cancelled') {
        showToast(
          res.destination
            ? `Compartir cancelado (archivo conservado en ${res.destination})`
            : 'Compartir cancelado'
        );
      }
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Error compartiendo foto:', err);
      showToast('⚠ No se pudo abrir el menú de compartir');
    }
  };

  // Open Batch Export Configuration Modal
  const handleExportBatch = () => {
    if (photos.length === 0) return;
    setLastExportSummary(null);
    setIsExportModalOpen(true);
  };

  // Execute Batch Export (JPG individuales a Galería o ZIP persistente; descargar o compartir)
  const handleStartBatchExport = async (mode: 'download' | 'share') => {
    if (photos.length === 0) return;
    setLastExportSummary(null);
    setIsExporting(true);
    setExportProgress({ current: 0, total: photos.length, currentName: '' });

    const onProgress = (current: number, total: number, currentName: string) => {
      setExportProgress({ current, total, currentName });
    };

    try {
      const format = exportOptions.deliveryFormat || 'jpg';
      const result =
        format === 'jpg'
          ? await exportBatchAsJpgs(photos, watermark, frame, onProgress, exportOptions, mode)
          : await exportBatchAsZip(photos, watermark, frame, onProgress, exportOptions, mode);

      const summary: ExportSummaryInfo = {
        scope: 'batch',
        format,
        saved: result.saved,
        total: result.total,
        downscaledCount: result.downscaledCount,
        failedCount: result.failedCount,
        failedNames: result.failedNames,
        destination: result.destination,
        outcome: result.outcome,
        shareUris: result.shareUris,
      };

      if (result.outcome === 'cancelled' && format !== 'zip') {
        setIsExportModalOpen(false);
        showToast('Compartir cancelado');
      } else {
        setLastExportSummary(summary);
        setIsExportModalOpen(true);
        if (result.outcome === 'gallery' || result.outcome === 'documents' || result.outcome === 'download') {
          showToast(`✓ ${result.saved}/${result.total} en ${result.destination}`);
        } else if (result.outcome === 'cancelled') {
          showToast(`Compartir cancelado (ZIP conservado en ${result.destination})`);
        }
      }
    } catch (err) {
      console.error('Error en exportación en lote:', err);
      showToast('⚠ No se pudo completar la exportación');
      setIsExportModalOpen(false);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareAfterSave = async (summary: ExportSummaryInfo) => {
    if (summary.shareUris && summary.shareUris.length > 0) {
      try {
        const res = await shareSavedUris(summary.shareUris, exportOptions.filenamePrefix || 'BereaSnap');
        if (res === 'cancelled') {
          showToast(`Compartir cancelado (archivo conservado en ${summary.destination})`);
        }
      } catch (err) {
        console.error('Error compartiendo archivo guardado:', err);
        showToast('⚠ No se pudo compartir el archivo');
      }
      return;
    }
    if (summary.scope === 'single') {
      await handleSingleShare();
    } else {
      await handleStartBatchExport('share');
    }
  };

  // Delete individual photo (Liberando memoria Blob URL, proxies y stack Undo/Redo)
  const handleDeletePhoto = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentIndex = photos.findIndex((p) => p.id === id);
    const target = photos[currentIndex];
    if (target?.originalUrl?.startsWith('blob:')) {
      evictCachedImage(target.originalUrl);
      URL.revokeObjectURL(target.originalUrl);
    }
    if (target?.thumbnailUrl && target.thumbnailUrl !== target.originalUrl && target.thumbnailUrl.startsWith('blob:')) {
      URL.revokeObjectURL(target.thumbnailUrl);
    }

    const filtered = photos.filter((p) => p.id !== id);
    setPhotos(filtered);
    if (filtered.length === 0) {
      flushPendingBursts();
      studioHistoryRef.current = { past: [], future: [] };
      syncHistoryButtons();
      releaseEngineMemory(true);
      clearSessionDraft();
      setActivePhotoId('');
    } else if (activePhotoId === id) {
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
          if (p.thumbnailUrl && p.thumbnailUrl !== p.originalUrl && p.thumbnailUrl.startsWith('blob:')) {
            URL.revokeObjectURL(p.thumbnailUrl);
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

  const handleGoHome = () => {
    if (photos.length === 0) return;
    setIsExitConfirmOpen(true);
  };

  const confirmGoHome = async () => {
    setIsExitConfirmOpen(false);
    setPendingBatchSync(null);
    setIsRevertPromptOpen(false);
    if (photoBurstTimerRef.current) {
      clearTimeout(photoBurstTimerRef.current);
      photoBurstTimerRef.current = null;
    }
    if (globalBurstTimerRef.current) {
      clearTimeout(globalBurstTimerRef.current);
      globalBurstTimerRef.current = null;
    }
    pendingPhotoBurstRef.current = null;
    pendingGlobalBurstRef.current = null;
    photos.forEach((p) => {
      if (p.originalUrl?.startsWith('blob:')) {
        evictCachedImage(p.originalUrl);
        URL.revokeObjectURL(p.originalUrl);
      }
      if (p.thumbnailUrl && p.thumbnailUrl !== p.originalUrl && p.thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(p.thumbnailUrl);
      }
    });
    studioHistoryRef.current = { past: [], future: [] };
    setCanUndo(false);
    setCanRedo(false);
    releaseEngineMemory(true);
    await cleanupNativeExportCache();
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
        onApplySettingsToAll={handleRequestApplySettingsToAll}
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
              isEyedropperActive={isEyedropperActive}
              onToggleOriginal={(val) => setShowOriginal((prev) => (typeof val === 'boolean' ? val : !prev))}
              onPickWhiteBalance={handlePickWhiteBalance}
              onCancelEyedropper={() => setIsEyedropperActive(false)}
              onNotify={showToast}
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
            onUpdateWatermark={handleUpdateWatermark}
            onUpdateFrame={handleUpdateFrame}
            onApplySettingsToAll={handleRequestApplySettingsToAll}
            onApplyCropToAll={handleRequestApplyCropToAll}
            onSmartCrop={handleSmartCrop}
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
            onNotify={showToast}
            isEyedropperActive={isEyedropperActive}
            onToggleEyedropper={() => setIsEyedropperActive((prev) => !prev)}
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
        lastSummary={lastExportSummary}
        onDismissSummary={() => {
          setLastExportSummary(null);
          setIsExportModalOpen(false);
        }}
        onShareAfterSave={handleShareAfterSave}
        onChangeOptions={setExportOptions}
        onStartExport={handleStartBatchExport}
        onSingleExport={(mode) => {
          if (mode === 'share') {
            handleSingleShare();
          } else {
            handleSingleExport();
          }
        }}
        onClose={() => {
          setLastExportSummary(null);
          setIsExportModalOpen(false);
        }}
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

      {/* Bottom Sheet One UI: Confirmación y Previsualización de Alcance de Acción Global en Lote */}
      {pendingBatchSync && activePhoto && (
        <div className="modal-backdrop oneui-sheet-backdrop" onClick={() => setPendingBatchSync(null)}>
          <div className="export-modal oneui-sheet card-glass" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="oneui-sheet-handle-row"
              style={{ background: 'none', border: 'none' }}
              onClick={() => setPendingBatchSync(null)}
              aria-label="Cerrar confirmación"
            >
              <span className="oneui-sheet-handle" />
            </button>
            <div className="oneui-deck-title-row" style={{ marginBottom: '0.45rem' }}>
              <div className="oneui-param-title-group">
                <span className="oneui-param-title" style={{ fontSize: '0.85rem' }}>
                  {pendingBatchSync === 'adjustments' ? 'APLICAR AJUSTES AL LOTE' : 'APLICAR ENCUADRE AL LOTE'}
                </span>
                <span className="oneui-param-meta-tag">
                  {photos.length} fotos afectadas
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPendingBatchSync(null)}
                className="oneui-reset-tiny-btn"
                aria-label="Cancelar"
              >
                <X size={13} />
              </button>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--oneui-text-secondary)', lineHeight: 1.5, marginBottom: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {pendingBatchSync === 'adjustments' ? (
                <>
                  <span>• Se copiarán luz, color, nitidez y filtro activo ({activePhoto.preset}) a las <strong>{photos.length} fotos</strong>.</span>
                  <span>• Se conservará intacto el encuadre y recorte individual de cada foto.</span>
                  <span>• Podrás revertir todo el cambio con un solo toque en <strong>Deshacer (↺)</strong>.</span>
                </>
              ) : (
                <>
                  <span>• Se aplicará la proporción ({activePhoto.crop.aspectRatio}), rotación y espejo a las <strong>{photos.length} fotos</strong>.</span>
                  <span>• Se conservarán intactos los ajustes de luz y color individuales de cada foto.</span>
                  <span>• Podrás revertir todo el cambio con un solo toque en <strong>Deshacer (↺)</strong>.</span>
                </>
              )}
            </div>
            <div className="oneui-export-actions">
              <button
                type="button"
                onClick={executeConfirmedBatchSync}
                className="oneui-primary-action-btn"
              >
                <span>Aplicar a {photos.length} fotos</span>
              </button>
              <button
                type="button"
                onClick={() => setPendingBatchSync(null)}
                className="oneui-secondary-action-btn"
              >
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet One UI: Elegir Alcance de Restablecimiento (Solo Foto vs Foto + Marco/Firma) */}
      {isRevertPromptOpen && (
        <div className="modal-backdrop oneui-sheet-backdrop" onClick={() => setIsRevertPromptOpen(false)}>
          <div className="export-modal oneui-sheet card-glass" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="oneui-sheet-handle-row"
              style={{ background: 'none', border: 'none' }}
              onClick={() => setIsRevertPromptOpen(false)}
              aria-label="Cerrar opciones de restablecimiento"
            >
              <span className="oneui-sheet-handle" />
            </button>
            <div className="oneui-deck-title-row" style={{ marginBottom: '0.45rem' }}>
              <span className="oneui-param-title" style={{ fontSize: '0.85rem' }}>RESTABLECER CAMBIOS</span>
              <button
                type="button"
                onClick={() => setIsRevertPromptOpen(false)}
                className="oneui-reset-tiny-btn"
                aria-label="Cerrar"
              >
                <X size={13} />
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--oneui-text-secondary)', lineHeight: 1.45, marginBottom: '0.85rem' }}>
              El marco y la firma afectan a todo el lote. Elige qué deseas restablecer:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setIsRevertPromptOpen(false);
                  revertPhotoOnly();
                }}
                className="oneui-primary-action-btn"
              >
                <span>Solo esta foto (luz y encuadre)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRevertPromptOpen(false);
                  revertPhotoOnly();
                  revertGlobalOverlay();
                }}
                className="oneui-secondary-action-btn"
              >
                <span>Foto actual y quitar marco / firma</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet One UI para Confirmar Cierre de Proyecto / Volver al Inicio */}
      {isExitConfirmOpen && (
        <div className="modal-backdrop oneui-sheet-backdrop" onClick={() => setIsExitConfirmOpen(false)}>
          <div className="export-modal oneui-sheet card-glass" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="oneui-sheet-handle-row"
              style={{ background: 'none', border: 'none' }}
              onClick={() => setIsExitConfirmOpen(false)}
              aria-label="Cerrar"
            >
              <span className="oneui-sheet-handle" />
            </button>
            <div className="oneui-deck-title-row" style={{ marginBottom: '0.45rem' }}>
              <div className="oneui-param-title-group">
                <span className="oneui-param-title" style={{ fontSize: '0.85rem' }}>VOLVER AL INICIO</span>
                <span className="oneui-param-meta-tag">
                  {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsExitConfirmOpen(false)}
                className="oneui-reset-tiny-btn"
                title="Cerrar"
                aria-label="Cerrar"
              >
                <X size={13} />
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--oneui-text-secondary)', lineHeight: 1.45, marginBottom: '0.9rem' }}>
              Se cerrará este proyecto y se limpiará el borrador temporal en pantalla. Tus fotografías originales no se modifican ni se borran del dispositivo.
            </p>
            <div className="oneui-export-actions">
              <button
                type="button"
                onClick={confirmGoHome}
                className="oneui-primary-action-btn"
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#ffffff' }}
              >
                <span>Cerrar proyecto</span>
              </button>
              <button
                type="button"
                onClick={() => setIsExitConfirmOpen(false)}
                className="oneui-secondary-action-btn"
              >
                <span>Seguir editando</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
