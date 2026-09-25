import type { PhotoItem, ImageAdjustments, CropSettings } from '../types/editor';

const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 5,
  contrast: 14,
  saturation: 12,
  warmth: 8,
  shadows: 18,
  highlights: -12,
  sharpness: 25,
};

const DEFAULT_CROP: CropSettings = {
  aspectRatio: 'original',
  orientation: 'landscape',
  offsetX: 0,
  offsetY: 0,
  zoom: 1.0,
};

/**
 * Genera lienzos fotográficos de alta fidelidad con iluminación volumétrica,
 * halos de escenario y bokeh estético para una demostración realista de estudio.
 */
function generateCinematicDemo(
  title: string,
  category: string,
  primaryHue: number,
  lightingStyle: 'stage' | 'cathedral' | 'ambient'
): string {
  const width = 3000;
  const height = 2000;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Fondo base con gradiente cinemático oscuro
  const baseGrad = ctx.createLinearGradient(0, 0, width, height);
  baseGrad.addColorStop(0, `hsl(${primaryHue}, 35%, 12%)`);
  baseGrad.addColorStop(0.5, `hsl(${primaryHue + 20}, 45%, 7%)`);
  baseGrad.addColorStop(1, '#050811');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Iluminación volumétrica de fondo (Haces de luz de escenario / vitrales)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  if (lightingStyle === 'stage') {
    // Haz central cenital
    const spotGrad = ctx.createRadialGradient(width * 0.5, 0, 100, width * 0.5, height * 0.7, width * 0.7);
    spotGrad.addColorStop(0, `hsla(${primaryHue + 30}, 85%, 65%, 0.45)`);
    spotGrad.addColorStop(0.4, `hsla(${primaryHue}, 70%, 45%, 0.25)`);
    spotGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 0, width, height);

    // Contraluces laterales estilo concierto
    const leftBeam = ctx.createRadialGradient(width * 0.15, height * 0.1, 50, width * 0.35, height * 0.8, width * 0.5);
    leftBeam.addColorStop(0, 'rgba(255, 200, 120, 0.35)');
    leftBeam.addColorStop(1, 'transparent');
    ctx.fillStyle = leftBeam;
    ctx.fillRect(0, 0, width, height);
  } else if (lightingStyle === 'cathedral') {
    // Iluminación arquitectónica de bóveda con vitral
    for (let col = 0; col < 5; col++) {
      const colX = width * 0.2 + col * (width * 0.15);
      const pillarGrad = ctx.createLinearGradient(colX - 40, 0, colX + 40, height);
      pillarGrad.addColorStop(0, `hsla(${primaryHue + col * 15}, 65%, 55%, 0.3)`);
      pillarGrad.addColorStop(0.8, 'transparent');
      ctx.fillStyle = pillarGrad;
      ctx.fillRect(colX - 35, 0, 70, height * 0.85);
    }
  } else {
    // Luz suave dorada envolvente
    const warmGrad = ctx.createRadialGradient(width * 0.7, height * 0.35, 100, width * 0.6, height * 0.5, width * 0.6);
    warmGrad.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
    warmGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.15)');
    warmGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = warmGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // Partículas de bokeh desenfocadas de alta gama
  for (let i = 0; i < 28; i++) {
    const bx = (Math.sin(i * 123) * 0.5 + 0.5) * width;
    const by = (Math.cos(i * 456) * 0.5 + 0.5) * height * 0.85;
    const br = 40 + (i % 7) * 28;
    const bokehGrad = ctx.createRadialGradient(bx, by, br * 0.2, bx, by, br);
    bokehGrad.addColorStop(0, `hsla(${primaryHue + (i % 40)}, 85%, 70%, 0.28)`);
    bokehGrad.addColorStop(0.8, `hsla(${primaryHue}, 70%, 50%, 0.08)`);
    bokehGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = bokehGrad;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Silueta arquitectónica / escenario en la base
  ctx.save();
  ctx.fillStyle = '#060a14';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.82);
  ctx.bezierCurveTo(width * 0.25, height * 0.78, width * 0.75, height * 0.86, width, height * 0.8);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  // Púlpito o atril sutil en silueta
  ctx.fillStyle = '#0a1020';
  ctx.beginPath();
  ctx.roundRect(width * 0.44, height * 0.68, width * 0.12, height * 0.2, [12, 12, 0, 0]);
  ctx.fill();
  ctx.restore();

  // Overlay fotográfico con viñeta suave
  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.5, width * 0.35, width * 0.5, height * 0.5, width * 0.7);
  vignette.addColorStop(0, 'transparent');
  vignette.addColorStop(1, 'rgba(2, 4, 10, 0.7)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // Placa tipográfica cinematográfica en esquina inferior
  ctx.save();
  ctx.textAlign = 'left';

  // Categoría pequeña
  ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
  ctx.font = '600 44px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText(category.toUpperCase(), 140, height - 210);

  // Título principal
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 82px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif';
  ctx.letterSpacing = '-1px';
  ctx.fillText(title, 140, height - 120);

  // Metadata de toma profesional (discreto a la derecha)
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '500 36px "JetBrains Mono", monospace';
  ctx.fillText('NIKON D750 · 50mm f/1.8 · ISO 800 · RAW 14-bit', width - 140, height - 130);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.92);
}

export function createSamplePhoto(
  id: string,
  title: string,
  category: string,
  primaryHue: number,
  lightingStyle: 'stage' | 'cathedral' | 'ambient'
): PhotoItem {
  const dataUrl = generateCinematicDemo(title, category, primaryHue, lightingStyle);

  return {
    id,
    file: new File([], `${title.replace(/\s+/g, '_')}.nef`),
    name: `${title.replace(/\s+/g, '_')}_DSC0492.NEF`,
    sizeFormatted: '28.4 MB',
    originalUrl: dataUrl,
    thumbnailUrl: dataUrl,
    width: 6000,
    height: 4000,
    isRaw: true,
    adjustments: { ...DEFAULT_ADJUSTMENTS },
    crop: { ...DEFAULT_CROP },
    preset: 'auto-church',
  };
}

export function getSamplePhotos(): PhotoItem[] {
  return [
    createSamplePhoto('sample-1', 'Servicio de Alabanza y Adoración', 'Escenario & Coro', 215, 'stage'),
    createSamplePhoto('sample-2', 'Consagración y Oración Principal', 'Momento Devocional', 38, 'ambient'),
    createSamplePhoto('sample-3', 'Asamblea y Encuentro Comunitario', 'Arquitectura & Vitrales', 270, 'cathedral'),
  ];
}
