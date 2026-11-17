import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { renderProcessedPhoto, canvasToBlob, loadImage, releaseScratchBuffer } from './canvasEngine';
import { MediaSaver } from './mediaSaver';
import type { PhotoItem, WatermarkSettings, FrameSettings, ExportOptions } from '../types/editor';

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  qualityPreset: 'max',
  filenamePrefix: 'BereaSnap',
  deliveryFormat: 'jpg',
};

export type ExportOutcome = 'gallery' | 'share' | 'download' | 'file' | 'documents' | 'cancelled';

export interface SingleExportResult {
  outcome: ExportOutcome;
  destination: string;
  downscaled: boolean;
  fileName: string;
  shareUri?: string;
}

export interface BatchExportResult {
  total: number;
  saved: number;
  failedCount: number;
  downscaledCount: number;
  failedNames: string[];
  outcome: ExportOutcome;
  destination: string;
  shareUris?: string[];
}

function isShareCancelError(err: unknown): boolean {
  const msg = String((err as Error)?.message || err || '').toLowerCase();
  const name = String((err as Error)?.name || '').toLowerCase();
  return name === 'aborterror' || msg.includes('cancel') || msg.includes('abort') || msg.includes('dismiss');
}

/**
 * Abre el selector nativo para compartir URIs ya guardadas sin volver a renderizar.
 */
export async function shareSavedUris(uris: string[], title: string): Promise<'shared' | 'cancelled'> {
  if (!Capacitor.isNativePlatform() || uris.length === 0) return 'cancelled';
  try {
    await Share.share({
      title,
      files: uris,
      dialogTitle: 'Compartir archivos de BereaSnap',
    });
    return 'shared';
  } catch (err) {
    if (isShareCancelError(err)) return 'cancelled';
    throw err;
  }
}

/**
 * Guarda una foto JPG directamente en la Galería de Android (Pictures/BereaSnap).
 * Devuelve false si el plugin nativo no está disponible o el permiso fue denegado.
 */
async function saveBlobToGallery(blob: Blob, fileName: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const data = await blobToBase64(blob);
    await MediaSaver.saveImage({ data, fileName, album: 'BereaSnap' });
    return true;
  } catch (err) {
    console.warn('[MediaSaver] Galería no disponible, se usará alternativa:', err);
    return false;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

/**
 * Limpia archivos temporales de exportaciones anteriores en Directory.Cache para no acumular espacio.
 */
export async function cleanupNativeExportCache(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Filesystem.rmdir({
      path: 'BereaSnap_export',
      directory: Directory.Cache,
      recursive: true,
    });
  } catch {
    // La carpeta no existe aún o ya fue eliminada
  }
}

/**
 * Persiste un archivo en Documentos/BereaSnap (Android) o descarga en Web, y abre Share solo si se pidió 'share'.
 */
async function deliverExportedFile(
  blob: Blob,
  fileName: string,
  mimeType: string,
  mode: 'download' | 'share' = 'download'
): Promise<{ outcome: ExportOutcome; destination: string; uri?: string }> {
  if (Capacitor.isNativePlatform()) {
    const base64Data = await blobToBase64(blob);
    let savedUri: string;
    let destination = `Documentos/BereaSnap/${fileName}`;

    try {
      const res = await Filesystem.writeFile({
        path: `BereaSnap/${fileName}`,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });
      savedUri = res.uri;
    } catch {
      try {
        const resData = await Filesystem.writeFile({
          path: `BereaSnap/${fileName}`,
          data: base64Data,
          directory: Directory.Data,
          recursive: true,
        });
        savedUri = resData.uri;
        destination = `Almacenamiento interno/BereaSnap/${fileName}`;
      } catch {
        await cleanupNativeExportCache();
        const resCache = await Filesystem.writeFile({
          path: `BereaSnap_export/${fileName}`,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        savedUri = resCache.uri;
        destination = `Caché temporal/${fileName}`;
      }
    }

    if (mode === 'share') {
      try {
        await Share.share({
          title: fileName,
          text: 'Editada con BereaSnap',
          url: savedUri,
          dialogTitle: 'Compartir archivo',
        });
        return { outcome: 'share', destination, uri: savedUri };
      } catch (shareErr) {
        if (isShareCancelError(shareErr)) {
          return { outcome: 'cancelled', destination, uri: savedUri };
        }
        throw shareErr;
      }
    }

    return { outcome: 'documents', destination, uri: savedUri };
  }

  if (mode === 'share' && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([blob], fileName, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: fileName,
          text: 'Editada con BereaSnap',
          files: [file],
        });
        return { outcome: 'share', destination: 'Hoja de compartir' };
      }
    } catch (err) {
      if (isShareCancelError(err)) {
        return { outcome: 'cancelled', destination: 'Hoja de compartir' };
      }
    }
  }

  saveAs(blob, fileName);
  return { outcome: 'download', destination: `Descargas/${fileName}` };
}

