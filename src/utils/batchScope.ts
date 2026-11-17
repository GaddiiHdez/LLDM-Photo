import type { PhotoItem, PhotoMetadata } from '../types/editor';

export function shouldAutoFillFrameFromImport(
  existingPhotoCount: number,
  metadata?: PhotoMetadata
): boolean {
  if (existingPhotoCount > 0) return false;
  return Boolean(metadata?.detectedEvent && metadata?.dateFormatted);
}

export function buildBatchAdjustmentsSnapshot(
  photos: PhotoItem[],
  sourcePhoto: PhotoItem
): PhotoItem[] {
  return photos.map((p) => ({
    ...p,
    adjustments: { ...sourcePhoto.adjustments },
    preset: sourcePhoto.preset,
    crop: { ...p.crop },
  }));
}

export function describeEventSuggestion(metadata?: PhotoMetadata): {
  label: string;
  isEstimatedDate: boolean;
} {
  const isEstimatedDate = metadata?.dateSource === 'file-mtime';
  if (!metadata?.detectedEvent || !metadata?.dateFormatted) {
    return {
      label: isEstimatedDate ? 'Fecha aproximada del archivo' : 'Sin metadatos de captura',
      isEstimatedDate,
    };
  }
  return {
    label: isEstimatedDate
      ? `Sugerencia: ${metadata.detectedEvent} • ${metadata.dateFormatted} (fecha del archivo)`
      : `Sugerencia EXIF: ${metadata.detectedEvent} • ${metadata.dateFormatted}`,
    isEstimatedDate,
  };
}
