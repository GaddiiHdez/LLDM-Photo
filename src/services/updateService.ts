import { registerPlugin, Capacitor } from '@capacitor/core';
import { APP_VERSION, GITHUB_RELEASES_API } from '../version';

export interface DownloadProgress {
  percent: number;
  bytesDownloaded: number;
  totalBytes: number;
}

export interface AppUpdaterPlugin {
  downloadAndInstall(options: { url: string; fileName?: string }): Promise<{ success: boolean; path?: string }>;
  installExisting(options?: { fileName?: string }): Promise<{ success: boolean }>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (progress: DownloadProgress) => void
  ): Promise<any>;
  removeAllListeners(): Promise<void>;
}

export const AppUpdater = registerPlugin<AppUpdaterPlugin>('AppUpdater');

export interface UpdateInfo {
  isAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  apkUrl?: string;
  apkName?: string;
  apkSize?: number;
  publishedAt?: string;
  error?: string;
}

/**
 * Compara dos versiones semánticas (ej. "1.4.0" vs "1.5.0")
 */
export function isNewerVersion(remoteTag: string, currentVersion: string): boolean {
  try {
    const parse = (v: string) => {
      const clean = v.replace(/^v/i, '').split(/[-+]/)[0];
      const parts = clean.split('.').map((n) => parseInt(n, 10) || 0);
      return {
        major: parts[0] ?? 0,
        minor: parts[1] ?? 0,
        patch: parts[2] ?? 0,
      };
    };

    const r = parse(remoteTag);
    const c = parse(currentVersion);

    if (r.major > c.major) return true;
    if (r.major < c.major) return false;

    if (r.minor > c.minor) return true;
    if (r.minor < c.minor) return false;

    if (r.patch > c.patch) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Consulta la API de GitHub Releases para comprobar si hay actualizaciones disponibles
 */
export async function checkForUpdate(currentVersion: string = APP_VERSION): Promise<UpdateInfo> {
  const baseResult: UpdateInfo = {
    isAvailable: false,
    currentVersion,
    latestVersion: currentVersion,
    releaseName: '',
    releaseNotes: '',
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(GITHUB_RELEASES_API, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return { ...baseResult, error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const remoteTag = data.tag_name || '';
    const releaseName = data.name || remoteTag;
    const releaseNotes = data.body || '';
    const publishedAt = data.published_at || '';

    const apkAsset = Array.isArray(data.assets)
      ? data.assets.find((a: any) => a.name && a.name.endsWith('.apk'))
      : null;

    const apkUrl = apkAsset?.browser_download_url || '';
    const apkName = apkAsset?.name || 'BereaSnap.apk';
    const apkSize = apkAsset?.size || 0;

    const available = isNewerVersion(remoteTag, currentVersion);

    return {
      isAvailable: available,
      currentVersion,
      latestVersion: remoteTag.replace(/^v/i, ''),
      releaseName,
      releaseNotes,
      apkUrl,
      apkName,
      apkSize,
      publishedAt,
    };
  } catch (err: any) {
    return {
      ...baseResult,
      error: err.name === 'AbortError' ? 'timeout' : 'network_error',
    };
  }
}

/**
 * Descarga e inicia la instalación de la actualización directamente dentro de la app (In-App OTA)
 */
export async function startInAppUpdate(
  apkUrl: string,
  onProgress: (progress: DownloadProgress) => void
): Promise<{ success: boolean; error?: string }> {
  if (!apkUrl) {
    return { success: false, error: 'URL de descarga no disponible' };
  }

  // 1. En Android Nativo: usa el plugin AppUpdater con FileProvider
  if (Capacitor.isNativePlatform()) {
    try {
      let listenerHandle: any = null;
      if (AppUpdater.addListener) {
        listenerHandle = await AppUpdater.addListener('downloadProgress', (data: DownloadProgress) => {
          onProgress(data);
        });
      }

      const res = await AppUpdater.downloadAndInstall({
        url: apkUrl,
        fileName: 'BereaSnap-update.apk',
      });

      if (listenerHandle?.remove) {
        listenerHandle.remove();
      }

      return { success: Boolean(res?.success) };
    } catch (err: any) {
      console.error('[UpdateService] Error en descarga nativa in-app:', err);
      return { success: false, error: err?.message || 'Error durante la descarga nativa' };
    }
  }

  // 2. En Navegador Web (Entorno de desarrollo / fallback): descarga directa simulando progreso
  try {
    let pct = 0;
    const interval = setInterval(() => {
      pct = Math.min(95, pct + 15);
      onProgress({
        percent: pct,
        bytesDownloaded: Math.round((pct / 100) * 10500000),
        totalBytes: 10500000,
      });
    }, 150);

    const a = document.createElement('a');
    a.href = apkUrl;
    a.download = 'BereaSnap.apk';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      clearInterval(interval);
      onProgress({ percent: 100, bytesDownloaded: 10500000, totalBytes: 10500000 });
    }, 1200);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'No se pudo iniciar la descarga' };
  }
}

/**
 * Abre de nuevo el instalador de paquetes si el APK ya fue descargado previamente
 */
export async function installExistingDownloadedApk(): Promise<boolean> {
  if (Capacitor.isNativePlatform() && AppUpdater.installExisting) {
    try {
      const res = await AppUpdater.installExisting({ fileName: 'BereaSnap-update.apk' });
      return Boolean(res?.success);
    } catch (err) {
      console.warn('[UpdateService] No se pudo reinstalar archivo existente:', err);
      return false;
    }
  }
  return false;
}
