export interface SavedLogo {
  id: string;
  name: string;
  imageDataUrl: string;
  createdAt: string;
  isDefault?: boolean;
  isOfficial?: boolean;
}

const STORAGE_KEY_LOGOS = 'lldm_saved_logos_catalog';

export const BUILTIN_LOGOS: SavedLogo[] = [
  {
    id: 'official-logo-gold',
    name: 'LLDM Monograma Oro Sólido (Oficial)',
    imageDataUrl: '/logo-lldm-studio.jpg',
    createdAt: 'Oficial',
    isDefault: false,
    isOfficial: true,
  },
  {
    id: 'official-logo-lineal',
    name: 'LLDM Firma Lineal Translúcida',
    imageDataUrl: '/logo-lldm-studio-lineal.jpg',
    createdAt: 'Oficial',
    isDefault: true,
    isOfficial: true,
  },
];

/**
 * Obtiene la galería/catálogo de logos guardados por el usuario,
 * asegurando la presencia de los logos oficiales de LLDM Photo Studio.
 */
export function getSavedLogos(): SavedLogo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGOS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_LOGOS, JSON.stringify(BUILTIN_LOGOS));
      return BUILTIN_LOGOS;
    }
    const parsed: SavedLogo[] = JSON.parse(raw);

    // Garantizar que los logos oficiales estén siempre presentes en el catálogo
    const hasGold = parsed.some((l) => l.imageDataUrl.includes('logo-lldm-studio.jpg'));
    const hasLineal = parsed.some((l) => l.imageDataUrl.includes('logo-lldm-studio-lineal.jpg'));

    let updated = [...parsed];
    if (!hasGold) {
      updated.push(BUILTIN_LOGOS[0]);
    }
    if (!hasLineal) {
      updated.push(BUILTIN_LOGOS[1]);
    }

    if (!hasGold || !hasLineal) {
      localStorage.setItem(STORAGE_KEY_LOGOS, JSON.stringify(updated));
    }

    return updated;
  } catch (err) {
    console.error('Error cargando catálogo de logos guardados:', err);
    return BUILTIN_LOGOS;
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
 * Elimina un logo del catálogo (resguardando los logos oficiales del sistema)
 */
export function deleteSavedLogo(id: string): SavedLogo[] {
  const current = getSavedLogos();
  const target = current.find((l) => l.id === id);
  if (target?.isOfficial) {
    return current;
  }
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
