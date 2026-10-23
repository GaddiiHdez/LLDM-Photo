import React, { useState } from 'react';
import { Download, RefreshCw, X, CheckCircle2, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';
import { downloadAndInstallApk, checkForUpdate, type UpdateInfo } from '../services/updateService';
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

  if (!isOpen) return null;

  const handleManualCheck = async () => {
    setIsChecking(true);
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

  const handleDownload = () => {
    if (info?.apkUrl) {
      downloadAndInstallApk(info.apkUrl);
      onClose();
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="modal-backdrop oneui-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="oneui-bottom-sheet card-glass"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: '#0d0d12',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.85)',
          color: '#ffffff',
        }}
      >
        {/* Manija One UI para deslizar o cerrar */}
        <div className="oneui-sheet-handle-row" onClick={onClose} title="Cerrar">
          <div className="oneui-sheet-handle" />
        </div>
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '0.65rem',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(56, 189, 248, 0.2))',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={16} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>BereaSnap</span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'monospace',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                  }}
                >
                  v{APP_VERSION}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                Estudio Fotográfico Android & Desktop
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {info?.isAvailable ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Alert Badge */}
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: '0.85rem',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.1))',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                }}
              >
                <Sparkles size={18} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.78rem' }}>
                  <div style={{ fontWeight: 700, color: '#fef08a', fontSize: '0.85rem' }}>
                    ¡Nueva versión disponible: v{info.latestVersion}!
                  </div>
                  <div style={{ color: '#e2e8f0', marginTop: '0.2rem', lineHeight: 1.4 }}>
                    Se encontró una nueva actualización con mejoras de rendimiento, revelado y nuevas funciones.
                  </div>
                </div>
              </div>

              {/* Version Comparison Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div
                  style={{
                    padding: '0.65rem',
                    borderRadius: '0.65rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                    Instalada
                  </span>
                  <span style={{ color: '#ffffff', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem' }}>
                    v{APP_VERSION}
                  </span>
                </div>

                <div
                  style={{
                    padding: '0.65rem',
                    borderRadius: '0.65rem',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                  }}
                >
                  <span style={{ color: '#f59e0b', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                    Disponible
                  </span>
                  <span style={{ color: '#fef08a', fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem' }}>
                    v{info.latestVersion} {info.apkSize ? `(${formatSize(info.apkSize)})` : ''}
                  </span>
                </div>
              </div>

              {/* Release Notes */}
              {info.releaseNotes && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1' }}>
                    Novedades en esta versión:
                  </span>
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: '0.75rem',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: '0.74rem',
                      color: '#cbd5e1',
                      maxHeight: '140px',
                      overflowY: 'auto',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                    }}
                  >
                    {info.releaseNotes}
                  </div>
                </div>
              )}
            </div>
          ) : checkedAtLeastOnce ? (
            <div style={{ padding: '1.5rem 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
              {info?.error ? (
                <>
                  <div
                    style={{
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '50%',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      color: '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                      Modo Offline Activo
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8', maxWidth: '300px', lineHeight: 1.4 }}>
                      No se pudo comprobar la conexión con GitHub. BereaSnap sigue funcionando al 100% sin internet.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                      ¡Estás al día!
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.4 }}>
                      Tienes la versión más reciente (<span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>v{APP_VERSION}</span>) instalada.
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ padding: '1rem 0', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.45 }}>
                Comprueba si hay una nueva versión de BereaSnap con mejoras de revelado y nuevas funciones en GitHub Releases.
              </p>
            </div>
          )}

          {/* Enlace al Repositorio */}
          <div
            style={{
              paddingTop: '0.65rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: '#94a3b8',
            }}
          >
            <span>Repositorio oficial</span>
            <a
              href={`https://github.com/${GITHUB_REPO}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}
            >
              GitHub <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Action Footer */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
          }}
        >
          {info?.isAvailable ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary btn-sm"
                style={{ flex: 1, padding: '0.65rem' }}
              >
                Más tarde
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="btn-primary btn-sm"
                style={{
                  flex: 2,
                  padding: '0.65rem',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#050810',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                }}
              >
                <Download size={14} />
                <span>Descargar APK</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary btn-sm"
                style={{ flex: 1, padding: '0.65rem' }}
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={isChecking}
                className="btn-primary btn-sm"
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  opacity: isChecking ? 0.6 : 1,
                }}
              >
                <RefreshCw size={13} className={isChecking ? 'animate-spin' : ''} />
                <span>{isChecking ? 'Buscando...' : 'Buscar Actualización'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
