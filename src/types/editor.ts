export type AspectRatioType = 'original' | '1:1' | '4:5' | '3:4' | '9:16' | '16:9';
export type OrientationType = 'landscape' | 'portrait';

export interface CropSettings {
  aspectRatio: AspectRatioType;
  orientation: OrientationType;
  offsetX: number; // Shift X % (-50 to 50)
  offsetY: number; // Shift Y % (-50 to 50)
  zoom: number;    // Scale factor (1.0 to 2.0)
}

export type WatermarkPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'
  | 'center';

export type FrameStyle =
  | 'none'
  | 'custom-designer'
  | 'custom-png'
  | 'classic-white'
  | 'classic-dark'
  | 'church-event'
  | 'gold-accent'
  | 'polaroid-card';

export type PresetType =
  | 'auto-church'
  | 'warm-worship'
  | 'vibrant-praise'
  | 'elegant-bw'
  | 'custom';

export interface ImageAdjustments {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  saturation: number; // -100 to 100
  warmth: number;     // -100 to 100
  shadows: number;    // -100 to 100
  highlights: number; // -100 to 100
  sharpness: number;  // 0 to 100
}

export interface WatermarkSettings {
  enabled: boolean;
  type: 'text' | 'image';
  text: string;
  imageDataUrl: string | null;
  position: WatermarkPosition;
  opacity: number;
  size: number;
  color: string;
  // Efectos Avanzados de Marca de Agua / Logo
  logoTintEnabled: boolean;
  logoTintColor: string;
  dropShadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  blendMode: 'normal' | 'overlay' | 'screen' | 'multiply';
}

export interface FrameSettings {
  style: FrameStyle;
  // Para Marco PNG Subido
  pngDataUrl: string | null;
  pngFit: 'stretch' | 'contain' | 'cover';
  // Para Diseñador de Marcos Personalizado
  borderTop: number;
  borderBottom: number;
  borderLeft: number;
  borderRight: number;
  borderColor: string;
  borderColor2: string;
  useGradient: boolean;
  borderRadius: number;
  innerStrokeColor: string;
  innerStrokeWidth: number;
  // Campos del Banner del Marco Personalizado
  eventTitle: string;
  eventSubtitle: string;
  eventDate: string;
  textColor: string;
  fontFamily: string;
  textAlignment: 'left' | 'center' | 'right';
}

export interface PhotoItem {
  id: string;
  file: File;
  name: string;
  sizeFormatted: string;
  originalUrl: string;
  thumbnailUrl: string;
  processedBlobUrl?: string;
  width: number;
  height: number;
  isRaw: boolean;
  adjustments: ImageAdjustments;
  crop: CropSettings;
  preset: PresetType;
}
