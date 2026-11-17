import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { ImageAdjustments } from '../types/editor';

export interface CustomPreset {
  id: string;
  name: string;
  adjustments: ImageAdjustments;
  createdAt: string;
}

export interface PresetExportResult {
  success: boolean;
  message: string;
  cancelled?: boolean;
}

const STORAGE_KEY_CUSTOM_PRESETS = 'lldm_user_custom_presets';

function clampAdjustment(val: unknown, min: number, max: number, fallback: number = 0): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function sanitizeAdjustments(raw: Partial<ImageAdjustments>): ImageAdjustments {
  return {
    brightness: clampAdjustment(raw.brightness, -100, 100),
    contrast: clampAdjustment(raw.contrast, -100, 100),
    saturation: clampAdjustment(raw.saturation, -100, 100),
    warmth: clampAdjustment(raw.warmth, -100, 100),
    tint: clampAdjustment(raw.tint, -100, 100),
    shadows: clampAdjustment(raw.shadows, -100, 100),
    highlights: clampAdjustment(raw.highlights, -100, 100),
    sharpness: clampAdjustment(raw.sharpness, 0, 100),
    clarity: clampAdjustment(raw.clarity, -100, 100),
    noiseReduction: clampAdjustment(raw.noiseReduction, 0, 100),
    skinToneGuard: raw.skinToneGuard !== false,
  };
}

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
 * Exporta todos los presets personalizados a un archivo .json descargable (Web y Android nativo)
 */
export async function exportPresetsToFile(presets?: CustomPreset[]): Promise<PresetExportResult> {
  const data = presets || getCustomPresets();
  if (!data || data.length === 0) {
    return { success: false, message: 'No hay filtros personalizados para exportar.' };
  }

  const payload = {
    app: 'BereaSnap',
    type: 'custom_presets',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    presets: data,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileName = `BereaSnap_Presets_${dateStr}.json`;

  if (Capacitor.isNativePlatform()) {
    let savedUri = '';
    let destination = `Documentos/BereaSnap/${fileName}`;
    try {
      const res = await Filesystem.writeFile({
        path: `BereaSnap/${fileName}`,
        data: jsonStr,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      savedUri = res.uri;
    } catch {
      const resCache = await Filesystem.writeFile({
        path: `BereaSnap_export/${fileName}`,
        data: jsonStr,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      savedUri = resCache.uri;
      destination = fileName;
    }

    try {
      await Share.share({
        title: fileName,
        url: savedUri,
        dialogTitle: `Exportar filtros (${fileName})`,
      });
    } catch (shareErr: any) {
      const msg = String(shareErr?.message || shareErr || '').toLowerCase();
      if (msg.includes('cancel') || msg.includes('abort')) {
        return {
          success: true,
          cancelled: true,
          message: `Filtros guardados en ${destination}`,
        };
      }
    }

    return {
      success: true,
      message: `✓ ${data.length} filtro(s) guardados en ${destination}`,
    };
  }

  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return {
    success: true,
    message: `✓ ${data.length} filtro(s) exportados (${fileName})`,
  };
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
      : parsed && typeof parsed === 'object' && Array.isArray(parsed.presets)
      ? parsed.presets
      : [];

    if (presetsToImport.length === 0) {
      return { success: false, addedCount: 0, message: 'El archivo no contiene filtros válidos' };
    }

    const current = getCustomPresets();
    const existingNames = new Set(current.map((p) => p.name.trim().toLowerCase()));
    const validNewPresets: CustomPreset[] = [];

    for (const item of presetsToImport) {
      if (!item || typeof item !== 'object' || !item.name || !item.adjustments || typeof item.adjustments !== 'object') {
        continue;
      }

      let baseName = String(item.name).trim().slice(0, 48);
      if (!baseName) continue;
      let finalName = baseName;
      let counter = 1;
      while (existingNames.has(finalName.toLowerCase())) {
        finalName = `${baseName} (${counter++})`;
      }
      existingNames.add(finalName.toLowerCase());

      validNewPresets.push({
        id: `custom-preset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: finalName,
        adjustments: sanitizeAdjustments(item.adjustments),
        createdAt:
          typeof item.createdAt === 'string' && item.createdAt.trim()
            ? item.createdAt
            : new Date().toLocaleDateString('es-ES', {
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
