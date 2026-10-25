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
  Undo2,
  Redo2,
  CheckCheck,
  ChevronLeft,
  Home,
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
  onGoHome?: () => void;
  onToggleOriginal?: (val?: boolean) => void;
  onSelectTheme?: (theme: 'light' | 'dark') => void;
  onToggleTheme: () => void;
  onOpenGrid?: () => void;
  onOpenAbout?: () => void;
  onSingleExport?: () => void;
  onSingleShare?: () => void;
  onExportBatch: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
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
  canUndo = false,
  canRedo = false,
  onGoHome,
  onToggleOriginal,
  onToggleTheme,
  onOpenGrid,
  onOpenAbout,
  onSingleShare,
  onExportBatch,
  onUndo,
  onRedo,
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
    <header className={`app-header oneui-header ${totalPhotos === 0 ? 'is-empty' : ''}`}>
      <div className="header-brand">
        {totalPhotos > 0 && (
          <div className="oneui-header-left">
            {/* Botón Volver al Inicio / Salir */}
            {onGoHome && (
              <button
                type="button"
                onClick={onGoHome}
                className="oneui-back-home-btn"
                title="Volver al inicio (Cerrar sesión)"
                aria-label="Volver al inicio"
              >
                <ChevronLeft size={19} />
              </button>
            )}

            {/* Deshacer paso a paso (Undo) */}
            {onUndo && (
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className={`oneui-history-btn ${canUndo ? 'active' : ''}`}
                title="Deshacer último ajuste (Ctrl+Z)"
                aria-label="Deshacer"
              >
                <Undo2 size={15} />
              </button>
            )}

            {/* Rehacer paso a paso (Redo) */}
            {onRedo && (
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className={`oneui-history-btn ${canRedo ? 'active' : ''}`}
                title="Rehacer ajuste (Ctrl+Y)"
                aria-label="Rehacer"
              >
                <Redo2 size={15} />
              </button>
            )}

            {/* Botón Revertir (en escritorio visible en barra; en móvil integrado en menú ⋮ y en cada pestaña) */}
            {onRevert && (
              <button
                type="button"
                onClick={onRevert}
                disabled={!hasModifications}
                className={`oneui-revert-btn desktop-only-btn ${hasModifications ? 'active' : ''}`}
                title="Revertir todos los cambios de esta fotografía"
              >
                <RotateCcw size={15} />
                <span className="oneui-btn-text">Revertir</span>
              </button>
            )}

            {/* Contador de foto activa (Tocar abre carrete de sesión) */}
            <button
              type="button"
              onClick={onOpenGrid}
              className="oneui-counter-pill"
              title="Ver carrete de sesión"
            >
              <LayoutGrid size={12} style={{ color: 'var(--color-accent)' }} />
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
                title="Comparar con original"
              >
                {showOriginal ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}

            {/* Botón Guardar: Abre la hoja One UI unificada (Foto actual o Lote completo) */}
            <button
              type="button"
              onClick={onExportBatch}
              className="oneui-save-action-btn"
              title="Guardar fotografía o lote"
            >
              <span>Guardar</span>
            </button>

            {/* Botón Compartir Rápido */}
            {onSingleShare && (
              <button
                type="button"
                onClick={onSingleShare}
                className="oneui-icon-btn"
                title="Compartir foto actual"
              >
                <Share2 size={16} />
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
            <Sparkles size={13} style={{ color: '#fbbf24' }} />
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
            <MoreVertical size={17} />
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
                      <strong>Guardar / Exportar lote</strong>
                      <span>Foto actual o las {totalPhotos} fotos</span>
                    </div>
                  </button>

                  {onApplySettingsToAll && totalPhotos > 1 && (
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

                  {onRevert && (
                    <button
                      type="button"
                      disabled={!hasModifications}
                      onClick={() => {
                        setIsMenuOpen(false);
                        onRevert();
                      }}
                      className="oneui-menu-item"
                      style={{ opacity: hasModifications ? 1 : 0.45 }}
                    >
                      <RotateCcw size={15} style={{ color: '#fbbf24' }} />
                      <div className="menu-item-text">
                        <strong>Revertir foto original</strong>
                        <span>Restablecer todos los ajustes de esta foto</span>
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

              {/* Volver al Inicio / Cerrar sesión */}
              {totalPhotos > 0 && onGoHome && (
                <>
                  <div className="oneui-menu-divider" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onGoHome();
                    }}
                    className="oneui-menu-item"
                    style={{ color: '#ef4444' }}
                  >
                    <Home size={15} />
                    <div className="menu-item-text">
                      <strong style={{ color: '#ef4444' }}>Cerrar sesión</strong>
                      <span>Volver a la pantalla de inicio</span>
                    </div>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
