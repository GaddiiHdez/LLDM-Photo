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
    window.dispatchEvent(new Event('bereasnap-storage-updated'));
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
    window.dispatchEvent(new Event('bereasnap-storage-updated'));
  } catch (err) {
    console.error('Error eliminando preset personalizado:', err);
  }
  return updated;
}

/**
 * Exporta todos los presets personalizados a un archivo .json descargable
 */
export function exportPresetsToFile(presets?: CustomPreset[]): boolean {
  const data = presets || getCustomPresets();
  if (!data || data.length === 0) {
    return false;
  }

  const payload = {
    app: 'BereaSnap',
    type: 'custom_presets',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    presets: data,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  link.download = `BereaSnap_Presets_${dateStr}.json`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Importa presets desde un string JSON o estructura de archivo.
 * Valida formato y combina evitando duplicar presets idénticos.
 */
export function importPresetsFromJson(jsonContent: string): { success: boolean; addedCount: number; message: string } {
  try {
    const parsed = JSON.parse(jsonContent);
    const presetsToImport: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.presets)
      ? parsed.presets
      : [];

    if (presetsToImport.length === 0) {
      return { success: false, addedCount: 0, message: 'El archivo no contiene presets válidos' };
    }

    const current = getCustomPresets();
    const existingNames = new Set(current.map((p) => p.name.trim().toLowerCase()));
    const validNewPresets: CustomPreset[] = [];

    for (const item of presetsToImport) {
      if (!item || typeof item !== 'object' || !item.name || !item.adjustments) continue;

      let baseName = String(item.name).trim();
      let finalName = baseName;
      let counter = 1;
      while (existingNames.has(finalName.toLowerCase())) {
        finalName = `${baseName} (${counter++})`;
      }
      existingNames.add(finalName.toLowerCase());

      validNewPresets.push({
        id: `custom-preset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: finalName,
        adjustments: { ...item.adjustments },
        createdAt:
          item.createdAt ||
          new Date().toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
      });
    }

    if (validNewPresets.length === 0) {
      return { success: false, addedCount: 0, message: 'Ningún preset válido encontrado en el archivo' };
    }

    const merged = [...validNewPresets, ...current];
    localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(merged));
    window.dispatchEvent(new Event('bereasnap-storage-updated'));

    return {
      success: true,
      addedCount: validNewPresets.length,
      message: `Se importaron ${validNewPresets.length} preset(s) correctamente`,
    };
  } catch (err: any) {
    return { success: false, addedCount: 0, message: `Error al leer el archivo JSON: ${err?.message || 'inválido'}` };
  }
}
