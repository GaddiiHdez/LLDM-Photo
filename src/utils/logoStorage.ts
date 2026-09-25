export interface SavedLogo {
  id: string;
  name: string;
  imageDataUrl: string;
  createdAt: string;
  isDefault?: boolean;
}

const STORAGE_KEY_LOGOS = 'lldm_saved_logos_catalog';

/**
 * Obtiene la galería/catálogo de logos PNG guardados por el usuario
 */
export function getSavedLogos(): SavedLogo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGOS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error cargando catálogo de logos guardados:', err);
    return [];
  }
}

/**
 * Guarda un nuevo logo PNG en el catálogo persistente
 */
export function saveLogo(name: string, imageDataUrl: string, isDefault: boolean = false): SavedLogo[] {
  const current = getSavedLogos();
  const newLogo: SavedLogo = {
    id: `logo-${Date.now()}`,
    name,
    imageDataUrl,
    createdAt: new Date().toLocaleDateString('es-ES'),
    isDefault,
  };

  // Si se establece como default, desmarcar los anteriores
  let updated = current.map((l) => (isDefault ? { ...l, isDefault: false } : l));
  updated.unshift(newLogo);

  try {
    localStorage.setItem(STORAGE_KEY_LOGOS, JSON.stringify(updated));
  } catch (err) {
    console.warn('Advertencia al guardar logo en localStorage:', err);
  }

  return updated;
}

/**
 * Elimina un logo del catálogo
 */
export function deleteSavedLogo(id: string): SavedLogo[] {
  const current = getSavedLogos();
  const updated = current.filter((l) => l.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY_LOGOS, JSON.stringify(updated));
  } catch (err) {
    console.error('Error eliminando logo guardado:', err);
  }
  return updated;
}

/**
 * Establece un logo como predeterminado por defecto
 */
export function setDefaultLogo(id: string): SavedLogo[] {
  const current = getSavedLogos();
  const updated = current.map((l) => ({ ...l, isDefault: l.id === id }));
  try {
    localStorage.setItem(STORAGE_KEY_LOGOS, JSON.stringify(updated));
  } catch (err) {
    console.error('Error actualizando logo default:', err);
  }
  return updated;
}
