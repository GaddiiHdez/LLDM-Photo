import type { ImageAdjustments } from '../types/editor';

export interface CustomPreset {
  id: string;
  name: string;
  adjustments: ImageAdjustments;
  createdAt: string;
}

const STORAGE_KEY_CUSTOM_PRESETS = 'lldm_user_custom_presets';

/**
 * Obtiene todos los presets personalizados guardados en localStorage
 */
export function getCustomPresets(): CustomPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_PRESETS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error cargando presets personalizados:', err);
    return [];
  }
}

/**
 * Guarda un nuevo preset personalizado en localStorage
 */
export function saveCustomPreset(name: string, adjustments: ImageAdjustments): CustomPreset[] {
  const current = getCustomPresets();
  const trimmedName = name.trim() || `Preset ${current.length + 1}`;
  
  const newPreset: CustomPreset = {
    id: `custom-preset-${Date.now()}`,
    name: trimmedName,
    adjustments: { ...adjustments },
    createdAt: new Date().toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  };

  const updated = [newPreset, ...current];
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(updated));
  } catch (err) {
    console.warn('Advertencia al guardar preset en localStorage:', err);
  }
  return updated;
}

/**
 * Elimina un preset personalizado por su ID
 */
export function deleteCustomPreset(id: string): CustomPreset[] {
  const current = getCustomPresets();
  const updated = current.filter((p) => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(updated));
  } catch (err) {
    console.error('Error eliminando preset personalizado:', err);
  }
  return updated;
}
