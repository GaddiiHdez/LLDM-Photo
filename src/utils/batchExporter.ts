import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { renderProcessedPhoto, canvasToBlob, loadImage } from './canvasEngine';
import { MediaSaver } from './mediaSaver';
import type { PhotoItem, WatermarkSettings, FrameSettings, ExportOptions } from '../types/editor';

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  qualityPreset: 'max',
  filenamePrefix: 'BereaSnap',
  deliveryFormat: 'jpg',
};

export type ExportOutcome = 'gallery' | 'share' | 'download' | 'file';

export interface BatchExportResult {
  total: number;
  saved: number;
  outcome: ExportOutcome;
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
 * Guarda un archivo en almacenamiento nativo de Android (Carpeta Documents/BereaSnap)
 * o abre la hoja nativa de Compartir de Android/iOS. En Web usa descarga directa o Web Share API.
 */
async function deliverExportedFile(
  blob: Blob,
  fileName: string,
  mimeType: string,
  mode: 'download' | 'share' = 'download'
): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob);
      const subPath = `BereaSnap/${fileName}`;

      // Intentar guardar en Documents/BereaSnap para que quede persistente en el teléfono
      let savedUri: string;
      try {
        const res = await Filesystem.writeFile({
          path: subPath,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
        savedUri = res.uri;
      } catch {
        // Fallback a Directory.Cache si el permiso de Documents está restringido en alguna versión de Android
        const resCache = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });
        savedUri = resCache.uri;
      }

      if (mode === 'share') {
        await Share.share({
          title: fileName,
          text: 'Fotografía editada con BereaSnap',
          url: savedUri,
          dialogTitle: 'Compartir o Guardar Fotografía',
        });
      } else {
        // En Android también abrimos el diálogo nativo para que el usuario pueda enviarla a Galería/WhatsApp con 1 toque
        await Share.share({
          title: fileName,
          url: savedUri,
          dialogTitle: `Guardado en Documentos/BereaSnap (${fileName})`,
        });
      }

      return savedUri;
    } catch (err) {
      console.error('[Native Export] Error guardando/compartiendo en Android:', err);
      saveAs(blob, fileName);
      return null;
    }
  }

  // En navegador Web / Móvil si se pidió "share" y el navegador soporta Web Share API de archivos
  if (mode === 'share' && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([blob], fileName, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: fileName,
          text: 'Editada con BereaSnap',
          files: [file],
        });
        return null;
      }
    } catch (err) {
      // Si el usuario cancela el share o falla, continuar o ignorar
      if ((err as Error)?.name === 'AbortError') return null;
    }
  }

  saveAs(blob, fileName);
  return null;
}

/**
 * Exporta o comparte una sola foto procesada
 */
export async function exportSinglePhoto(
  photo: PhotoItem,
  watermark: WatermarkSettings,
  frame: FrameSettings,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  mode: 'download' | 'share' = 'download'
): Promise<ExportOutcome> {
  const maxDim = options.qualityPreset === 'social' ? 2048 : 0;
  const jpegQuality = options.qualityPreset === 'social' ? 0.85 : 0.96;
  const prefix = (options.filenamePrefix || 'BereaSnap').trim().replace(/[^a-zA-Z0-9_-]/g, '_');

  let canvas: HTMLCanvasElement | null = null;
  try {
    canvas = await renderProcessedPhoto(
      photo.originalUrl,
      photo.adjustments,
      watermark,
      frame,
      photo.crop,
      maxDim
    );
    const blob = await canvasToBlob(canvas, jpegQuality);
    const cleanName = photo.name.replace(/\.[^/.]+$/, '');
    const fileName = `${prefix}_${cleanName}.jpg`;

    // Guardado directo en la Galería de Android (sin menús intermedios)
    if (mode === 'download' && (await saveBlobToGallery(blob, fileName))) {
      return 'gallery';
    }

    await deliverExportedFile(blob, fileName, 'image/jpeg', mode);
    return mode === 'share' ? 'share' : Capacitor.isNativePlatform() ? 'file' : 'download';
  } finally {
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
    }
  }
}