/**
 * Exporta o comparte una sola foto procesada con reintento seguro a 1600px si falta RAM.
 */
export async function exportSinglePhoto(
  photo: PhotoItem,
  watermark: WatermarkSettings,
  frame: FrameSettings,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  mode: 'download' | 'share' = 'download'
): Promise<SingleExportResult> {
  const maxDim = options.qualityPreset === 'social' ? 2048 : 0;
  const jpegQuality = options.qualityPreset === 'social' ? 0.85 : 0.96;
  const prefix = (options.filenamePrefix || 'BereaSnap').trim().replace(/[^a-zA-Z0-9_-]/g, '_');

  let canvas: HTMLCanvasElement | null = null;
  let downscaled = false;
  try {
    let blob: Blob;
    try {
      canvas = await renderProcessedPhoto(
        photo.originalUrl,
        photo.adjustments,
        watermark,
        frame,
        photo.crop,
        maxDim
      );
      blob = await canvasToBlob(canvas, jpegQuality);
    } catch (fullErr) {
      console.warn(`Error renderizando ${photo.name} en máxima resolución, reintentando a 1600px:`, fullErr);
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      canvas = await renderProcessedPhoto(
        photo.originalUrl,
        photo.adjustments,
        watermark,
        frame,
        photo.crop,
        1600
      );
      blob = await canvasToBlob(canvas, 0.85);
      downscaled = true;
    }

    const cleanName = photo.name.replace(/\.[^/.]+$/, '');
    const fileName = `${prefix}_${cleanName}.jpg`;

    if (mode === 'download' && (await saveBlobToGallery(blob, fileName))) {
      return {
        outcome: 'gallery',
        destination: 'Galería › Álbum BereaSnap',
        downscaled,
        fileName,
      };
    }

    const delivered = await deliverExportedFile(blob, fileName, 'image/jpeg', mode);
    return {
      outcome: delivered.outcome,
      destination: delivered.destination,
      downscaled,
      fileName,
      shareUri: delivered.uri,
    };
  } finally {
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
    releaseScratchBuffer();
  }
}

/**
 * Procesa en lote todas las fotos y las entrega como archivos JPG individuales,
 * reportando fallos parciales y copias reducidas a 1600px sin abortar todo el lote.
 */
