import type { FrameSettings } from '../types/editor';

export interface DynamicTextDrawCommand {
  text: string;
  x: number;
  y: number;
  maxW: number;
  align: 'left' | 'center' | 'right';
  fontSize: number;
  fontFamily: string;
}

export function hasCenterBottomEmblem(pngDataUrl?: string | null): boolean {
  if (!pngDataUrl) return false;
  const lower = pngDataUrl.toLowerCase();
  return (
    lower.includes('centenario') ||
    lower.includes('notexto') ||
    lower.includes('oracion7pm') ||
    lower.includes('escuela-dominical')
  );
}

export function isAspectRatioMismatched(
  photoRatio: number,
  frameRatio: number,
  threshold: number = 0.16
): boolean {
  if (!Number.isFinite(photoRatio) || !Number.isFinite(frameRatio) || photoRatio <= 0 || frameRatio <= 0) {
    return false;
  }
  return Math.abs(photoRatio - frameRatio) > threshold;
}

export function resolveDynamicFrameTextLayout(params: {
  frame: FrameSettings;
  frameDrawX: number;
  frameDrawY: number;
  frameDrawW: number;
  frameDrawH: number;
}): DynamicTextDrawCommand[] {
  const { frame, frameDrawX, frameDrawY, frameDrawW, frameDrawH } = params;
  if (!frame.dynamicTextEnabled) return [];

  const textScale = (frame.dynamicTextScale || 100) / 100;
  const hasEmblem = hasCenterBottomEmblem(frame.pngDataUrl);

  let pos =
    frame.dynamicTextPosition ||
    (hasEmblem ? 'centenario-left' : 'bottom-center');

  // Evitar colisión contra emblema central inferior si el usuario o borrador heredó 'bottom-center'
  if (hasEmblem && pos === 'bottom-center') {
    pos = 'centenario-left';
  }

  const leftText = (frame.eventTitle || '').trim().toUpperCase();
  const rawRight =
    frame.dynamicTextRight !== undefined ? frame.dynamicTextRight : (frame.eventDate || '');
  const rightText = rawRight.trim().toUpperCase();

  const commands: DynamicTextDrawCommand[] = [];

  if (pos === 'centenario-left') {
    const wingY = frameDrawY + frameDrawH * 0.984;
    if (leftText.length > 0) {
      const fontSize = Math.max(11, Math.round(frameDrawH * 0.018 * textScale));
      commands.push({
        text: leftText,
        x: frameDrawX + frameDrawW * 0.085,
        y: wingY,
        maxW: frameDrawW * 0.295,
        align: 'left',
        fontSize,
        fontFamily: `'Cinzel', 'Cinzel Decorative', 'Times New Roman', 'Georgia', serif`,
      });
    }
    if (rightText.length > 0) {
      const fontSize = Math.max(11, Math.round(frameDrawH * 0.017 * textScale));
      commands.push({
        text: rightText,
        x: frameDrawX + frameDrawW * 0.915,
        y: wingY,
        maxW: frameDrawW * 0.295,
        align: 'right',
        fontSize,
        fontFamily: `'Cinzel', 'Cinzel Decorative', 'Times New Roman', 'Georgia', serif`,
      });
    }
    return commands;
  }

  const combined = [leftText, rightText].filter(Boolean).join('  •  ');
  if (!combined) return [];

  const textY = frameDrawY + frameDrawH * (hasEmblem ? 0.984 : 0.975);
  const fontSize = Math.max(11, Math.round(frameDrawH * (hasEmblem ? 0.018 : 0.02) * textScale));
  const safeMaxW = hasEmblem ? frameDrawW * 0.33 : frameDrawW * 0.84;

  let textX = frameDrawX + frameDrawW * 0.5;
  let align: 'left' | 'center' | 'right' = 'center';
  if (pos === 'bottom-left') {
    textX = frameDrawX + frameDrawW * (hasEmblem ? 0.075 : 0.055);
    align = 'left';
  } else if (pos === 'bottom-right') {
    textX = frameDrawX + frameDrawW * (hasEmblem ? 0.925 : 0.945);
    align = 'right';
  }

  commands.push({
    text: combined,
    x: textX,
    y: textY,
    maxW: safeMaxW,
    align,
    fontSize,
    fontFamily: `'Cinzel', 'Outfit', sans-serif`,
  });
  return commands;
}
