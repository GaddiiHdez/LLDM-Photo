import type { FrameSettings, WatermarkSettings, CropSettings } from '../types/editor';

export interface SavedPngFrame {
  id: string;
  name: string;
  pngDataUrl: string;
  createdAt: string;
  isDefault?: boolean;
}

export interface DefaultAppSettings {
  frame: FrameSettings;
  watermark: WatermarkSettings;
  crop: CropSettings;
}

const STORAGE_KEY_FRAMES = 'lldm_saved_png_frames';
const STORAGE_KEY_DEFAULTS = 'lldm_default_app_settings';

/**
 * Obtiene la lista de marcos PNG guardados por el usuario
 */
export function getSavedPngFrames(): SavedPngFrame[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FRAMES);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error cargando marcos PNG guardados:', err);
    return [];
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
  };

  // Si se establece como default, desmarcar los anteriores
  let updated = current.map((f) => (isDefault ? { ...f, isDefault: false } : f));
  updated.unshift(newFrame);

  try {
    localStorage.setItem(STORAGE_KEY_FRAMES, JSON.stringify(updated));
  } catch (err) {
    console.warn('Advertencia al guardar en localStorage (archivo grande):', err);
  }

  return updated;
}

/**
 * Elimina un marco PNG de la biblioteca
 */
export function deleteSavedPngFrame(id: string): SavedPngFrame[] {
  const current = getSavedPngFrames();
  const updated = current.filter((f) => f.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY_FRAMES, JSON.stringify(updated));
  } catch (err) {
    console.error('Error eliminando marco PNG:', err);
  }
  return updated;
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