export async function exportBatchAsJpgs(
  photos: PhotoItem[],
  watermark: WatermarkSettings,
  frame: FrameSettings,
  onProgress: (current: number, total: number, currentName: string) => void,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  mode: 'download' | 'share' = 'download'
): Promise<BatchExportResult> {
  const prefix = (options.filenamePrefix || 'BereaSnap').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const maxDim = options.qualityPreset === 'social' ? 2048 : 0;
  const jpegQuality = options.qualityPreset === 'social' ? 0.85 : 0.96;
  const isNative = Capacitor.isNativePlatform();

  let cachedPngFrame: HTMLImageElement | null = null;
  if (frame.style === 'custom-png' && frame.pngDataUrl) {
    try {
      cachedPngFrame = await loadImage(frame.pngDataUrl);
    } catch (e) {
      console.warn('[BatchExport] No se pudo precargar marco PNG:', e);
    }
  }

  let cachedLogo: HTMLImageElement | null = null;
  if (watermark.enabled && watermark.type === 'image' && watermark.imageDataUrl) {
    try {
      cachedLogo = await loadImage(watermark.imageDataUrl);
    } catch (e) {
      console.warn('[BatchExport] No se pudo precargar logo:', e);
    }
  }

  let savedToGallery = 0;
  let downscaledCount = 0;
  const failedNames: string[] = [];
  let galleryAvailable = isNative && mode === 'download';
  const nativeShareUris: string[] = [];
  const webShareFiles: File[] = [];
  let processedCount = 0;

  if (isNative) {
    await cleanupNativeExportCache();
  }

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    onProgress(i + 1, photos.length, photo.name);
    await new Promise((resolve) => setTimeout(resolve, 40));

    let canvas: HTMLCanvasElement | null = null;
    try {
      let blob: Blob;
      try {
        canvas = await renderProcessedPhoto(
          photo.originalUrl, photo.adjustments, watermark, frame, photo.crop, maxDim, cachedPngFrame, cachedLogo
        );
        blob = await canvasToBlob(canvas, jpegQuality);
      } catch (error) {
        console.error(`Error procesando ${photo.name} a resolución completa, reintento a 1600px:`, error);
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
        }
        canvas = await renderProcessedPhoto(
          photo.originalUrl, photo.adjustments, watermark, frame, photo.crop, 1600, cachedPngFrame, cachedLogo
        );
        blob = await canvasToBlob(canvas, 0.85);
        downscaledCount++;
      }

      const cleanName = photo.name.replace(/\.[^/.]+$/, '');
      const fileName = `${prefix}_${String(i + 1).padStart(2, '0')}_${cleanName}.jpg`;

      if (isNative) {
        if (galleryAvailable) {
          if (await saveBlobToGallery(blob, fileName)) {
            savedToGallery++;
          } else {
            galleryAvailable = false;
          }
        }
        if (!galleryAvailable) {
          const base64Data = await blobToBase64(blob);
          const res = await Filesystem.writeFile({
            path: `BereaSnap_export/${fileName}`,
            data: base64Data,
            directory: Directory.Cache,
            recursive: true,
          });
          nativeShareUris.push(res.uri);
        }
      } else if (mode === 'share') {
        webShareFiles.push(new File([blob], fileName, { type: 'image/jpeg' }));
      } else {
        saveAs(blob, fileName);
        await new Promise((resolve) => setTimeout(resolve, 260));
      }
      processedCount++;
    } catch (retryErr) {
      console.error(`Fallo definitivo en foto ${photo.name}:`, retryErr);
      failedNames.push(photo.name);
    } finally {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
      }
    }
  }

  releaseScratchBuffer();

  if (processedCount === 0) {
    throw new Error('No se pudo procesar ninguna fotografía del lote.');
  }

  if (isNative) {
    if (nativeShareUris.length > 0) {
      try {
        await Share.share({
          title: `${prefix} (${nativeShareUris.length} fotos)`,
          files: nativeShareUris,
          dialogTitle: 'Compartir fotografías',
        });
        return {
          total: photos.length,
          saved: processedCount,
          failedCount: failedNames.length,
          downscaledCount,
          failedNames,
          outcome: 'share',
          destination: 'Hoja de compartir Android',
          shareUris: nativeShareUris,
        };
      } catch (shareErr) {
        if (isShareCancelError(shareErr)) {
          return {
            total: photos.length,
            saved: processedCount,
            failedCount: failedNames.length,
            downscaledCount,
            failedNames,
            outcome: 'cancelled',
            destination: 'Envío cancelado',
            shareUris: nativeShareUris,
          };
        }
        throw shareErr;
      }
    }
    return {
      total: photos.length,
      saved: savedToGallery,
      failedCount: failedNames.length,
      downscaledCount,
      failedNames,
      outcome: 'gallery',
      destination: 'Galería › Álbum BereaSnap',
    };
  }

  if (mode === 'share' && webShareFiles.length > 0 && typeof navigator !== 'undefined' && navigator.canShare?.({ files: webShareFiles })) {
    try {
      await navigator.share({ title: prefix, files: webShareFiles });
      return {
        total: photos.length,
        saved: processedCount,
        failedCount: failedNames.length,
        downscaledCount,
        failedNames,
        outcome: 'share',
        destination: 'Hoja de compartir',
      };
    } catch (err) {
      if (isShareCancelError(err)) {
        return {
          total: photos.length,
          saved: processedCount,
          failedCount: failedNames.length,
          downscaledCount,
          failedNames,
          outcome: 'cancelled',
          destination: 'Envío cancelado',
        };
      }
    }
  }
  if (mode === 'share') {
    webShareFiles.forEach((f) => saveAs(f, f.name));
  }
  return {
    total: photos.length,
    saved: processedCount,
    failedCount: failedNames.length,
    downscaledCount,
    failedNames,
    outcome: 'download',
    destination: 'Carpeta de Descargas',
  };
}

