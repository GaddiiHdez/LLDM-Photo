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
  Download,
  Image as ImageIcon,
  ChevronDown,
  X,
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
  onSingleExport,
  onSingleShare,
  onExportBatch,
  onUndo,
  onRedo,
  onRevert,
  onApplySettingsToAll,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaveChoiceOpen, setIsSaveChoiceOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleSaveClick = () => {
    if (totalPhotos <= 1) {
      onSingleExport?.();
    } else {
      setIsSaveChoiceOpen(true);
    }
  };

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
                <ChevronLeft size={20} />
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
                <Undo2 size={16} />
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
                <Redo2 size={16} />
              </button>
            )}

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

            {/* Botón Guardar Foto o Lote (Inteligente con One UI Save Sheet) */}
            <button
              type="button"
              onClick={handleSaveClick}
              className="oneui-save-action-btn"
              title={totalPhotos > 1 ? `Guardar foto actual o lote (${totalPhotos})` : 'Guardar fotografía en Galería'}
            >
              <Download size={14} />
              <span>Guardar</span>
              {totalPhotos > 1 && <ChevronDown size={12} style={{ opacity: 0.8, marginLeft: 1 }} />}
            </button>

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

      {/* Sheet de Selección de Guardado (Foto Actual vs Todo el Lote) */}
      {isSaveChoiceOpen && (
        <div
          className="modal-backdrop oneui-sheet-backdrop"
          style={{ zIndex: 9999 }}
          onClick={() => setIsSaveChoiceOpen(false)}
        >
          <div
            className="oneui-save-choice-sheet oneui-sheet card-glass"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="oneui-sheet-handle-row" onClick={() => setIsSaveChoiceOpen(false)} title="Cerrar">
              <div className="oneui-sheet-handle" />
            </div>

            <div className="oneui-deck-title-row" style={{ marginBottom: '0.85rem' }}>
              <div className="oneui-param-title-group">
                <span className="oneui-param-title" style={{ fontSize: '0.85rem' }}>¿QUÉ DESEAS GUARDAR?</span>
                <span className="oneui-param-meta-tag">
                  {totalPhotos} {totalPhotos === 1 ? 'fotografía' : 'fotografías en sesión'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveChoiceOpen(false)}
                className="oneui-reset-tiny-btn"
                title="Cerrar"
              >
                <X size={14} />
              </button>
            </div>

            <div className="oneui-save-choice-options">
              <button
                type="button"
                onClick={() => {
                  setIsSaveChoiceOpen(false);
                  onSingleExport?.();
                }}
                className="oneui-save-choice-card"
              >
                <div
                  className="oneui-save-choice-icon-wrap"
                  style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}
                >
                  <ImageIcon size={20} />
                </div>
                <div className="oneui-save-choice-text">
                  <strong>Guardar solo foto actual ({currentPhotoIndex + 1} de {totalPhotos})</strong>
                  <span>Guarda la foto seleccionada con todos sus ajustes aplicados</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSaveChoiceOpen(false);
                  onExportBatch();
                }}
                className="oneui-save-choice-card primary-border"
              >
                <div
                  className="oneui-save-choice-icon-wrap"
                  style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}
                >
                  <FolderArchive size={20} />
                </div>
                <div className="oneui-save-choice-text">
                  <strong>Guardar todo el lote ({totalPhotos} fotos)</strong>
                  <span>Configurar y exportar todas las fotos a Galería o Archivo ZIP</span>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsSaveChoiceOpen(false)}
              className="oneui-btn-secondary"
              style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
