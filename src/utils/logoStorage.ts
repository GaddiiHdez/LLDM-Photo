import { idbGet, idbSet } from './idbStorage';

export interface SavedLogo {
  id: string;
  name: string;
  imageDataUrl: string;
  createdAt: string;
  isDefault?: boolean;
  isOfficial?: boolean;
}

const STORAGE_KEY_LOGOS = 'bereasnap_saved_logos_catalog';

export const BUILTIN_LOGOS: SavedLogo[] = [
  {
    id: 'bereasnap-logo-gold',
    name: 'BereaSnap Emblema Oficial',
    imageDataUrl: '/logo-bereasnap.svg',
    createdAt: 'Oficial',
    isDefault: false,
    isOfficial: true,
  },
  {
    id: 'bereasnap-logo-lineal',
    name: 'BereaSnap Firma Horizontal',
    imageDataUrl: '/logo-bereasnap-watermark.svg',
    createdAt: 'Oficial',
    isDefault: true,
    isOfficial: true,
  },
];

let memoryLogos: SavedLogo[] | null = null;

function ensureOfficialLogos(list: SavedLogo[]): SavedLogo[] {
  const userLogos = list.filter(
    (l) => !l.isOfficial && l.id !== 'bereasnap-logo-gold' && l.id !== 'bereasnap-logo-lineal'
  );
  return [...BUILTIN_LOGOS, ...userLogos];
}

function readInitialLogos(): SavedLogo[] {
  if (memoryLogos !== null) return memoryLogos;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGOS);
    if (raw) {
      const parsed: SavedLogo[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryLogos = ensureOfficialLogos(parsed);
        return memoryLogos;
      }
    }
  } catch (err) {
    console.warn('Error leyendo logos iniciales desde localStorage:', err);
  }
  memoryLogos = [...BUILTIN_LOGOS];
  return memoryLogos;
}

function persistLogos(logos: SavedLogo[]): void {
  const normalized = ensureOfficialLogos(logos);
  memoryLogos = normalized;
  idbSet(STORAGE_KEY_LOGOS, normalized).catch(() => {});
  try {
    const serialized = JSON.stringify(normalized);
    if (serialized.length < 4_200_000) {
      localStorage.setItem(STORAGE_KEY_LOGOS, serialized);
    }
  } catch {
    // Ignorar QuotaExceededError; IndexedDB guarda todos los logos en alta resolución
  }
}

(async function hydrateLogosFromIDB() {
  const idbLogos = await idbGet<SavedLogo[]>(STORAGE_KEY_LOGOS);
  if (Array.isArray(idbLogos) && idbLogos.length > 0) {
    memoryLogos = ensureOfficialLogos(idbLogos);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bereasnap-storage-updated'));
    }
  } else {
    const initial = readInitialLogos();
    await idbSet(STORAGE_KEY_LOGOS, initial);
  }
})();

/**
 * Obtiene la galería/catálogo de logos guardados por el usuario,
 * asegurando la presencia de los logos oficiales de BereaSnap.
 */
export function getSavedLogos(): SavedLogo[] {
  return readInitialLogos();
}

/**
 * Guarda un nuevo logo PNG en el catálogo persistente (IndexedDB ilimitado)
 */
export function saveLogo(name: string, imageDataUrl: string, isDefault: boolean = false): SavedLogo[] {
  const current = readInitialLogos();
  const newLogo: SavedLogo = {
    id: `logo-${Date.now()}`,
    name,
    imageDataUrl,
    createdAt: new Date().toLocaleDateString('es-ES'),
    isDefault,
    isOfficial: false,
  };

  const userOnly = current
    .filter((l) => !l.isOfficial)
    .map((l) => (isDefault ? { ...l, isDefault: false } : l));
  userOnly.unshift(newLogo);

  const updated = [...BUILTIN_LOGOS, ...userOnly];
  persistLogos(updated);
  return updated;
}

/**
 * Elimina un logo del catálogo (resguardando los logos oficiales del sistema)
 */
export function deleteSavedLogo(id: string): SavedLogo[] {
  const current = readInitialLogos();
  const target = current.find((l) => l.id === id);
  if (target?.isOfficial) {
    return current;
  }
  const updated = current.filter((l) => l.id !== id);
  persistLogos(updated);
  return updated;
}

/**
 * Establece un logo como predeterminado por defecto
 */
export function setDefaultLogo(id: string): SavedLogo[] {
  const current = readInitialLogos();
  const updated = current.map((l) => ({ ...l, isDefault: l.id === id }));
  persistLogos(updated);
  return updated;
}
