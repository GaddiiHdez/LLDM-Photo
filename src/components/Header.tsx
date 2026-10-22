import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  Share2,
  Eye,
  EyeOff,
  FolderArchive,
  LayoutGrid,
  Info,
  Sparkles,
  MoreVertical,
  RotateCcw,
  CheckCheck,
} from 'lucide-react';
import type { PhotoItem } from '../types/editor';
import { APP_VERSION } from '../version';

interface HeaderProps {
  totalPhotos: number;
  currentPhotoIndex?: number;
  activePhoto?: PhotoItem;
  theme: 'light' | 'dark';
  showOriginal?: boolean;
  hasUpdateBadge?: boolean;
  hasModifications?: boolean;
  onToggleOriginal?: (val?: boolean) => void;
  onSelectTheme?: (theme: 'light' | 'dark') => void;
  onToggleTheme: () => void;
  onOpenGrid?: () => void;
  onOpenAbout?: () => void;
  onSingleExport?: () => void;
  onSingleShare?: () => void;
  onExportBatch: () => void;
  onRevert?: () => void;
  onApplySettingsToAll?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalPhotos,
  currentPhotoIndex = 0,
  activePhoto,
  theme,
  showOriginal = false,
  hasUpdateBadge = false,
  hasModifications = false,
  onToggleOriginal,
  onToggleTheme,
  onOpenGrid,
  onOpenAbout,
  onSingleExport,
  onSingleShare,
  onExportBatch,
  onRevert,
  onApplySettingsToAll,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

  return (
    <header className="app-header oneui-header">
      <div className="header-brand">
        {totalPhotos === 0 ? (
          <div
            className="brand-titles"
            onClick={onOpenAbout}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.65rem' }}
            title="Ver información y actualizaciones"
          >
            <img
              src="/logo-bereasnap-icon.jpg"
              alt="BereaSnap"
              className="brand-logo-img"
              style={{ width: '2rem', height: '2rem', borderRadius: '0.45rem', objectFit: 'cover' }}
            />
            <h1 className="brand-title">
              Berea<span className="brand-highlight">Snap</span>
              <span className="badge-pro">PRO</span>
              <span className="badge-version">v{APP_VERSION}</span>
            </h1>
          </div>
        ) : (
          <div className="oneui-header-left">
            {/* Botón Revertir con icono sutil (Flecha atrás estilo One UI) */}
            {onRevert && (
              <button
                type="button"
                onClick={onRevert}
                disabled={!hasModifications}
                className={`oneui-revert-btn ${hasModifications ? 'active' : ''}`}
                title="Revertir todos los cambios de esta fotografía"
              >
                <RotateCcw size={16} />
                <span className="oneui-btn-text">Revertir</span>
              </button>
            )}

            {/* Contador de foto activa (Tocar abre cuadrícula de sesión) */}
            <button
              type="button"
              onClick={onOpenGrid}
              className="oneui-counter-pill"
              title="Ver cuadrícula de sesión"
            >
              <LayoutGrid size={13} style={{ color: 'var(--color-accent)' }} />
              <span>
                {currentPhotoIndex + 1}/{totalPhotos}
              </span>
              {activePhoto?.isRaw && <span className="badge-raw-tiny">RAW</span>}
            </button>
          </div>
        )}
      </div>

      <div className="header-actions oneui-header-right">
        {totalPhotos > 0 && (
          <>
            {/* Botón Ojo: Comparar Original (Estilo One UI) */}
            {onToggleOriginal && (
              <button
                type="button"
                onClick={() => onToggleOriginal()}
                className={`oneui-icon-btn ${showOriginal ? 'active' : ''}`}
                title="Mantener o pulsar para comparar con original"
              >
                {showOriginal ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            )}

            {/* Botón Guardar Foto Actual (Texto blanco limpio estilo One UI) */}
            {onSingleExport && (
              <button
                type="button"
                onClick={onSingleExport}
                className="oneui-save-action-btn"
                title="Guardar fotografía en Galería"
              >
                <span>Guardar</span>
              </button>
            )}

            {/* Botón Compartir Rápido en Móvil */}
            {onSingleShare && (
              <button
                type="button"
                onClick={onSingleShare}
                className="oneui-icon-btn desktop-only-btn"
                title="Compartir foto procesada"
              >
                <Share2 size={17} />
              </button>
            )}
          </>
        )}

        {/* Notificación de Actualización si hay disponible */}
        {hasUpdateBadge && (
          <button
            type="button"
            onClick={onOpenAbout}
            className="oneui-update-dot-btn"
            title="¡Nueva actualización disponible! Toca para instalar"
          >
            <Sparkles size={14} style={{ color: '#fbbf24' }} />
          </button>
        )}

        {/* Menú de 3 Puntos estilo One UI (⋮) */}
        <div className="oneui-menu-wrap" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className={`oneui-icon-btn ${isMenuOpen ? 'active' : ''}`}
            title="Más opciones"
            aria-label="Más opciones"
          >
            <MoreVertical size={18} />
          </button>

          {isMenuOpen && (
            <div className="oneui-popover-menu card-glass">
              {totalPhotos > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onExportBatch();
                    }}
                    className="oneui-menu-item primary"
                  >
                    <FolderArchive size={15} style={{ color: 'var(--color-brand-light)' }} />
                    <div className="menu-item-text">
                      <strong>Exportar lote completo</strong>
                      <span>Procesar las {totalPhotos} fotos a JPG</span>
                    </div>
                  </button>

                  {onApplySettingsToAll && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onApplySettingsToAll();
                      }}
                      className="oneui-menu-item"
                    >
                      <CheckCheck size={15} style={{ color: '#34d399' }} />
                      <div className="menu-item-text">
                        <strong>Sincronizar lote</strong>
                        <span>Copiar ajustes actuales a todas</span>
                      </div>
                    </button>
                  )}

                  {onSingleShare && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onSingleShare();
                      }}
                      className="oneui-menu-item"
                    >
                      <Share2 size={15} />
                      <div className="menu-item-text">
                        <strong>Compartir fotografía</strong>
                        <span>WhatsApp, Telegram o Redes</span>
                      </div>
                    </button>
                  )}

                  <div className="oneui-menu-divider" />
                </>
              )}

              {/* Conmutador de Tema Visual */}
              <button
                type="button"
                onClick={() => {
                  onToggleTheme();
                }}
                className="oneui-menu-item"
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                <div className="menu-item-text">
                  <strong>Tema: {theme === 'dark' ? 'Negro AMOLED' : 'Blanco Galería'}</strong>
                  <span>{theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a negro puro'}</span>
                </div>
              </button>

              {/* Información y Versión */}
              {onOpenAbout && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenAbout();
                  }}
                  className="oneui-menu-item"
                >
                  <Info size={15} />
                  <div className="menu-item-text">
                    <strong>BereaSnap v{APP_VERSION}</strong>
                    <span>Buscar actualizaciones de APK</span>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
