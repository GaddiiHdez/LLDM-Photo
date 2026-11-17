import { idbGet, idbSet, idbDelete, idbDeleteByPrefix } from './idbStorage';
import { getDrawableImageUrl } from './rawDecoder';
import type { PhotoItem, ImageAdjustments, CropSettings, PresetType, FrameSettings, WatermarkSettings } from '../types/editor';

const DRAFT_STORAGE_KEY = 'bereasnap_active_session_draft';
const BLOB_KEY_PREFIX = 'bereasnap_draft_blob_';
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface DraftPhotoEntry {
  id: string;
  name: string;
  sizeFormatted: string;
  width: number;
  height: number;
  /** Solo presente en borradores legacy v1; en v2 los binarios viven en claves separadas */
  blob?: Blob;
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
 * Rastrea qué binarios de fotos ya fueron persistidos en IndexedDB (id -> firma de archivo)
 * para que mover sliders o cambiar el marco no reescriba decenas de MB en disco cada 1.5s.
 */
const persistedBlobSignatures = new Map<string, string>();
let activeSaveChain: Promise<void> = Promise.resolve();

function getPhotoBlobSignature(photo: PhotoItem): string {
  const size = photo.file instanceof Blob ? photo.file.size : 0;
  return `${photo.name}|${size}|${photo.originalUrl}`;
}

async function resolvePhotoBlob(photo: PhotoItem): Promise<Blob | null> {
  if (photo.file instanceof Blob) {
    return photo.file;
  }
  if (photo.originalUrl) {
    try {
      const res = await fetch(photo.originalUrl);
      return await res.blob();
    } catch (fetchErr) {
      console.warn('[SessionDraft] Error obteniendo blob para', photo.name, fetchErr);
    }
  }
  return null;
}

/**
 * Guarda el lote completo de fotos, ajustes, marco y firma en IndexedDB de forma incremental:
 * los binarios nuevos se escriben una sola vez y los ajustes ligeros se actualizan en <5ms.
 */
export function saveSessionDraft(
  photos: PhotoItem[],
  activePhotoId: string,
  frame: FrameSettings,
  watermark: WatermarkSettings
): Promise<void> {
  activeSaveChain = activeSaveChain
    .catch(() => {})
    .then(async () => {
      if (!photos || photos.length === 0) {
        await clearSessionDraft();
        return;
      }

      try {
        const draftPhotos: DraftPhotoEntry[] = [];
        const currentIds = new Set<string>();

        for (const photo of photos) {
          currentIds.add(photo.id);
          const sig = getPhotoBlobSignature(photo);

          if (persistedBlobSignatures.get(photo.id) !== sig) {
            const blob = await resolvePhotoBlob(photo);
            if (!blob) continue;
            await idbSet(`${BLOB_KEY_PREFIX}${photo.id}`, blob);
            persistedBlobSignatures.set(photo.id, sig);
          }

          draftPhotos.push({
            id: photo.id,
            name: photo.name,
            sizeFormatted: photo.sizeFormatted,
            width: photo.width,
            height: photo.height,
            adjustments: { ...photo.adjustments },
            crop: { ...photo.crop },
            preset: photo.preset,
            isRaw: Boolean(photo.isRaw),
            metadata: photo.metadata ? { ...photo.metadata } : undefined,
          });
        }

        // Podar binarios de fotos eliminadas de la sesión
        for (const trackedId of Array.from(persistedBlobSignatures.keys())) {
          if (!currentIds.has(trackedId)) {
            await idbDelete(`${BLOB_KEY_PREFIX}${trackedId}`);
            persistedBlobSignatures.delete(trackedId);
          }
        }

        if (draftPhotos.length === 0) return;

        const draftData: SessionDraftData = {
          version: 2,
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
    });

  return activeSaveChain;
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

    persistedBlobSignatures.clear();
    const restoredPhotos: PhotoItem[] = [];

    for (const dp of draft.photos) {
      if (!dp || typeof dp.id !== 'string' || typeof dp.name !== 'string') continue;

      const blob =
        dp.blob instanceof Blob
          ? dp.blob
          : await idbGet<Blob>(`${BLOB_KEY_PREFIX}${dp.id}`);

      if (!(blob instanceof Blob) || blob.size === 0) continue;

      const file = new File([blob], dp.name, { type: blob.type || 'image/jpeg' });
      const originalUrl = dp.isRaw
        ? await getDrawableImageUrl(file)
        : URL.createObjectURL(blob);

      const item: PhotoItem = {
        id: dp.id,
        file,
        name: dp.name,
        sizeFormatted: dp.sizeFormatted || `${(blob.size / (1024 * 1024)).toFixed(1)} MB`,
        width: typeof dp.width === 'number' && dp.width > 0 ? dp.width : 4000,
        height: typeof dp.height === 'number' && dp.height > 0 ? dp.height : 3000,
        originalUrl,
        thumbnailUrl: originalUrl,
        adjustments: {
          brightness: dp.adjustments?.brightness ?? 0,
          contrast: dp.adjustments?.contrast ?? 0,
          saturation: dp.adjustments?.saturation ?? 0,
          warmth: dp.adjustments?.warmth ?? 0,
          tint: dp.adjustments?.tint ?? 0,
          shadows: dp.adjustments?.shadows ?? 0,
          highlights: dp.adjustments?.highlights ?? 0,
          sharpness: dp.adjustments?.sharpness ?? 0,
          clarity: dp.adjustments?.clarity ?? 0,
          noiseReduction: dp.adjustments?.noiseReduction ?? 0,
          skinToneGuard: dp.adjustments?.skinToneGuard ?? true,
        },
        crop: {
          aspectRatio: dp.crop?.aspectRatio ?? 'original',
          orientation: dp.crop?.orientation ?? ((dp.width || 4000) >= (dp.height || 3000) ? 'landscape' : 'portrait'),
          offsetX: dp.crop?.offsetX ?? 0,
          offsetY: dp.crop?.offsetY ?? 0,
          zoom: dp.crop?.zoom ?? 1,
          rotation: dp.crop?.rotation ?? 0,
          straighten: dp.crop?.straighten ?? 0,
          flipH: dp.crop?.flipH ?? false,
          flipV: dp.crop?.flipV ?? false,
        },
        preset: dp.preset || 'custom',
        isRaw: Boolean(dp.isRaw),
        metadata: dp.metadata,
      };

      // Si venía de v1 embebido, migrar el blob a clave separada para los siguientes guardados
      if (dp.blob instanceof Blob) {
        await idbSet(`${BLOB_KEY_PREFIX}${dp.id}`, blob);
      }
      persistedBlobSignatures.set(dp.id, getPhotoBlobSignature(item));
      restoredPhotos.push(item);
    }

    if (restoredPhotos.length === 0) {
      return null;
    }

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
 * Elimina el borrador de la sesión actual y todos los binarios asociados en IndexedDB
 */
export async function clearSessionDraft(): Promise<void> {
  try {
    persistedBlobSignatures.clear();
    await idbDelete(DRAFT_STORAGE_KEY);
    await idbDeleteByPrefix(BLOB_KEY_PREFIX);
  } catch (err) {
    console.warn('[SessionDraft] Error limpiando borrador:', err);
  }
}
