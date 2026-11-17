import type {
  CropSettings,
  FrameSettings,
  ImageAdjustments,
  PhotoItem,
  PresetType,
  WatermarkSettings,
} from '../types/editor';

export interface PhotoSnapshot {
  adjustments: ImageAdjustments;
  crop: CropSettings;
  preset: PresetType;
}

export interface StudioGlobalSnapshot {
  frame: FrameSettings;
  watermark: WatermarkSettings;
}

export interface BatchPhotoEntry {
  id: string;
  snapshot: PhotoSnapshot;
}

export type StudioHistoryEntry =
  | {
      kind: 'photo';
      photoId: string;
      before: PhotoSnapshot;
      after: PhotoSnapshot;
      label?: string;
    }
  | {
      kind: 'global';
      before: StudioGlobalSnapshot;
      after: StudioGlobalSnapshot;
      label?: string;
    }
  | {
      kind: 'batch-photos';
      scope: 'adjustments' | 'crop';
      before: BatchPhotoEntry[];
      after: BatchPhotoEntry[];
      label: string;
    };

export interface StudioHistoryStack {
  past: StudioHistoryEntry[];
  future: StudioHistoryEntry[];
}

export const MAX_HISTORY_ENTRIES = 40;

export function clonePhotoSnapshot(snap: PhotoSnapshot): PhotoSnapshot {
  return {
    adjustments: { ...snap.adjustments },
    crop: { ...snap.crop },
    preset: snap.preset,
  };
}

export function cloneGlobalSnapshot(snap: StudioGlobalSnapshot): StudioGlobalSnapshot {
  return {
    frame: { ...snap.frame },
    watermark: { ...snap.watermark },
  };
}

export function capturePhotoSnapshot(photo: PhotoItem): PhotoSnapshot {
  return clonePhotoSnapshot({
    adjustments: photo.adjustments,
    crop: photo.crop,
    preset: photo.preset,
  });
}

export function isHistoryEntryNoop(entry: StudioHistoryEntry): boolean {
  if (entry.kind === 'photo') {
    return (
      entry.before.preset === entry.after.preset &&
      JSON.stringify(entry.before.adjustments) === JSON.stringify(entry.after.adjustments) &&
      JSON.stringify(entry.before.crop) === JSON.stringify(entry.after.crop)
    );
  }
  if (entry.kind === 'global') {
    return (
      JSON.stringify(entry.before.frame) === JSON.stringify(entry.after.frame) &&
      JSON.stringify(entry.before.watermark) === JSON.stringify(entry.after.watermark)
    );
  }
  return entry.before.length === 0;
}

export function pushStudioHistoryEntry(
  stack: StudioHistoryStack,
  entry: StudioHistoryEntry
): StudioHistoryStack {
  if (isHistoryEntryNoop(entry)) {
    return stack;
  }
  const nextPast = [...stack.past, entry];
  if (nextPast.length > MAX_HISTORY_ENTRIES) {
    nextPast.shift();
  }
  return {
    past: nextPast,
    future: [],
  };
}

export function popUndoEntry(stack: StudioHistoryStack): {
  entry: StudioHistoryEntry | null;
  nextStack: StudioHistoryStack;
} {
  if (stack.past.length === 0) {
    return { entry: null, nextStack: stack };
  }
  const past = stack.past.slice();
  const entry = past.pop()!;
  return {
    entry,
    nextStack: {
      past,
      future: [...stack.future, entry],
    },
  };
}

export function popRedoEntry(stack: StudioHistoryStack): {
  entry: StudioHistoryEntry | null;
  nextStack: StudioHistoryStack;
} {
  if (stack.future.length === 0) {
    return { entry: null, nextStack: stack };
  }
  const future = stack.future.slice();
  const entry = future.pop()!;
  return {
    entry,
    nextStack: {
      past: [...stack.past, entry],
      future,
    },
  };
}
