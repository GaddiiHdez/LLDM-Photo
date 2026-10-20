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
 * Calcula la relación de aspecto objetivo (W / H) según el ratio elegido, dimensiones y rotación de 90°
 */
export function getTargetAspectRatio(
  ratio: AspectRatioType,
  rawWidth: number,
  rawHeight: number,
  rotation: number = 0
): number {
  const isRotated90 = Math.abs(rotation % 180) === 90;
  const effW = isRotated90 ? rawHeight : rawWidth;
  const effH = isRotated90 ? rawWidth : rawHeight;

  if (ratio === 'original') {
    return effW / effH;
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
      return effW / effH;
  }
}

/**
 * Renderiza un preview RÁPIDO durante el drag (acelerado por GPU).
 */
export function renderFastPreview(
  img: HTMLImageElement,
  adjustments: ImageAdjustments,
  crop: CropSettings,
  maxDimension: number = 480
): HTMLCanvasElement {
  const rawWidth = img.naturalWidth || img.width || 1920;
  const rawHeight = img.naturalHeight || img.height || 1080;
  const targetRatio = getTargetAspectRatio(crop.aspectRatio, rawWidth, rawHeight, crop.rotation || 0);

  let previewW: number;
  let previewH: number;
  if (targetRatio >= 1) {
    previewW = maxDimension;
    previewH = Math.round(maxDimension / targetRatio);
  } else {
    previewH = maxDimension;
    previewW = Math.round(maxDimension * targetRatio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = previewW;
  canvas.height = previewH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const rawRatio = rawWidth / rawHeight;
  let baseSrcW: number;
  let baseSrcH: number;
  if (rawRatio > targetRatio) {
    baseSrcH = rawHeight;
    baseSrcW = rawHeight * targetRatio;
  } else {
    baseSrcW = rawWidth;
    baseSrcH = rawWidth / targetRatio;
  }

  const zoomScale = Math.max(1.0, Math.min(3.0, crop.zoom || 1.0));
  const srcW = baseSrcW / zoomScale;
  const srcH = baseSrcH / zoomScale;

  const maxOffX = Math.max(0, (rawWidth - srcW) / 2);
  const maxOffY = Math.max(0, (rawHeight - srcH) / 2);
  const shiftX = ((crop.offsetX || 0) / 50) * maxOffX;
  const shiftY = ((crop.offsetY || 0) / 50) * maxOffY;

  const srcX = Math.max(0, Math.min(rawWidth - srcW, (rawWidth - srcW) / 2 + shiftX));
  const srcY = Math.max(0, Math.min(rawHeight - srcH, (rawHeight - srcH) / 2 + shiftY));

  const b = 100 + (adjustments.brightness || 0);
  const c = 100 + (adjustments.contrast || 0);
  const s = 100 + (adjustments.saturation || 0);
  ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, previewW, previewH);

  return canvas;
}

/**
 * Dibuja la composición completa directamente sobre un canvas existente.
 * Soporta modo 'skipCpuFilters' para arrastre en tiempo real a 60fps.
 */
export async function drawProcessedPhotoToCanvas(
  targetCanvas: HTMLCanvasElement,
  imgSource: HTMLImageElement | string,
  adjustments: ImageAdjustments,
  watermark: WatermarkSettings,
  frame: FrameSettings,
  crop: CropSettings,
  maxDimension: number = 0,
  skipCpuFilters: boolean = false,
  cachedPngFrame?: HTMLImageElement | null,
  cachedLogo?: HTMLImageElement | null
): Promise<void> {
  const img = typeof imgSource === 'string' ? await loadImage(imgSource) : imgSource;

  const rawWidth = img.naturalWidth || img.width || 6000;
  const rawHeight = img.naturalHeight || img.height || 4000;
  const rotationDeg = crop.rotation || 0;
  const straightenDeg = crop.straighten || 0;
  const isRotated90 = Math.abs(rotationDeg % 180) === 90;

  // --- 1. CÁLCULO DE DIMENSIONES RE-ENCUADRADAS (CROPPED GEOMETRY SIN DEFORMACIÓN) ---
  const targetRatio = getTargetAspectRatio(crop.aspectRatio, rawWidth, rawHeight, rotationDeg);
  // Si la foto está rotada 90° o 270°, el rectángulo de origen en la imagen no-rotada usa el ratio inverso
  const srcTargetRatio = isRotated90 ? 1 / targetRatio : targetRatio;
  const rawRatio = rawWidth / rawHeight;

  let baseSrcW: number;
  let baseSrcH: number;

  if (rawRatio > srcTargetRatio) {
    baseSrcH = rawHeight;
    baseSrcW = rawHeight * srcTargetRatio;
  } else {
    baseSrcW = rawWidth;
    baseSrcH = rawWidth / srcTargetRatio;
  }

  // Dimensiones finales del área de la foto en el canvas
  let width: number;
  let height: number;
  const maxTargetDim = maxDimension > 0 ? maxDimension : 4000;
  const effectiveMaxW = isRotated90 ? rawHeight : rawWidth;
  const effectiveMaxH = isRotated90 ? rawWidth : rawHeight;

  if (targetRatio >= 1) {
    width = Math.min(effectiveMaxW, maxTargetDim);
    height = Math.round(width / targetRatio);
  } else {
    height = Math.min(effectiveMaxH, maxTargetDim);
    width = Math.round(height * targetRatio);
  }

  // --- CÁLCULO DE MÁRGENES PARA MARCOS DIGITALES (ESCALABLES CON EL SLIDER DE GROSOR) ---
  let extraTop = 0;
  let extraBottom = 0;
  let extraLeft = 0;
  let extraRight = 0;

  const borderScale = (frame.borderTop || 24) / 24;
  const baseBorderWidth = Math.max(6, Math.round(width * 0.022 * borderScale));

  if (frame.style === 'custom-designer') {
    const scale = width / 1200;
    extraTop = Math.round((frame.borderTop || 20) * scale);
    extraBottom = Math.round((frame.borderBottom || 40) * scale);
    extraLeft = Math.round((frame.borderLeft || 20) * scale);
    extraRight = Math.round((frame.borderRight || 20) * scale);
  } else if (frame.style === 'fine-gallery') {
    const margin = Math.max(6, Math.round(width * 0.035 * borderScale));
    extraTop = margin;
    extraBottom = margin;
    extraLeft = margin;
    extraRight = margin;
  } else if (frame.style === 'editorial') {
    const margin = Math.max(6, Math.round(width * 0.025 * borderScale));
    extraTop = margin;
    extraBottom = margin + Math.round(height * 0.09);
    extraLeft = margin;
    extraRight = margin;
  } else if (frame.style === 'classic-white' || frame.style === 'classic-dark' || frame.style === 'gold-accent') {
    extraTop = baseBorderWidth;
    extraBottom = baseBorderWidth;
    extraLeft = baseBorderWidth;
    extraRight = baseBorderWidth;
  } else if (frame.style === 'church-event') {
    extraTop = baseBorderWidth;
    extraBottom = baseBorderWidth + Math.round(height * 0.10);
    extraLeft = baseBorderWidth;
    extraRight = baseBorderWidth;
  } else if (frame.style === 'polaroid-card') {
    const sideMargin = Math.max(8, Math.round(baseBorderWidth * 1.4));
    extraTop = sideMargin;
    extraBottom = Math.max(24, Math.round(baseBorderWidth * 3.8));
    extraLeft = sideMargin;
    extraRight = sideMargin;
  }

  const targetW = width + extraLeft + extraRight;
  const targetH = height + extraTop + extraBottom;

  if (targetCanvas.width !== targetW || targetCanvas.height !== targetH) {
    targetCanvas.width = targetW;
    targetCanvas.height = targetH;
  }

  const ctx = targetCanvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo obtener el contexto 2D');

  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  // --- 2. DIBUJAR MARCO DIGITAL DE FONDO ---
  if (frame.style === 'custom-designer') {
    ctx.save();
    if (frame.useGradient && frame.borderColor2) {
      const grad = ctx.createLinearGradient(0, 0, targetCanvas.width, targetCanvas.height);
      grad.addColorStop(0, frame.borderColor || '#0f172a');
      grad.addColorStop(1, frame.borderColor2 || '#1e3a8a');
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = frame.borderColor || '#0f172a';
    }
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.restore();
  } else if (frame.style !== 'none' && frame.style !== 'custom-png') {
    ctx.save();
    if (frame.style === 'fine-gallery') {
      ctx.fillStyle = frame.borderColor || '#ffffff';
    } else if (frame.style === 'editorial') {
      ctx.fillStyle = frame.borderColor || '#0f172a';
    } else if (frame.style === 'classic-white' || frame.style === 'polaroid-card') {
      ctx.fillStyle = '#ffffff';
    } else if (frame.style === 'classic-dark') {
      ctx.fillStyle = '#0f172a';
    } else if (frame.style === 'gold-accent') {
      ctx.fillStyle = '#0a0f1d';
    } else if (frame.style === 'church-event') {
      ctx.fillStyle = '#0f172a';
    }
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.restore();
  }

  // --- 3. DIBUJAR FOTO BASE CON CROP, ROTACIÓN, NIVELACIÓN Y FILTROS GPU ---
  ctx.save();
  const b = 100 + adjustments.brightness;
  const c = 100 + adjustments.contrast;
  const s = 100 + adjustments.saturation;

  ctx.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%)`;

  // Compensar escala automáticamente si hay ángulo de nivelación (straighten) para no dejar esquinas vacías
  const straightenRad = (Math.abs(straightenDeg) * Math.PI) / 180;
  const straightenAutoZoom = straightenDeg !== 0 ? 1 + Math.sin(straightenRad) * 1.35 : 1.0;

  const zoomScale = Math.max(1.0, Math.min(3.5, (crop.zoom || 1.0) * straightenAutoZoom));
  const srcW = baseSrcW / zoomScale;
  const srcH = baseSrcH / zoomScale;

  const maxOffX = Math.max(0, (rawWidth - srcW) / 2);
  const maxOffY = Math.max(0, (rawHeight - srcH) / 2);

  const shiftX = ((crop.offsetX || 0) / 50) * maxOffX;
  const shiftY = ((crop.offsetY || 0) / 50) * maxOffY;

  const srcX = Math.max(0, Math.min(rawWidth - srcW, (rawWidth - srcW) / 2 + shiftX));
  const srcY = Math.max(0, Math.min(rawHeight - srcH, (rawHeight - srcH) / 2 + shiftY));

  const hasTransform = rotationDeg !== 0 || straightenDeg !== 0 || crop.flipH || crop.flipV;

  if (!hasTransform) {
    ctx.drawImage(
      img,
      srcX, srcY, srcW, srcH,
      extraLeft, extraTop, width, height
    );
  } else {
    // Recortar al área exacta de la foto dentro del marco
    ctx.beginPath();
    ctx.rect(extraLeft, extraTop, width, height);
    ctx.clip();

    const centerX = extraLeft + width / 2;
    const centerY = extraTop + height / 2;
    ctx.translate(centerX, centerY);

    const totalAngleRad = ((rotationDeg + straightenDeg) * Math.PI) / 180;
    if (totalAngleRad !== 0) {
      ctx.rotate(totalAngleRad);
    }
    if (crop.flipH || crop.flipV) {
      ctx.scale(crop.flipH ? -1 : 1, crop.flipV ? -1 : 1);
    }

    const drawW = isRotated90 ? height : width;
    const drawH = isRotated90 ? width : height;

    ctx.drawImage(
      img,
      srcX, srcY, srcW, srcH,
      -drawW / 2, -drawH / 2, drawW, drawH
    );
  }
  ctx.restore();

  // --- 4. FILETE INTERIOR DEL MARCO (FINE ART GALLERY & GOLD ACCENT) ---
  if (frame.style === 'fine-gallery') {
    ctx.save();
    ctx.strokeStyle = frame.innerStrokeColor || '#d4af37';
    ctx.lineWidth = Math.max(1, Math.round(width * 0.0015));
    const inset = Math.min(Math.round(extraLeft * 0.35), Math.round(width * 0.008));
    ctx.strokeRect(extraLeft - inset, extraTop - inset, width + inset * 2, height + inset * 2);
    ctx.restore();
  } else if (frame.style === 'gold-accent') {
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, targetCanvas.width, targetCanvas.height);
    grad.addColorStop(0, '#f59e0b');
    grad.addColorStop(0.5, '#fef08a');
    grad.addColorStop(1, '#b45309');
    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(2, Math.round(width * 0.0035));
    ctx.strokeRect(extraLeft, extraTop, width, height);
    ctx.restore();
  } else if (frame.style === 'custom-designer' && frame.innerStrokeWidth > 0) {
    ctx.save();
    ctx.strokeStyle = frame.innerStrokeColor || '#f59e0b';
    ctx.lineWidth = frame.innerStrokeWidth;
    ctx.strokeRect(extraLeft, extraTop, width, height);
    ctx.restore();
  }

  // --- 5. TONE-MAPPING DINÁMICO Y NITIDEZ CPU (Se omite durante el arrastre rápido para 60fps) ---
  const hasToneAdjustments =
    adjustments.shadows !== 0 ||
    adjustments.highlights !== 0 ||
    adjustments.warmth !== 0 ||
    adjustments.sharpness > 0;

  if (!skipCpuFilters && hasToneAdjustments) {
    try {
      const imgData = ctx.getImageData(extraLeft, extraTop, width, height);
      const data = imgData.data;

      const shadowFactor = adjustments.shadows / 100;
      const highlightFactor = adjustments.highlights / 100;
      const warmthFactor = adjustments.warmth / 100;

      if (shadowFactor !== 0 || highlightFactor !== 0 || warmthFactor !== 0) {
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let bPixel = data[i + 2];

          const lum = 0.299 * r + 0.587 * g + 0.114 * bPixel;

          // Sombras (levantar o profundizar tonos oscuros)
          if (shadowFactor !== 0 && lum < 140) {
            const weight = Math.pow((140 - lum) / 140, 1.4);
            const delta = weight * shadowFactor * 75;
            r = Math.min(255, Math.max(0, r + delta));
            g = Math.min(255, Math.max(0, g + delta));
            bPixel = Math.min(255, Math.max(0, bPixel + delta));
          }

          // Altas Luces (recuperar blancos quemados si < 0, o dar brillo especular si > 0)
          if (highlightFactor !== 0 && lum > 135) {
            const weight = Math.pow((lum - 135) / 120, 1.25);
            const delta = weight * highlightFactor * 55;
            r = Math.min(255, Math.max(0, r + delta));
            g = Math.min(255, Math.max(0, g + delta));
            bPixel = Math.min(255, Math.max(0, bPixel + delta));
          }

          // Calidez (Temperatura de color Ámbar / Azul)
          if (warmthFactor !== 0) {
            r = Math.min(255, Math.max(0, r + warmthFactor * 26));
            g = Math.min(255, Math.max(0, g + warmthFactor * 4));
            bPixel = Math.min(255, Math.max(0, bPixel - warmthFactor * 26));
          }

          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = bPixel;
        }
      }

      // Nitidez (Micro-contraste de luminancia mediante kernel Laplaciano 3x3 rápido)
      if (adjustments.sharpness > 0) {
        const amount = (adjustments.sharpness / 100) * 0.45;
        const copy = new Uint8ClampedArray(data);
        const rowStride = width * 4;

        for (let y = 1; y < height - 1; y++) {
          let idx = (y * width + 1) * 4;
          for (let x = 1; x < width - 1; x++, idx += 4) {
            for (let c = 0; c < 3; c++) {
              const center = copy[idx + c];
              const neighbors =
                copy[idx - 4 + c] +
                copy[idx + 4 + c] +
                copy[idx - rowStride + c] +
                copy[idx + rowStride + c];
              const edge = center * 4 - neighbors;
              data[idx + c] = Math.min(255, Math.max(0, center + edge * amount));
            }
          }
        }
      }

      ctx.putImageData(imgData, extraLeft, extraTop);
    } catch (e) {
      console.warn('[Canvas Engine] Ignorando filtro pixel por política de origen:', e);
    }
  }

  // --- 6. OVERLAY PNG TRANSPARENTE (Marco PNG institucional) ---
  if (frame.style === 'custom-png' && (cachedPngFrame || frame.pngDataUrl)) {
    try {
      const pngFrame = cachedPngFrame || (frame.pngDataUrl ? await loadImage(frame.pngDataUrl) : null);
      if (pngFrame) {
        ctx.save();
        const frameRatio = pngFrame.width / pngFrame.height;
        const canvasRatio = targetCanvas.width / targetCanvas.height;

        let frameDrawX = 0;
        let frameDrawY = 0;
        let frameDrawW = targetCanvas.width;
        let frameDrawH = targetCanvas.height;

        if (Math.abs(frameRatio - canvasRatio) < 0.15) {
          ctx.drawImage(pngFrame, 0, 0, targetCanvas.width, targetCanvas.height);
        } else {
          if (frameRatio > canvasRatio) {
            frameDrawH = targetCanvas.width / frameRatio;
            frameDrawY = (targetCanvas.height - frameDrawH) / 2;
          } else {
            frameDrawW = targetCanvas.height * frameRatio;
            frameDrawX = (targetCanvas.width - frameDrawW) / 2;
          }
          ctx.drawImage(pngFrame, frameDrawX, frameDrawY, frameDrawW, frameDrawH);
        }
        ctx.restore();

        // --- 6.1 RENDERIZADO DE TEXTO DINÁMICO EN MARCO PNG ---
        const isDynamicTemplate = Boolean(
          frame.pngDataUrl?.includes('notexto') ||
          frame.dynamicTextEnabled ||
          (!frame.pngDataUrl?.includes('oracion7pm') && !frame.pngDataUrl?.includes('escuela-dominical') && frame.eventTitle)
        );

        if (isDynamicTemplate && (frame.dynamicTextEnabled ?? true)) {
          const textScale = (frame.dynamicTextScale || 100) / 100;
          const applyDynamicTextStyle = (fontSize: number, textY: number) => {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
            ctx.shadowBlur = Math.max(2, Math.round(fontSize * 0.15));
            ctx.shadowOffsetX = Math.max(1, Math.round(fontSize * 0.06));
            ctx.shadowOffsetY = Math.max(1, Math.round(fontSize * 0.06));

            if (frame.dynamicTextColorStyle === 'white') {
              ctx.fillStyle = '#ffffff';
            } else if (frame.dynamicTextColorStyle === 'silver') {
              ctx.fillStyle = '#cbd5e1';
            } else {
              const goldGrad = ctx.createLinearGradient(0, textY - fontSize * 0.5, 0, textY + fontSize * 0.5);
              goldGrad.addColorStop(0, '#fef08a');
              goldGrad.addColorStop(0.25, '#dab768');
              goldGrad.addColorStop(0.65, '#cea544');
              goldGrad.addColorStop(1, '#9b711d');
              ctx.fillStyle = goldGrad;
            }
          };

          const isCentenarioBar =
            frame.dynamicTextPosition !== 'bottom-center' &&
            (frame.dynamicTextPosition === 'centenario-left' ||
              frame.pngDataUrl?.includes('centenario') ||
              !frame.dynamicTextPosition);

          // Texto Principal (Izquierdo o Centrado)
          if (frame.eventTitle && frame.eventTitle.trim().length > 0) {
            ctx.save();
            const title = frame.eventTitle.trim().toUpperCase();

            if (isCentenarioBar) {
              const textX = frameDrawX + frameDrawW * 0.121;
              const textY = frameDrawY + frameDrawH * 0.9845;
              const maxW = frameDrawW * 0.32;
              const fontSize = Math.max(11, Math.round(frameDrawH * 0.0185 * textScale));

              ctx.font = `700 ${fontSize}px 'Cinzel', 'Cinzel Decorative', 'Times New Roman', 'Georgia', serif`;
              ctx.textBaseline = 'middle';
              ctx.textAlign = 'left';
              applyDynamicTextStyle(fontSize, textY);
              ctx.fillText(title, textX, textY, maxW);
            } else {
              const textX = frameDrawX + frameDrawW * 0.5;
              const textY = frameDrawY + frameDrawH * 0.975;
              const fontSize = Math.max(13, Math.round(frameDrawH * 0.022 * textScale));

              ctx.font = `700 ${fontSize}px 'Cinzel', 'Outfit', sans-serif`;
              ctx.textBaseline = 'middle';
              ctx.textAlign = 'center';
              applyDynamicTextStyle(fontSize, textY);
              ctx.fillText(title, textX, textY, frameDrawW * 0.85);
            }
            ctx.restore();
          }

          // Texto Secundario Opcional en el Lado Derecho (Ej. Fecha o Localidad personalizada)
          if (frame.dynamicTextRight && frame.dynamicTextRight.trim().length > 0) {
            ctx.save();
            const rightText = frame.dynamicTextRight.trim().toUpperCase();
            const textX = frameDrawX + frameDrawW * 0.879;
            const textY = frameDrawY + frameDrawH * 0.9845;
            const maxW = frameDrawW * 0.30;
            const fontSize = Math.max(11, Math.round(frameDrawH * 0.0175 * textScale));

            ctx.font = `700 ${fontSize}px 'Cinzel', 'Cinzel Decorative', 'Times New Roman', 'Georgia', serif`;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'right';
            applyDynamicTextStyle(fontSize, textY);
            ctx.fillText(rightText, textX, textY, maxW);
            ctx.restore();
          }
        }
      }
    } catch (err) {
      console.error('Error dibujando marco PNG transparente:', err);
    }
  }

  // --- 7. TEXTO EDITORIAL O BANNER REFINADO ---
  if ((frame.style === 'editorial' || frame.style === 'custom-designer') && (frame.eventTitle || frame.eventSubtitle || frame.eventDate)) {
    ctx.save();
    const bannerY = extraTop + height;
    const bannerHeight = targetCanvas.height - bannerY;
    const padding = Math.round(targetCanvas.width * 0.04);

    let textX = targetCanvas.width / 2;
    if (frame.textAlignment === 'left') textX = padding;
    if (frame.textAlignment === 'right') textX = targetCanvas.width - padding;

    ctx.textAlign = frame.textAlignment || 'center';
    const isLightBg = frame.borderColor === '#ffffff';
    ctx.fillStyle = frame.textColor || (isLightBg ? '#0f172a' : '#ffffff');
    const font = frame.fontFamily || (frame.style === 'editorial' ? "'Cinzel', Georgia, serif" : 'sans-serif');

    if (frame.eventTitle) {
      const titleSize = Math.round(Math.max(14, bannerHeight * 0.3));
      ctx.font = `600 ${titleSize}px ${font}`;
      ctx.fillText(frame.eventTitle, textX, bannerY + bannerHeight * 0.42);
    }

    if (frame.eventSubtitle || frame.eventDate) {
      const sub = [frame.eventSubtitle, frame.eventDate].filter(Boolean).join('  —  ');
      const subSize = Math.round(Math.max(11, bannerHeight * 0.18));
      ctx.font = `400 ${subSize}px ${font}`;
      ctx.fillStyle = frame.textColor ? `${frame.textColor}AA` : (isLightBg ? '#64748b' : '#94a3b8');
      ctx.fillText(sub, textX, bannerY + bannerHeight * 0.74);
    }

    ctx.restore();
  } else if (frame.style === 'church-event') {
    ctx.save();
    const bannerY = extraTop + height;
    const bannerHeight = targetCanvas.height - bannerY;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, bannerY, targetCanvas.width, bannerHeight);

    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0, bannerY, targetCanvas.width, 1);

    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${Math.round(bannerHeight * 0.32)}px 'Cinzel', Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(frame.eventTitle || 'Iglesia Local • Servicio Especial', targetCanvas.width / 2, bannerY + bannerHeight * 0.42);

    if (frame.eventDate) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `400 ${Math.round(bannerHeight * 0.2)}px sans-serif`;
      ctx.fillText(frame.eventDate, targetCanvas.width / 2, bannerY + bannerHeight * 0.74);
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
      ctx.font = `bold ${fontSize}px 'Outfit', sans-serif`;

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
    } else if (watermark.type === 'image' && (cachedLogo || watermark.imageDataUrl)) {
      try {
        const rawLogo = cachedLogo || (watermark.imageDataUrl ? await loadImage(watermark.imageDataUrl) : null);
        if (rawLogo) {
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
        }
      } catch (err) {
        console.error('Error dibujando logo de marca de agua:', err);
      }
    }

    ctx.restore();
  }
}

/**
 * Renderiza la imagen procesada completa creando un nuevo canvas (usado para exportaciones y compatibilidad)
 */
export async function renderProcessedPhoto(
  imgSource: HTMLImageElement | string,
  adjustments: ImageAdjustments,
  watermark: WatermarkSettings,
  frame: FrameSettings,
  crop: CropSettings,
  maxDimension: number = 0
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  await drawProcessedPhotoToCanvas(
    canvas,
    imgSource,
    adjustments,
    watermark,
    frame,
    crop,
    maxDimension,
    false
  );
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
