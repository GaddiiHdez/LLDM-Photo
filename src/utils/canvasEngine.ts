import type { ImageAdjustments, WatermarkSettings, FrameSettings, CropSettings, AspectRatioType } from '../types/editor';

/**
 * Carga una URL o Blob en un HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Colorea un logo PNG transparente a un color sólido seleccionado (ej. Blanco, Dorado) usando Canvas 'source-in'
 */
function createTintedLogoCanvas(logoImg: HTMLImageElement, color: string): HTMLCanvasElement {
  const tintCanvas = document.createElement('canvas');
  tintCanvas.width = logoImg.width;
  tintCanvas.height = logoImg.height;
  const ctx = tintCanvas.getContext('2d');

  if (ctx) {
    ctx.drawImage(logoImg, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, tintCanvas.width, tintCanvas.height);
  }

  return tintCanvas;
}

/**
 * Calcula la relación de aspecto objetivo (W / H) según el ratio elegido y las dimensiones de la foto
 */
export function getTargetAspectRatio(ratio: AspectRatioType, rawWidth: number, rawHeight: number): number {
  if (ratio === 'original') {
    return rawWidth / rawHeight;
  }
  switch (ratio) {
    case '1:1':
      return 1.0;
    case '4:5':
      return 4 / 5;
    case '9:16':
      return 9 / 16;
    case '16:9':
      return 16 / 9;
    case '3:4':
      return 3 / 4;
    case '3:2':
      return 3 / 2;
    case '2:3':
      return 2 / 3;
    default:
      return rawWidth / rawHeight;
  }
}

/**
 * Renderiza la imagen procesada con Recorte Adaptativo estricto sin deformación, Tone-mapping, Marcos y Marca de Agua
 */
