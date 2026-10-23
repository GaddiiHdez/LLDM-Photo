import React, { useState } from 'react';
import {
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  RotateCw,
  Check,
} from 'lucide-react';
import {
  startInAppUpdate,
  installExistingDownloadedApk,
  checkForUpdate,
  type UpdateInfo,
  type DownloadProgress,
} from '../services/updateService';
import { APP_VERSION, GITHUB_REPO } from '../version';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInfo?: UpdateInfo | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  initialInfo,
}) => {
  const [info, setInfo] = useState<UpdateInfo | null>(initialInfo || null);
  const [isChecking, setIsChecking] = useState(false);
  const [checkedAtLeastOnce, setCheckedAtLeastOnce] = useState(Boolean(initialInfo));

  // Estados de Descarga e Instalación In-App
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManualCheck = async () => {
    setIsChecking(true);
    setDownloadError(null);
    setIsCompleted(false);
    try {
      const res = await checkForUpdate(APP_VERSION);
      setInfo(res);
      setCheckedAtLeastOnce(true);
    } catch {
      setInfo({
        isAvailable: false,
        currentVersion: APP_VERSION,
        latestVersion: APP_VERSION,
        releaseName: '',
        releaseNotes: '',
        error: 'network_error',
      });
      setCheckedAtLeastOnce(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handleStartInAppUpdate = async () => {
    if (!info?.apkUrl) return;
    setIsDownloading(true);
    setDownloadError(null);
    setProgress({ percent: 0, bytesDownloaded: 0, totalBytes: info.apkSize || 10500000 });

    const result = await startInAppUpdate(info.apkUrl, (p) => {
      setProgress(p);
    });

    setIsDownloading(false);
    if (result.success) {
      setIsCompleted(true);
    } else {
      setDownloadError(result.error || 'Error al descargar la actualización');
    }
  };

  const handleReopenInstaller = async () => {
    await installExistingDownloadedApk();
  };

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '10.4 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="modal-backdrop oneui-sheet-backdrop" onClick={!isDownloading ? onClose : undefined}>
      <div className="oneui-update-sheet card-glass" onClick={(e) => e.stopPropagation()}>
        {/* Manija One UI para deslizar o cerrar */}
        <div className="oneui-sheet-handle-row" onClick={!isDownloading ? onClose : undefined} title="Cerrar">
          <div className="oneui-sheet-handle" />
        </div>

        {/* Cabecera de la App */}
        <div className="update-sheet-header">
          <div className="update-brand-group">
            <div className="update-brand-icon-box">
              <Sparkles size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <div className="update-brand-title">
                <strong>BereaSnap</strong>
                <span className="update-version-tag">v{APP_VERSION}</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Estudio Fotográfico Eclesiástico
              </span>
            </div>
          </div>

          {!isDownloading && (
            <button
              type="button"
              onClick={onClose}
              className="oneui-reset-tiny-btn"
              title="Cerrar"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Cuerpo del Modal */}
        <div className="update-sheet-body">
          {isDownloading ? (
            /* ================= ESTADO: DESCARGA IN-APP EN CURSO ================= */
            <div className="update-download-card">
              <div className="update-download-header">
                <strong>Descargando actualización...</strong>
                <span>{progress?.percent ?? 0}%</span>
              </div>

              {/* Barra de progreso animada One UI */}
              <div className="update-progress-track">
                <div
                  className="update-progress-fill"
                  style={{ width: `${Math.max(4, Math.min(100, progress?.percent ?? 0))}%` }}
                />
              </div>

              <div className="update-download-footer">
                <span>
                  {progress
                    ? `${(progress.bytesDownloaded / (1024 * 1024)).toFixed(1)} MB de ${formatSize(progress.totalBytes)}`
                    : 'Conectando con el servidor...'}
                </span>
                <span>Instalación directa</span>
              </div>
            </div>
          ) : isCompleted ? (
            /* ================= ESTADO: DESCARGA COMPLETADA ================= */
            <div className="update-completed-card">
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34d399',
                  marginBottom: '4px',
                }}
              >
                <Check size={24} />
              </div>
              <strong>¡Descarga completada!</strong>
              <span>
                El instalador de paquetes de Android se ha abierto. Si saliste de la pantalla o necesitas abrirlo de nuevo, presiona el botón inferior.
              </span>
            </div>
          ) : info?.isAvailable ? (
            /* ================= ESTADO: ACTUALIZACIÓN DISPONIBLE ================= */
            <>
              {/* Banner Destacado Dorado */}
              <div className="update-hero-banner">
                <div className="update-hero-banner-icon">
                  <Sparkles size={20} style={{ color: '#f59e0b' }} />
                </div>
                <div className="update-hero-banner-text">
                  <strong>¡Nueva versión v{info.latestVersion} disponible!</strong>
                  <span>Descarga e instala directamente sin necesidad de abrir el navegador.</span>
                </div>
              </div>

              {/* Comparación de Versiones */}
              <div className="update-meta-grid">
                <div className="update-meta-card">
                  <span className="label">Instalada</span>
                  <span className="value">v{APP_VERSION}</span>
                </div>
                <div className="update-meta-card highlight">
                  <span className="label">Nueva Versión</span>
                  <span className="value">
                    v{info.latestVersion} ({formatSize(info.apkSize)})
                  </span>
                </div>
              </div>

              {/* Novedades / Changelog formateado */}
              {info.releaseNotes && (
                <div className="update-notes-box">
                  <span className="update-notes-label">Novedades en esta versión:</span>
                  <div className="update-notes-content">
                    {info.releaseNotes}
                  </div>
                </div>
              )}

              {downloadError && (
                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#fca5a5',
                    fontSize: '0.72rem',
                  }}
                >
                  ⚠️ {downloadError}
                </div>
              )}
            </>
          ) : checkedAtLeastOnce ? (
            /* ================= ESTADO: AL DÍA / SIN ACTUALIZACIÓN ================= */
            <div className="update-status-clean">
              {info?.error ? (
                <>
                  <div
                    className="update-status-clean-icon"
                    style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#f59e0b' }}
                  >
                    <AlertCircle size={26} />
                  </div>
                  <strong>Modo Offline Activo</strong>
                  <span>
                    No se pudo conectar con GitHub Releases. BereaSnap sigue funcionando al 100% de manera offline.
                  </span>
                </>
              ) : (
                <>
                  <div className="update-status-clean-icon">
                    <CheckCircle2 size={26} />
                  </div>
                  <strong>¡Estás al día!</strong>
                  <span>
                    Tienes instalada la versión más reciente (<code style={{ color: '#f59e0b' }}>v{APP_VERSION}</code>) con toda la suite de herramientas fotográficas Pro.
                  </span>
                </>
              )}
            </div>
          ) : (
            /* ================= ESTADO INICIAL: COMPROBAR ================= */
            <div style={{ padding: '1rem 0', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>
                Comprueba si existe una versión más reciente de BereaSnap con mejoras de color, revelado y nuevas herramientas.
              </p>
            </div>
          )}

          {/* Enlace al Repositorio Oficial */}
          <div
            style={{
              paddingTop: '0.65rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: '#64748b',
            }}
          >
            <span>Repositorio oficial</span>
            <a
              href={`https://github.com/${GITHUB_REPO}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                color: '#38bdf8',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              GitHub <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Acciones Inferiores (Estilo One UI) */}
        <div className="update-sheet-actions">
          {isDownloading ? (
            <div style={{ width: '100%', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', padding: '0.4rem 0' }}>
              Descargando archivo APK en segundo plano...
            </div>
          ) : isCompleted ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="oneui-reset-tiny-btn"
                style={{ flex: 1, padding: '0.7rem' }}
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleReopenInstaller}
                className="oneui-mini-action-btn primary"
                style={{
                  flex: 2,
                  padding: '0.7rem',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                }}
              >
                Reabrir Instalador
              </button>
            </>
          ) : info?.isAvailable ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="oneui-reset-tiny-btn"
                style={{ flex: 1, padding: '0.7rem' }}
              >
                Más tarde
              </button>
              <button
                type="button"
                onClick={handleStartInAppUpdate}
                className="oneui-mini-action-btn primary"
                style={{
                  flex: 2,
                  padding: '0.7rem',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000000',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                }}
              >
                <Download size={15} />
                <span>Instalar Actualización</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="oneui-reset-tiny-btn"
                style={{ flex: 1, padding: '0.7rem' }}
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={isChecking}
                className="oneui-mini-action-btn primary"
                style={{
                  flex: 1.5,
                  padding: '0.7rem',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000000',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  opacity: isChecking ? 0.7 : 1,
                }}
              >
                <RotateCw size={14} className={isChecking ? 'spin-icon' : ''} />
                <span>{isChecking ? 'Buscando...' : 'Buscar Actualización'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
