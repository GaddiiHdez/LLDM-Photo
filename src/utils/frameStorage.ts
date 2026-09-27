import type { FrameSettings, WatermarkSettings, CropSettings } from '../types/editor';

export interface SavedPngFrame {
  id: string;
  name: string;
  pngDataUrl: string;
  createdAt: string;
  isDefault?: boolean;
  isOfficial?: boolean;
  isDynamic?: boolean;
  defaultEventTitle?: string;
}

export interface DefaultAppSettings {
  frame: FrameSettings;
  watermark: WatermarkSettings;
  crop: CropSettings;
}

const STORAGE_KEY_FRAMES = 'bereasnap_saved_png_frames';
const STORAGE_KEY_DEFAULTS = 'bereasnap_default_app_settings';

export const BUILTIN_FRAMES: SavedPngFrame[] = [
  {
    id: 'official-frame-centenario-dinamico',
    name: 'Centenario (Personalizable)',
    pngDataUrl: '/frames/marco-centenario-V2-notexto.png',
    createdAt: 'Oficial',
    isDefault: true,
    isOfficial: true,
    isDynamic: true,
    defaultEventTitle: 'Escuela Dominical',
  },
  {
    id: 'official-frame-centenario-oracion7pm',
    name: 'Centenario (Oración 7pm)',
    pngDataUrl: '/frames/marco-centenario-V2_oracion7pm.png',
    createdAt: 'Oficial',
    isDefault: false,
    isOfficial: true,
    isDynamic: false,
  },
  {
    id: 'official-frame-escuela-dominical',
    name: 'Centenario (Esc. Dominical)',
    pngDataUrl: '/frames/marco-escuela-dominical.png',
    createdAt: 'Oficial',
    isDefault: false,
    isOfficial: true,
    isDynamic: false,
  },
];

/**
 * Obtiene la lista de marcos PNG oficiales y guardados por el usuario
 */
export function getSavedPngFrames(): SavedPngFrame[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FRAMES);
    let userFrames: SavedPngFrame[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          userFrames = parsed.filter((f: SavedPngFrame) => !f.id.startsWith('official-frame-'));
        }
      } catch (err) {
        console.warn('Error parseando marcos guardados:', err);
      }
    }
    return [...BUILTIN_FRAMES, ...userFrames];
  } catch (err) {
    console.error('Error cargando marcos PNG guardados:', err);
    return BUILTIN_FRAMES;
  }
}

/**
 * Guarda un nuevo marco PNG en la biblioteca local persistente
 */
export function savePngFrame(name: string, pngDataUrl: string, isDefault: boolean = false): SavedPngFrame[] {
  const current = getSavedPngFrames();
  const newFrame: SavedPngFrame = {
    id: `png-frame-${Date.now()}`,
    name,
    pngDataUrl,
    createdAt: new Date().toLocaleDateString('es-ES'),
    isDefault,
    isOfficial: false,
    isDynamic: false,
  };

  // Si se establece como default, desmarcar los anteriores
  let userFrames = current
    .filter((f) => !f.id.startsWith('official-frame-'))
    .map((f) => (isDefault ? { ...f, isDefault: false } : f));
  userFrames.unshift(newFrame);

  try {
    localStorage.setItem(STORAGE_KEY_FRAMES, JSON.stringify(userFrames));
  } catch (err) {
    console.warn('Advertencia al guardar en localStorage (archivo grande):', err);
  }

  return [...BUILTIN_FRAMES, ...userFrames];
}

/**
 * Elimina un marco PNG de la biblioteca (resguardando los marcos oficiales)
 */
export function deleteSavedPngFrame(id: string): SavedPngFrame[] {
  if (id.startsWith('official-frame-')) {
    return getSavedPngFrames();
  }
  const current = getSavedPngFrames();
  const updatedUserFrames = current.filter((f) => f.id !== id && !f.id.startsWith('official-frame-'));
  try {
    localStorage.setItem(STORAGE_KEY_FRAMES, JSON.stringify(updatedUserFrames));
  } catch (err) {
    console.error('Error eliminando marco PNG:', err);
  }
  return [...BUILTIN_FRAMES, ...updatedUserFrames];
}

/**
 * Establece un marco PNG como predeterminado por defecto
 */
export function setDefaultPngFrame(id: string): SavedPngFrame[] {
  const current = getSavedPngFrames();
  const updated = current.map((f) => ({ ...f, isDefault: f.id === id }));
  try {
    localStorage.setItem(STORAGE_KEY_FRAMES, JSON.stringify(updated));
  } catch (err) {
    console.error('Error actualizando marco default:', err);
  }
  return updated;
}

/**
 * Guarda la configuración predeterminada global (Marco, Marca de Agua, Formato)
 */
export function saveDefaultAppSettings(settings: DefaultAppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_DEFAULTS, JSON.stringify(settings));
  } catch (err) {
    console.error('Error guardando ajustes por defecto:', err);
  }
}

/**
 * Recupera la configuración predeterminada guardada por el usuario
 */
export function getDefaultAppSettings(): DefaultAppSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DEFAULTS);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Error leyendo ajustes por defecto:', err);
    return null;
  }
}