export async function renderProcessedPhoto(
  imgSource: HTMLImageElement | string,
  adjustments: ImageAdjustments,
  watermark: WatermarkSettings,
  frame: FrameSettings,
  crop: CropSettings,
  maxDimension: number = 0
): Promise<HTMLCanvasElement> {
  const img = typeof imgSource === 'string' ? await loadImage(imgSource) : imgSource;

  const rawWidth = img.naturalWidth || img.width || 6000;
  const rawHeight = img.naturalHeight || img.height || 4000;

  // --- 1. CÁLCULO DE DIMENSIONES RE-ENCUADRADAS (CROPPED GEOMETRY SIN DEFORMACIÓN) ---
  const targetRatio = getTargetAspectRatio(crop.aspectRatio, rawWidth, rawHeight);
  const rawRatio = rawWidth / rawHeight;

  let baseSrcW: number;
  let baseSrcH: number;

  if (rawRatio > targetRatio) {
    // La imagen es más ancha que el objetivo: se recorta el ancho sobrante
    baseSrcH = rawHeight;
    baseSrcW = rawHeight * targetRatio;
  } else {
    // La imagen es más alta que el objetivo: se recorta la altura sobrante
    baseSrcW = rawWidth;
    baseSrcH = rawWidth / targetRatio;
  }

  // Dimensiones finales del canvas de salida de la foto
  let width: number;
  let height: number;
  const maxTargetDim = maxDimension > 0 ? maxDimension : 4000;

  if (targetRatio >= 1) {
    width = Math.min(rawWidth, maxTargetDim);
    height = Math.round(width / targetRatio);
  } else {
    height = Math.min(rawHeight, maxTargetDim);
    width = Math.round(height * targetRatio);
  }

  // --- CÁLCULO DE MARGENES PARA MARCOS DIGITALES ---
  let extraTop = 0;
  let extraBottom = 0;
  let extraLeft = 0;
  let extraRight = 0;

  const borderWidth = Math.max(10, Math.round(width * 0.02));

  if (frame.style === 'custom-designer') {
    const scale = width / 1200;
    extraTop = Math.round((frame.borderTop || 20) * scale);
    extraBottom = Math.round((frame.borderBottom || 40) * scale);
    extraLeft = Math.round((frame.borderLeft || 20) * scale);
    extraRight = Math.round((frame.borderRight || 20) * scale);
  } else if (frame.style === 'classic-white' || frame.style === 'classic-dark' || frame.style === 'gold-accent') {
    extraTop = borderWidth;
    extraBottom = borderWidth;
    extraLeft = borderWidth;
    extraRight = borderWidth;
  } else if (frame.style === 'church-event') {
    extraTop = borderWidth;
    extraBottom = borderWidth + Math.round(height * 0.12);
    extraLeft = borderWidth;
    extraRight = borderWidth;
  } else if (frame.style === 'polaroid-card') {
    extraTop = borderWidth * 1.5;
    extraBottom = borderWidth * 4;
    extraLeft = borderWidth * 1.5;
    extraRight = borderWidth * 1.5;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width + extraLeft + extraRight;
  canvas.height = height + extraTop + extraBottom;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No se pudo crear contexto 2D');

  // --- 2. DIBUJAR MARCO DIGITAL DE FONDO ---
  if (frame.style === 'custom-designer') {
    ctx.save();
    if (frame.useGradient && frame.borderColor2) {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, frame.borderColor || '#0f172a');
      grad.addColorStop(1, frame.borderColor2 || '#1e3a8a');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = frame.borderColor || '#0f172a';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  } else if (frame.style !== 'none' && frame.style !== 'custom-png') {
    ctx.save();
    if (frame.style === 'classic-white' || frame.style === 'polaroid-card') {
      ctx.fillStyle = '#ffffff';
    } else if (frame.style === 'classic-dark') {
      ctx.fillStyle = '#0f172a';
    } else if (frame.style === 'gold-accent') {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#d97706');
      grad.addColorStop(0.5, '#fef08a');
      grad.addColorStop(1, '#b45309');
      ctx.fillStyle = grad;
    } else if (frame.style === 'church-event') {
      ctx.fillStyle = '#1e293b';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // --- 3. DIBUJAR IMAGEN BASE CON RE-ENCUADRE / CROP Y FILTROS ---
  ctx.save();
  const b = 100 + adjustments.brightness;
  const c = 100 + adjustments.contrast;
  const s = 100 + adjustments.saturation;

  ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

  // Calcular la ventana de origen (Source Rect) considerando zoom y offsets sobre baseSrcW / baseSrcH
  const zoomScale = Math.max(1.0, Math.min(3.0, crop.zoom || 1.0));
  const srcW = baseSrcW / zoomScale;
  const srcH = baseSrcH / zoomScale;

  const maxOffX = Math.max(0, (rawWidth - srcW) / 2);
  const maxOffY = Math.max(0, (rawHeight - srcH) / 2);

  const shiftX = ((crop.offsetX || 0) / 50) * maxOffX;
  const shiftY = ((crop.offsetY || 0) / 50) * maxOffY;

  const srcX = Math.max(0, Math.min(rawWidth - srcW, (rawWidth - srcW) / 2 + shiftX));
  const srcY = Math.max(0, Math.min(rawHeight - srcH, (rawHeight - srcH) / 2 + shiftY));

  ctx.drawImage(
    img,
    srcX, srcY, srcW, srcH,
    extraLeft, extraTop, width, height
  );
  ctx.restore();

  // --- 4. FILETE INTERIOR DEL MARCO ---
  if (frame.style === 'custom-designer' && frame.innerStrokeWidth > 0) {
    ctx.save();
    ctx.strokeStyle = frame.innerStrokeColor || '#f59e0b';
    ctx.lineWidth = frame.innerStrokeWidth;
    ctx.strokeRect(extraLeft, extraTop, width, height);
    ctx.restore();
  }

  // --- 5. TONE-MAPPING DINÁMICO (Sombras, Altas Luces y Calidez) ---
  if (adjustments.shadows !== 0 || adjustments.highlights !== 0 || adjustments.warmth !== 0) {
    try {
      const imgData = ctx.getImageData(extraLeft, extraTop, width, height);
      const data = imgData.data;

      const shadowFactor = adjustments.shadows / 100;
      const highlightFactor = adjustments.highlights / 100;
      const warmthFactor = adjustments.warmth / 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let bPixel = data[i + 2];

        const lum = 0.299 * r + 0.587 * g + 0.114 * bPixel;

        if (shadowFactor !== 0 && lum < 128) {
          const boost = Math.pow((128 - lum) / 128, 1.5) * shadowFactor * 75;
          r = Math.min(255, r + boost);
          g = Math.min(255, g + boost);
          bPixel = Math.min(255, bPixel + boost);
        }

        if (highlightFactor < 0 && lum > 160) {
          const compress = Math.pow((lum - 160) / 95, 1.2) * Math.abs(highlightFactor) * 50;
          r = Math.max(0, r - compress);
          g = Math.max(0, g - compress);
          bPixel = Math.max(0, bPixel - compress);
        }

        if (warmthFactor !== 0) {
          r = Math.min(255, Math.max(0, r + warmthFactor * 25));
          bPixel = Math.min(255, Math.max(0, bPixel - warmthFactor * 25));
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = bPixel;
      }

      ctx.putImageData(imgData, extraLeft, extraTop);
    } catch (e) {
      console.warn('[Canvas Engine] Ignorando filtro pixel por política de origen:', e);
    }
  }

  // --- 6. OVERLAY PNG TRANSPARENTE SUBIDO (SIN DEFORMACIÓN) ---
  if (frame.style === 'custom-png' && frame.pngDataUrl) {
    try {
      const pngFrame = await loadImage(frame.pngDataUrl);
      ctx.save();
      const frameRatio = pngFrame.width / pngFrame.height;
      const canvasRatio = canvas.width / canvas.height;

      // Si las relaciones de aspecto son muy similares (menos de 15% de diferencia), ajustar a todo el canvas
      if (Math.abs(frameRatio - canvasRatio) < 0.15) {
        ctx.drawImage(pngFrame, 0, 0, canvas.width, canvas.height);
      } else {
        // Si no coinciden (ej. marco horizontal en lienzo vertical), dibujar en modo 'contain' para NO deformar textos/logos
        let fw = canvas.width;
        let fh = canvas.height;
        let fx = 0;
        let fy = 0;

        if (frameRatio > canvasRatio) {
          fh = canvas.width / frameRatio;
          fy = (canvas.height - fh) / 2;
        } else {
          fw = canvas.height * frameRatio;
          fx = (canvas.width - fw) / 2;
        }
        ctx.drawImage(pngFrame, fx, fy, fw, fh);
      }
      ctx.restore();
    } catch (err) {
      console.error('Error dibujando marco PNG transparente:', err);
    }
  }

  // --- 7. TEXTO DE BANNER DE EVENTO ---
  if (frame.style === 'custom-designer' && (frame.eventTitle || frame.eventSubtitle || frame.eventDate)) {
    ctx.save();
    const bannerY = extraTop + height;
    const bannerHeight = canvas.height - bannerY;
    const padding = Math.round(canvas.width * 0.03);

    let textX = canvas.width / 2;
    if (frame.textAlignment === 'left') textX = padding;
    if (frame.textAlignment === 'right') textX = canvas.width - padding;

    ctx.textAlign = frame.textAlignment || 'center';
    ctx.fillStyle = frame.textColor || '#ffffff';
    const font = frame.fontFamily || 'sans-serif';

    if (frame.eventTitle) {
      const titleSize = Math.round(Math.max(16, bannerHeight * 0.3));
      ctx.font = `bold ${titleSize}px ${font}`;
      ctx.fillText(frame.eventTitle, textX, bannerY + bannerHeight * 0.35);
    }

    if (frame.eventSubtitle || frame.eventDate) {
      const sub = [frame.eventSubtitle, frame.eventDate].filter(Boolean).join(' • ');
      const subSize = Math.round(Math.max(12, bannerHeight * 0.2));
      ctx.font = `${subSize}px ${font}`;
      ctx.fillStyle = frame.textColor ? `${frame.textColor}CC` : '#94a3b8';
      ctx.fillText(sub, textX, bannerY + bannerHeight * 0.72);
    }

    ctx.restore();
  } else if (frame.style === 'church-event') {
    ctx.save();
    const bannerY = extraTop + height;
    const bannerHeight = canvas.height - bannerY;

    const bannerGrad = ctx.createLinearGradient(0, bannerY, canvas.width, canvas.height);
    bannerGrad.addColorStop(0, '#0f172a');
    bannerGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = bannerGrad;
    ctx.fillRect(0, bannerY, canvas.width, bannerHeight);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, bannerY, canvas.width, 3);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(bannerHeight * 0.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(frame.eventTitle || 'Iglesia Local • Servicio Especial', canvas.width / 2, bannerY + bannerHeight * 0.4);

    if (frame.eventDate) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.round(bannerHeight * 0.22)}px sans-serif`;
      ctx.fillText(frame.eventDate, canvas.width / 2, bannerY + bannerHeight * 0.72);
    }
    ctx.restore();
  }

  // --- 8. MARCA DE AGUA (WATERMARK) ---
  if (watermark.enabled) {
    ctx.save();
    ctx.globalAlpha = watermark.opacity;
    if (watermark.blendMode && watermark.blendMode !== 'normal') {
      ctx.globalCompositeOperation = watermark.blendMode;
    }

    const scaleFactor = watermark.size / 100;

    if (watermark.type === 'text' && watermark.text.trim()) {
      const fontSize = Math.round(height * 0.045 * scaleFactor * 2.5);
      ctx.font = `bold ${fontSize}px sans-serif`;

      const textMetrics = ctx.measureText(watermark.text);
      const textWidth = textMetrics.width;
      const padding = fontSize * 0.6;

      let x = extraLeft + padding;
      let y = extraTop + padding + fontSize;

      if (watermark.position === 'bottom-right') {
        x = extraLeft + width - textWidth - padding;
        y = extraTop + height - padding;
      } else if (watermark.position === 'bottom-left') {
        x = extraLeft + padding;
        y = extraTop + height - padding;
      } else if (watermark.position === 'top-right') {
        x = extraLeft + width - textWidth - padding;
        y = extraTop + padding + fontSize;
      } else if (watermark.position === 'center') {
        x = extraLeft + (width - textWidth) / 2;
        y = extraTop + height / 2;
      }

      if (watermark.dropShadow) {
        ctx.shadowColor = watermark.shadowColor || 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = watermark.shadowBlur || 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
      }

      if (watermark.strokeEnabled) {
        ctx.strokeStyle = watermark.strokeColor || '#000000';
        ctx.lineWidth = watermark.strokeWidth || 3;
        ctx.strokeText(watermark.text, x, y);
      }

      ctx.fillStyle = watermark.color || '#ffffff';
      ctx.fillText(watermark.text, x, y);
    } else if (watermark.type === 'image' && watermark.imageDataUrl) {
      try {
        const rawLogo = await loadImage(watermark.imageDataUrl);
        const logoElement = watermark.logoTintEnabled
          ? createTintedLogoCanvas(rawLogo, watermark.logoTintColor || '#ffffff')
          : rawLogo;

        const logoAspect = logoElement.width / logoElement.height;
        const logoWidth = Math.round(width * 0.25 * scaleFactor);
        const logoHeight = Math.round(logoWidth / logoAspect);

        const margin = Math.round(width * 0.03);
        let x = extraLeft + margin;
        let y = extraTop + margin;

        if (watermark.position === 'bottom-right') {
          x = extraLeft + width - logoWidth - margin;
          y = extraTop + height - logoHeight - margin;
        } else if (watermark.position === 'bottom-left') {
          x = extraLeft + margin;
          y = extraTop + height - logoHeight - margin;
        } else if (watermark.position === 'top-right') {
          x = extraLeft + width - logoWidth - margin;
          y = extraTop + margin;
        } else if (watermark.position === 'center') {
          x = extraLeft + (width - logoWidth) / 2;
          y = extraTop + (height - logoHeight) / 2;
        }

        if (watermark.dropShadow) {
          ctx.shadowColor = watermark.shadowColor || 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = watermark.shadowBlur || 10;
          ctx.shadowOffsetX = 4;
          ctx.shadowOffsetY = 4;
        }

        ctx.drawImage(logoElement, x, y, logoWidth, logoHeight);
      } catch (err) {
        console.error('Error dibujando logo de marca de agua:', err);
      }
    }

    ctx.restore();
  }

  return canvas;
}

/**
 * Convierte un Canvas a Blob JPEG en alta calidad
 */
export function canvasToBlob(canvas: HTMLCanvasElement, quality: number = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falló la generación de Blob desde Canvas'));
      },
      'image/jpeg',
      quality
    );
  });
}
