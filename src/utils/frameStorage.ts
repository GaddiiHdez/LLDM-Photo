import type { FrameSettings, WatermarkSettings, CropSettings } from '../types/editor';
import { idbGet, idbSet } from './idbStorage';

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

// Caché en memoria sincronizada con IndexedDB + migración desde localStorage
let memoryUserFrames: SavedPngFrame[] | null = null;

function readInitialUserFrames(): SavedPngFrame[] {
  if (memoryUserFrames !== null) return memoryUserFrames;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FRAMES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryUserFrames = parsed.filter((f: SavedPngFrame) => !f.id.startsWith('official-frame-'));
        return memoryUserFrames;
      }
    }
  } catch (err) {
    console.warn('Error leyendo marcos iniciales desde localStorage:', err);
  }
  memoryUserFrames = [];
  return memoryUserFrames;
}

function persistUserFrames(userFrames: SavedPngFrame[]): void {
  memoryUserFrames = userFrames;
  // Guardar sin límite de tamaño en IndexedDB
  idbSet(STORAGE_KEY_FRAMES, userFrames).catch(() => {});
  // Intentar respaldar en localStorage solo si cabe (< 4.5MB)
  try {
    const serialized = JSON.stringify(userFrames);
    if (serialized.length < 4_200_000) {
      localStorage.setItem(STORAGE_KEY_FRAMES, serialized);
    }
  } catch {
    // Ignorar QuotaExceededError; IndexedDB tiene la copia maestra completa
  }
}

// Hidratar asíncronamente desde IndexedDB al arrancar la app
(async function hydrateFramesFromIDB() {
  const idbFrames = await idbGet<SavedPngFrame[]>(STORAGE_KEY_FRAMES);
  if (Array.isArray(idbFrames) && idbFrames.length > 0) {
    const clean = idbFrames.filter((f) => !f.id.startsWith('official-frame-'));
    memoryUserFrames = clean;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bereasnap-storage-updated'));
    }
  } else {
    const initial = readInitialUserFrames();
    if (initial.length > 0) {
      await idbSet(STORAGE_KEY_FRAMES, initial);
    }
  }
})();

/**
 * Obtiene la lista de marcos PNG oficiales y guardados por el usuario
 */
export function getSavedPngFrames(): SavedPngFrame[] {
  const userFrames = readInitialUserFrames();
  return [...BUILTIN_FRAMES, ...userFrames];
}

/**
 * Guarda un nuevo marco PNG en la biblioteca local persistente (IndexedDB ilimitado)
 */
export function savePngFrame(name: string, pngDataUrl: string, isDefault: boolean = false): SavedPngFrame[] {
  const current = readInitialUserFrames();
  const newFrame: SavedPngFrame = {
    id: `png-frame-${Date.now()}`,
    name,
    pngDataUrl,
    createdAt: new Date().toLocaleDateString('es-ES'),
    isDefault,
    isOfficial: false,
    isDynamic: false,
  };

  const userFrames = current.map((f) => (isDefault ? { ...f, isDefault: false } : f));
  userFrames.unshift(newFrame);

  persistUserFrames(userFrames);

  return [...BUILTIN_FRAMES, ...userFrames];
}

/**
 * Elimina un marco PNG de la biblioteca (resguardando los marcos oficiales)
 */
export function deleteSavedPngFrame(id: string): SavedPngFrame[] {
  if (id.startsWith('official-frame-')) {
    return getSavedPngFrames();
  }
  const current = readInitialUserFrames();
  const updatedUserFrames = current.filter((f) => f.id !== id && !f.id.startsWith('official-frame-'));
  persistUserFrames(updatedUserFrames);
  return [...BUILTIN_FRAMES, ...updatedUserFrames];
}

/**
 * Establece un marco PNG como predeterminado por defecto
 */
export function setDefaultPngFrame(id: string): SavedPngFrame[] {
  const current = readInitialUserFrames();
  const updatedUser = current.map((f) => ({ ...f, isDefault: f.id === id }));
  persistUserFrames(updatedUser);
  return [...BUILTIN_FRAMES.map((f) => ({ ...f, isDefault: f.id === id })), ...updatedUser];
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
  idbSet(STORAGE_KEY_DEFAULTS, settings).catch(() => {});
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
