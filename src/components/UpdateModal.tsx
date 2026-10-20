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
  initialInfo
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
        error: 'network_error'
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-sky-500/20 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                BereaSnap
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-stone-300">
                  v{APP_VERSION}
                </span>
              </h3>
              <p className="text-[11px] text-stone-400">Estudio Fotográfico Android Offline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {info?.isAvailable ? (
            <div className="space-y-4">
              {/* Alert Badge */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/10 border border-amber-500/30 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-amber-300 text-sm">
                    ¡Nueva versión disponible: v{info.latestVersion}!
                  </div>
                  <div className="text-stone-300 mt-0.5">
                    Se encontró una nueva compilación con mejoras de rendimiento y funciones.
                  </div>
                </div>
              </div>

              {/* Version Comparison Meta */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <span className="text-stone-400 block text-[10px] uppercase font-mono">Instalada</span>
                  <span className="text-white font-mono font-medium">v{APP_VERSION}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-amber-400/80 block text-[10px] uppercase font-mono">Disponible</span>
                  <span className="text-amber-300 font-mono font-medium">
                    v{info.latestVersion} {info.apkSize ? `(${formatSize(info.apkSize)})` : ''}
                  </span>
                </div>
              </div>

              {/* Release Notes */}
              {info.releaseNotes && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-stone-300">Novedades en esta versión:</span>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-stone-300 max-h-40 overflow-y-auto font-sans leading-relaxed whitespace-pre-wrap">
                    {info.releaseNotes}
                  </div>
                </div>
              )}
            </div>
          ) : checkedAtLeastOnce ? (
            <div className="py-6 text-center space-y-3">
              {info?.error ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-white">Modo Offline Activo</h4>
                    <p className="text-xs text-stone-400 max-w-xs mx-auto">
                      No se pudo comprobar la conexión con GitHub. BereaSnap sigue funcionando al 100% sin internet.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-white">¡Estás al día!</h4>
                    <p className="text-xs text-stone-400">
                      Tienes la versión más reciente (<span className="text-stone-200 font-mono">v{APP_VERSION}</span>) instalada en tu dispositivo.
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="py-4 text-center space-y-2">
              <p className="text-xs text-stone-400">
                Comprueba si hay una nueva versión de BereaSnap con mejoras y nuevas funciones en GitHub Releases.
              </p>
            </div>
          )}

          {/* GitHub Repository link */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-stone-400">
            <span>Repositorio oficial</span>
            <a
              href={`https://github.com/${GITHUB_REPO}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-sky-400 hover:underline"
            >
              GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </div>

        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center gap-2">
          {info?.isAvailable ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-3 rounded-xl border border-white/10 text-xs font-medium text-stone-300 hover:bg-white/5 transition-colors"
              >
                Más tarde
              </button>
              <button
                onClick={handleDownload}
                className="flex-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                Descargar e Instalar APK
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-3 rounded-xl border border-white/10 text-xs font-medium text-stone-300 hover:bg-white/5 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={handleManualCheck}
                disabled={isChecking}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-amber-400' : ''}`} />
                {isChecking ? 'Buscando...' : 'Buscar Actualización'}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
