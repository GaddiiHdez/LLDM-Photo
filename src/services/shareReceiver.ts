import { registerPlugin, Capacitor } from '@capacitor/core';

export interface SharedImageItem {
  path: string;
  name: string;
  mimeType: string;
}

interface ShareReceiverPlugin {
  consumePendingSharedImages(): Promise<{ items: SharedImageItem[] }>;
  clearSharedCache(): Promise<void>;
  addListener(
    eventName: 'sharedImagesReceived',
    listenerFunc: (data: { items: SharedImageItem[] }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

const ShareReceiver = registerPlugin<ShareReceiverPlugin>('ShareReceiver');

/**
 * Convierte las rutas en caché entregadas por Android en objetos File reales
 * preservando bytes originales y metadatos EXIF.
 */
export async function resolveSharedFiles(items: SharedImageItem[]): Promise<File[]> {
  const files: File[] = [];
  for (const item of items) {
    try {
      const url = Capacitor.convertFileSrc(item.path);
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      files.push(new File([blob], item.name, { type: item.mimeType || blob.type || 'image/jpeg' }));
    } catch (err) {
      console.warn('[ShareReceiver] Error cargando imagen compartida:', item.name, err);
    }
  }
  return files;
}

export async function consumePendingSharedFiles(): Promise<File[]> {
  if (!Capacitor.isNativePlatform()) return [];
  try {
    const { items } = await ShareReceiver.consumePendingSharedImages();
    if (!items || items.length === 0) return [];
    const files = await resolveSharedFiles(items);
    await ShareReceiver.clearSharedCache().catch(() => {});
    return files;
  } catch (err) {
    console.warn('[ShareReceiver] No se pudieron leer imágenes pendientes:', err);
    return [];
  }
}

export async function subscribeSharedFiles(onFiles: (files: File[]) => void): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => {};
  try {
    const handle = await ShareReceiver.addListener('sharedImagesReceived', async ({ items }) => {
      if (!items || items.length === 0) return;
      const files = await resolveSharedFiles(items);
      await ShareReceiver.clearSharedCache().catch(() => {});
      if (files.length > 0) {
        onFiles(files);
      }
    });
    return () => {
      handle.remove().catch(() => {});
    };
  } catch {
    return () => {};
  }
}
