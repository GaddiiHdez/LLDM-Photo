import { idbGet, idbSet } from './idbStorage';
import type { PhotoItem, ImageAdjustments, CropSettings, PresetType, FrameSettings, WatermarkSettings } from '../types/editor';

const DRAFT_STORAGE_KEY = 'bereasnap_active_session_draft';
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface DraftPhotoEntry {
  id: string;
  name: string;
  sizeFormatted: string;
  width: number;
  height: number;
  blob: Blob;
  adjustments: ImageAdjustments;
  crop: CropSettings;
  preset: PresetType;
  isRaw: boolean;
  metadata?: any;
}

export interface SessionDraftData {
  version: number;
  savedAt: number;
  activePhotoId: string;
  frame: FrameSettings;
  watermark: WatermarkSettings;
  photos: DraftPhotoEntry[];
}

export interface DraftSummary {
  exists: boolean;
  count: number;
  savedAt: number;
}

/**
 * Guarda el lote completo de fotos, ajustes, marco y firma en IndexedDB
 */
export async function saveSessionDraft(
  photos: PhotoItem[],
  activePhotoId: string,
  frame: FrameSettings,
  watermark: WatermarkSettings
): Promise<void> {
  if (!photos || photos.length === 0) {
    await clearSessionDraft();
    return;
  }

  try {
    const draftPhotos: DraftPhotoEntry[] = [];

    for (const photo of photos) {
      let blob: Blob | null = null;
      if (photo.file instanceof Blob) {
        blob = photo.file;
      } else if (photo.originalUrl) {
        try {
          const res = await fetch(photo.originalUrl);
          blob = await res.blob();
        } catch (fetchErr) {
          console.warn('[SessionDraft] Error obteniendo blob para', photo.name, fetchErr);
        }
      }

      if (blob) {
        draftPhotos.push({
          id: photo.id,
          name: photo.name,
          sizeFormatted: photo.sizeFormatted || `${(blob.size / (1024 * 1024)).toFixed(1)} MB`,
          width: photo.width,
          height: photo.height,
          blob,
          adjustments: { ...photo.adjustments },
          crop: { ...photo.crop },
          preset: photo.preset,
          isRaw: Boolean(photo.isRaw),
          metadata: photo.metadata ? { ...photo.metadata } : undefined,
        });
      }
    }

    if (draftPhotos.length === 0) return;

    const draftData: SessionDraftData = {
      version: 1,
      savedAt: Date.now(),
      activePhotoId: activePhotoId || draftPhotos[0].id,
      frame: { ...frame },
      watermark: { ...watermark },
      photos: draftPhotos,
    };

    await idbSet(DRAFT_STORAGE_KEY, draftData);
  } catch (err) {
    console.warn('[SessionDraft] Error guardando borrador:', err);
  }
}

/**
 * Comprueba si existe un borrador recuperable válido en IndexedDB
 */
export async function checkSessionDraft(): Promise<DraftSummary | null> {
  try {
    const draft = await idbGet<SessionDraftData>(DRAFT_STORAGE_KEY);
    if (!draft || !draft.photos || draft.photos.length === 0) {
      return null;
    }

    const age = Date.now() - draft.savedAt;
    if (age > MAX_DRAFT_AGE_MS) {
      await clearSessionDraft();
      return null;
    }

    return {
      exists: true,
      count: draft.photos.length,
      savedAt: draft.savedAt,
    };
  } catch (err) {
    console.warn('[SessionDraft] Error comprobando borrador:', err);
    return null;
  }
}

/**
 * Restaura la sesión anterior desde IndexedDB recreando los Object URLs de las fotos
 */
export async function restoreSessionDraft(): Promise<{
  photos: PhotoItem[];
  activePhotoId: string;
  frame?: FrameSettings;
  watermark?: WatermarkSettings;
} | null> {
  try {
    const draft = await idbGet<SessionDraftData>(DRAFT_STORAGE_KEY);
    if (!draft || !draft.photos || draft.photos.length === 0) {
      return null;
    }

    const restoredPhotos: PhotoItem[] = draft.photos.map((dp) => {
      const file = new File([dp.blob], dp.name, { type: dp.blob.type || 'image/jpeg' });
      const originalUrl = URL.createObjectURL(dp.blob);
      return {
        id: dp.id,
        file,
        name: dp.name,
        sizeFormatted: dp.sizeFormatted || `${(dp.blob.size / (1024 * 1024)).toFixed(1)} MB`,
        width: dp.width,
        height: dp.height,
        originalUrl,
        thumbnailUrl: originalUrl,
        adjustments: dp.adjustments,
        crop: dp.crop,
        preset: dp.preset,
        isRaw: dp.isRaw,
        metadata: dp.metadata,
      };
    });

    return {
      photos: restoredPhotos,
      activePhotoId: draft.activePhotoId || restoredPhotos[0].id,
      frame: draft.frame,
      watermark: draft.watermark,
    };
  } catch (err) {
    console.error('[SessionDraft] Error restaurando sesión:', err);
    return null;
  }
}

/**
 * Elimina el borrador de la sesión actual
 */
export async function clearSessionDraft(): Promise<void> {
  try {
    await idbSet(DRAFT_STORAGE_KEY, null);
  } catch (err) {
    console.warn('[SessionDraft] Error limpiando borrador:', err);
  }
}
