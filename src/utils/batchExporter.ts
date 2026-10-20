import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { renderProcessedPhoto, canvasToBlob } from './canvasEngine';
import type { PhotoItem, WatermarkSettings, FrameSettings, ExportOptions } from '../types/editor';

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  qualityPreset: 'max',
  filenamePrefix: 'BereaSnap',
};

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
): Promise<void> {
  const maxDim = options.qualityPreset === 'social' ? 2048 : 0;
  const jpegQuality = options.qualityPreset === 'social' ? 0.85 : 0.95;
  const prefix = (options.filenamePrefix || 'BereaSnap').trim().replace(/[^a-zA-Z0-9_-]/g, '_');

  const canvas = await renderProcessedPhoto(
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

  await deliverExportedFile(blob, fileName, 'image/jpeg', mode);
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
  const jpegQuality = options.qualityPreset === 'social' ? 0.85 : 0.92;

  const folder = zip.folder(`${prefix}_Editadas`);

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    onProgress(i + 1, photos.length, photo.name);

    try {
      const canvas = await renderProcessedPhoto(
        photo.originalUrl,
        photo.adjustments,
        watermark,
        frame,
        photo.crop,
        maxDim
      );

      const blob = await canvasToBlob(canvas, jpegQuality);
      const cleanName = photo.name.replace(/\.[^/.]+$/, '');
      const paddedIndex = String(i + 1).padStart(2, '0');
      const fileName = `${prefix}_${paddedIndex}_${cleanName}.jpg`;

      folder?.file(fileName, blob);
    } catch (error) {
      console.error(`Error procesando foto ${photo.name}:`, error);
    }
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const dateStr = new Date().toISOString().split('T')[0];
  const zipFileName = `${prefix}_Lote_${dateStr}.zip`;

  await deliverExportedFile(zipContent, zipFileName, 'application/zip', mode);
}