/**
 * Procesa en lote todas las fotos y las entrega como archivos JPG individuales:
 * - Android (descargar): directo a la Galería, álbum "BereaSnap".
 * - Android (compartir) o si la Galería no está disponible: menú nativo con todas las fotos a la vez.
 * - Web: descarga de cada JPG (o hoja de compartir si el navegador lo soporta).
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
  let galleryAvailable = isNative && mode === 'download';
  const nativeShareUris: string[] = [];
  const webShareFiles: File[] = [];
  let processedCount = 0;

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
        await new Promise((resolve) => setTimeout(resolve, 280));
      }
      processedCount++;
    } catch (retryErr) {
      console.error(`Fallo definitivo en foto ${photo.name}:`, retryErr);
    } finally {
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
      }
    }
  }

  if (processedCount === 0) {
    throw new Error('No se pudo procesar ninguna fotografía del lote.');
  }

  if (isNative) {
    if (nativeShareUris.length > 0) {
      await Share.share({
        title: `${prefix} (${nativeShareUris.length} fotos)`,
        files: nativeShareUris,
        dialogTitle: 'Guardar o compartir fotografías',
      });
      return { total: photos.length, saved: processedCount, outcome: 'share' };
    }
    return { total: photos.length, saved: savedToGallery, outcome: 'gallery' };
  }

  if (mode === 'share' && webShareFiles.length > 0 && typeof navigator !== 'undefined' && navigator.canShare?.({ files: webShareFiles })) {
    try {
      await navigator.share({ title: prefix, files: webShareFiles });
      return { total: photos.length, saved: processedCount, outcome: 'share' };
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        return { total: photos.length, saved: processedCount, outcome: 'share' };
      }
    }
  }
  if (mode === 'share') {
    webShareFiles.forEach((f) => saveAs(f, f.name));
  }
  return { total: photos.length, saved: processedCount, outcome: 'download' };
}

/**
 * Procesa en lote todas las fotos y las comprime en un archivo .ZIP listo para guardar o compartir
 */
export async function exportBatchAsZip(
  photos: PhotoItem[],
  watermark: WatermarkSettings,
  frame: FrameSettings,
  onProgress: (current: number, total: number, currentName: string) => void,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  mode: 'download' | 'share' = 'download'
): Promise<void> {
  const zip = new JSZip();
  const prefix = (options.filenamePrefix || 'BereaSnap').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const maxDim = options.qualityPreset === 'social' ? 2048 : 0;
  const jpegQuality = options.qualityPreset === 'social' ? 0.85 : 0.96;

  const folder = zip.folder(`${prefix}_Editadas`);

  // Precargar elementos estáticos una sola vez para no recargarlos en cada iteración
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

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    onProgress(i + 1, photos.length, photo.name);

    // Ceder el hilo de la UI y permitir Garbage Collection en memoria móvil
    await new Promise((resolve) => setTimeout(resolve, 40));

    let canvas: HTMLCanvasElement | null = null;
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

      const blob = await canvasToBlob(canvas, jpegQuality);
      const cleanName = photo.name.replace(/\.[^/.]+$/, '');
      const paddedIndex = String(i + 1).padStart(2, '0');
      const fileName = `${prefix}_${paddedIndex}_${cleanName}.jpg`;

      folder?.file(fileName, blob);
      processedCount++;
    } catch (error) {
      console.error(`Error procesando foto ${photo.name} a resolución completa:`, error);
      // Reintento de emergencia a 1600px en caso de pico de memoria en dispositivo de baja gama
      try {
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
        const fallbackBlob = await canvasToBlob(canvas, 0.85);
        const cleanName = photo.name.replace(/\.[^/.]+$/, '');
        const paddedIndex = String(i + 1).padStart(2, '0');
        const fileName = `${prefix}_${paddedIndex}_${cleanName}.jpg`;

        folder?.file(fileName, fallbackBlob);
        processedCount++;
      } catch (retryErr) {
        console.error(`Fallo definitivo en foto ${photo.name}:`, retryErr);
      }
    } finally {
      // Liberar inmediatamente el buffer de memoria del Canvas en el motor gráfico
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
      }
    }
  }

  if (processedCount === 0) {
    throw new Error('No se pudo procesar ninguna fotografía del lote.');
  }

  const zipContent = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 4 }, // Nivel 4 para balance velocidad/memoria en móvil
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const zipFileName = `${prefix}_Lote_${dateStr}.zip`;

  await deliverExportedFile(zipContent, zipFileName, 'application/zip', mode);
}
