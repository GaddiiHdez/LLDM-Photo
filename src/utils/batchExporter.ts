import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { renderProcessedPhoto, canvasToBlob } from './canvasEngine';
import type { PhotoItem, WatermarkSettings, FrameSettings } from '../types/editor';

/**
 * Exporta una sola foto procesada en alta calidad
 */
export async function exportSinglePhoto(
  photo: PhotoItem,
  watermark: WatermarkSettings,
  frame: FrameSettings
): Promise<void> {
  const canvas = await renderProcessedPhoto(
    photo.originalUrl,
    photo.adjustments,
    watermark,
    frame,
    photo.crop,
    0
  );
  const blob = await canvasToBlob(canvas, 0.95);
  const cleanName = photo.name.replace(/\.[^/.]+$/, '');
  saveAs(blob, `Iglesia_${cleanName}_editada.jpg`);
}

/**
 * Procesa en lote todas las fotos y las comprime en un archivo .ZIP listo para compartir
 */
export async function exportBatchAsZip(
  photos: PhotoItem[],
  watermark: WatermarkSettings,
  frame: FrameSettings,
  onProgress: (current: number, total: number, currentName: string) => void
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('Fotos_Iglesia_Editadas');

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
        0 // Resolución original nativa (ej. 6000x4000)
      );

      const blob = await canvasToBlob(canvas, 0.92);
      const cleanName = photo.name.replace(/\.[^/.]+$/, '');
      const paddedIndex = String(i + 1).padStart(2, '0');
      const fileName = `Foto_Iglesia_${paddedIndex}_${cleanName}.jpg`;

      folder?.file(fileName, blob);
    } catch (error) {
      console.error(`Error procesando foto ${photo.name}:`, error);
    }
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const dateStr = new Date().toISOString().split('T')[0];
  saveAs(zipContent, `Lote_Fotos_Iglesia_${dateStr}.zip`);
}
