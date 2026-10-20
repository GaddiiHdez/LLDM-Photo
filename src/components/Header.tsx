import React from 'react';
import {
  Download,
  Sun,
  Moon,
  Share2,
  Eye,
  EyeOff,
  FolderArchive,
  LayoutGrid,
  Info,
  Sparkles,
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
  onToggleOriginal?: (val?: boolean) => void;
  onSelectTheme?: (theme: 'light' | 'dark') => void;
  onToggleTheme: () => void;
  onOpenGrid?: () => void;
  onOpenAbout?: () => void;
  onSingleExport?: () => void;
  onSingleShare?: () => void;
  onExportBatch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalPhotos,
  currentPhotoIndex = 0,
  activePhoto,
  theme,
  showOriginal = false,
  hasUpdateBadge = false,
  onToggleOriginal,
  onToggleTheme,
  onOpenGrid,
  onOpenAbout,
  onSingleExport,
  onSingleShare,
  onExportBatch,
}) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <button
          type="button"
          onClick={onOpenAbout}
          className="brand-logo-btn relative"
          title={`BereaSnap v${APP_VERSION} — Toca para buscar actualizaciones`}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <img
            src="/logo-bereasnap-icon.jpg"
            alt="BereaSnap"
            className="brand-logo-img"
            style={{ borderRadius: '0.45rem', objectFit: 'cover' }}
          />
          {hasUpdateBadge && (
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
                boxShadow: '0 0 8px #f59e0b',
              }}
            />
          )}
        </button>

        {totalPhotos === 0 ? (
          <div
            className="brand-titles"
            onClick={onOpenAbout}
            style={{ cursor: 'pointer' }}
            title="Ver información y actualizaciones"
          >
            <h1 className="brand-title">
              Berea<span className="brand-highlight">Snap</span>
              <span className="badge-pro">PRO</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: 'var(--color-text-muted)',
                  marginLeft: '4px',
                }}
              >
                v{APP_VERSION}
              </span>
            </h1>
          </div>
        ) : (
          <div className="studio-header-meta">
            <button
              type="button"
              onClick={onOpenGrid}
              className="studio-counter-pill interactive"
              title="Ver cuadrícula de todas las fotos de la sesión"
            >
              <LayoutGrid size={12} style={{ color: 'var(--color-accent)' }} />
              <span>
                {currentPhotoIndex + 1}/{totalPhotos}
              </span>
            </button>
            {activePhoto?.isRaw && <span className="badge-raw">RAW</span>}
            {activePhoto && (
              <span className="header-filename-desktop" title={activePhoto.name}>
                {activePhoto.name}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="header-actions">
        {/* Notificación de Actualización si hay disponible */}
        {hasUpdateBadge && (
          <button
            type="button"
            onClick={onOpenAbout}
            className="header-update-badge-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '999px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#fbbf24',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              animation: 'pulse 2s infinite',
            }}
            title="¡Nueva actualización disponible! Toca para instalar"
          >
            <Sparkles size={12} />
            <span>Actualizar</span>
          </button>
        )}

        {totalPhotos > 0 && (
          <>
            {/* Botón Comparar Antes / Después */}
            {onToggleOriginal && (
              <button
                type="button"
                onClick={() => onToggleOriginal()}
                className={`header-icon-btn ${showOriginal ? 'active-compare' : ''}`}
                title="Comparar con Original (Atajo: tecla B)"
              >
                {showOriginal ? <EyeOff size={15} /> : <Eye size={15} />}
                <span className="btn-label-desktop">Original</span>
              </button>
            )}

            {/* Compartir Foto Actual (1 Toque en Android / Móvil) */}
            {onSingleShare && (
              <button
                type="button"
                onClick={onSingleShare}
                className="header-icon-btn"
                title="Compartir esta foto (WhatsApp, Telegram, Redes)"
              >
                <Share2 size={15} style={{ color: 'var(--color-brand-light)' }} />
                <span className="btn-label-desktop">Compartir</span>
              </button>
            )}

            {/* Guardar Foto Actual */}
            {onSingleExport && (
              <button
                type="button"
                onClick={onSingleExport}
                className="header-icon-btn"
                title="Guardar esta fotografía procesada"
              >
                <Download size={15} />
                <span className="btn-label-desktop">Guardar</span>
              </button>
            )}

            {/* Exportar Lote Completo */}
            <button
              type="button"
              onClick={onExportBatch}
              className="btn-primary header-btn"
              title="Exportar o compartir lote completo"
            >
              <FolderArchive size={14} />
              <span className="btn-label-desktop">Exportar ({totalPhotos})</span>
              <span className="btn-label-mobile">Lote ({totalPhotos})</span>
            </button>
          </>
        )}

        {/* Botón Acerca de / Versión */}
        {onOpenAbout && (
          <button
            type="button"
            onClick={onOpenAbout}
            className="header-icon-btn"
            title={`BereaSnap v${APP_VERSION} — Buscar Actualizaciones`}
            aria-label="Acerca de BereaSnap"
          >
            <Info size={15} />
          </button>
        )}

        {/* Botón Compacto de Tema (Grafito Oscuro / Blanco Galería) */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="header-icon-btn theme-single-btn"
          title={theme === 'dark' ? 'Cambiar a Tema Blanco Galería' : 'Cambiar a Tema Grafito Oscuro'}
          aria-label="Cambiar tema visual"
        >
          {theme === 'dark' ? (
            <Sun size={15} className="theme-icon-sun" />
          ) : (
            <Moon size={15} className="theme-icon-moon" />
          )}
        </button>
      </div>
    </header>
  );
};
