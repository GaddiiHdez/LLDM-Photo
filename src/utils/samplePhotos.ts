import type { PhotoItem, ImageAdjustments, CropSettings } from '../types/editor';

const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 5,
  contrast: 12,
  saturation: 15,
  warmth: 10,
  shadows: 15,
  highlights: -10,
  sharpness: 20,
};

const DEFAULT_CROP: CropSettings = {
  aspectRatio: 'original',
  orientation: 'landscape',
  offsetX: 0,
  offsetY: 0,
  zoom: 1.0,
};

/**
 * Genera una foto de muestra elegante usando Canvas HTML para demostración inmediata (Simulando 6000x4000)
 */
export function createSamplePhoto(id: string, title: string, subtitle: string, color: string): PhotoItem {
  const canvas = document.createElement('canvas');
  canvas.width = 6000;
  canvas.height = 4000;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 6000, 4000);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 6000, 4000);

    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + i * 0.02})`;
      ctx.beginPath();
      ctx.arc(800 + i * 650, 1000 + (i % 3) * 500, 400 + i * 100, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 220px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 3000, 1900);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '120px sans-serif';
    ctx.fillText(subtitle, 3000, 2200);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '80px sans-serif';
    ctx.fillText('Nikon 6000 × 4000 px (3:2 Nativo)', 3000, 2400);
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

  return {
    id,
    file: new File([], `${title.replace(/\s+/g, '_')}.jpg`),
    name: `${title}.jpg`,
    sizeFormatted: '18.4 MB',
    originalUrl: dataUrl,
    thumbnailUrl: dataUrl,
    width: 6000,
    height: 4000,
    isRaw: false,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    crop: { ...DEFAULT_CROP },
    preset: 'auto-church',
  };
}

export function getSamplePhotos(): PhotoItem[] {
  return [
    createSamplePhoto('sample-1', 'Servicio de Alabanzas', 'Fotografía de Escenario', '#1e3a8a'),
    createSamplePhoto('sample-2', 'Consagración Juvenil', 'Fotografía de Evento', '#831843'),
    createSamplePhoto('sample-3', 'Escuela Dominical', 'Captura de Grupo', '#065f46'),
  ];
}
