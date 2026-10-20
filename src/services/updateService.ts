import { APP_VERSION, GITHUB_RELEASES_API } from '../version';

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
 * Compare two semver strings (e.g. "1.1.0" vs "1.2.0" or "v1.1.0-build8")
 * Returns true if remote is strictly newer than current.
 */
export function isNewerVersion(remoteTag: string, currentVersion: string): boolean {
  try {
    const parse = (v: string) => {
      // Clean string: remove leading 'v', strip any suffix like -build8 or +extra
      const clean = v.replace(/^v/i, '').split(/[-+]/)[0];
      const parts = clean.split('.').map(n => parseInt(n, 10) || 0);
      return {
        major: parts[0] ?? 0,
        minor: parts[1] ?? 0,
        patch: parts[2] ?? 0
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
 * Checks GitHub Releases for a newer version of BereaSnap.
 * If offline or GitHub is unreachable, returns { isAvailable: false, error: 'offline' }.
 */
export async function checkForUpdate(currentVersion: string = APP_VERSION): Promise<UpdateInfo> {
  const baseResult: UpdateInfo = {
    isAvailable: false,
    currentVersion,
    latestVersion: currentVersion,
    releaseName: '',
    releaseNotes: ''
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(GITHUB_RELEASES_API, {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github.v3+json'
      }
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

    // Find the APK file among the assets
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
      publishedAt
    };
  } catch (err: any) {
    return {
      ...baseResult,
      error: err.name === 'AbortError' ? 'timeout' : 'network_error'
    };
  }
}

/**
 * Initiates the download of the APK.
 * On Android (Capacitor/WebView), opening the direct APK download URL launches
 * the system download manager or browser, which downloads the APK and prompts installation.
 */
export function downloadAndInstallApk(apkUrl: string): void {
  if (!apkUrl) return;
  // Use window.open with _system for Capacitor to open the system downloader
  const win = window.open(apkUrl, '_system');
  if (!win) {
    window.location.href = apkUrl;
  }
}