/**
 * Procesa en lote todas las fotos, las comprime en un archivo .ZIP persistente y devuelve resumen completo
 */
export async function exportBatchAsZip(
  photos: PhotoItem[],
  watermark: WatermarkSettings,
  frame: FrameSettings,
  onProgress: (current: number, total: number, currentName: string) => void,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  mode: 'download' | 'share' = 'download'
): Promise<BatchExportResult> {
  const zip = new JSZip();
  const prefix = (options.filenamePrefix || 'BereaSnap').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const maxDim = options.qualityPreset === 'social' ? 2048 : 0;
  const jpegQuality = options.qualityPreset === 'social' ? 0.85 : 0.96;

  const folder = zip.folder(`${prefix}_Editadas`);

  let cachedPngFrame: HTMLImageElement | null = null;
  if (frame.style === 'custom-png' && frame.pngDataUrl) {
    try {
      cachedPngFrame = await loadImage(frame.pngDataUrl);
    } catch (e) {
      console.warn('[BatchExport] No se pudo precargar marco PNG:', e);
    }
  }

  let cachedLogo: HTMLImageElement | null = null;
  if (watermark.enabled && watermark.type === 'image' && watermark.imageDataUrl) {
    try {
      cachedLogo = await loadImage(watermark.imageDataUrl);
    } catch (e) {
      console.warn('[BatchExport] No se pudo precargar logo:', e);
    }
  }

  let processedCount = 0;
  let downscaledCount = 0;
  const failedNames: string[] = [];

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    onProgress(i + 1, photos.length, photo.name);
    await new Promise((resolve) => setTimeout(resolve, 40));

    let canvas: HTMLCanvasElement | null = null;
    try {
      let blob: Blob;
      try {
        canvas = await renderProcessedPhoto(
          photo.originalUrl,
          photo.adjustments,
          watermark,
          frame,
          photo.crop,
          maxDim,
          cachedPngFrame,
          cachedLogo
        );
        blob = await canvasToBlob(canvas, jpegQuality);
      } catch (error) {
        console.error(`Error procesando foto ${photo.name} a resolución completa:`, error);
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
        }
        canvas = await renderProcessedPhoto(
          photo.originalUrl,
          photo.adjustments,
          watermark,
          frame,
          photo.crop,
          1600,
          cachedPngFrame,
          cachedLogo
        );
        blob = await canvasToBlob(canvas, 0.85);
        downscaledCount++;
      }

      const cleanName = photo.name.replace(/\.[^/.]+$/, '');
      const paddedIndex = String(i + 1).padStart(2, '0');
      const fileName = `${prefix}_${paddedIndex}_${cleanName}.jpg`;

      folder?.file(fileName, blob);
      processedCount++;
    } catch (retryErr) {
      console.error(`Fallo definitivo en foto ${photo.name}:`, retryErr);
      failedNames.push(photo.name);
    } finally {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
      }
    }
  }

  releaseScratchBuffer();

  if (processedCount === 0) {
    throw new Error('No se pudo procesar ninguna fotografía del lote.');
  }

  const zipContent = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 4 },
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const zipFileName = `${prefix}_Lote_${dateStr}.zip`;

  const delivered = await deliverExportedFile(zipContent, zipFileName, 'application/zip', mode);

  return {
    total: photos.length,
    saved: processedCount,
    failedCount: failedNames.length,
    downscaledCount,
    failedNames,
    outcome: delivered.outcome,
    destination: delivered.destination,
    shareUris: delivered.uri ? [delivered.uri] : undefined,
  };
}
