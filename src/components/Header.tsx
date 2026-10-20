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
} from 'lucide-react';
import type { PhotoItem } from '../types/editor';

interface HeaderProps {
  totalPhotos: number;
  currentPhotoIndex?: number;
  activePhoto?: PhotoItem;
  theme: 'light' | 'dark';
  showOriginal?: boolean;
  onToggleOriginal?: (val?: boolean) => void;
  onSelectTheme?: (theme: 'light' | 'dark') => void;
  onToggleTheme: () => void;
  onOpenGrid?: () => void;
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
  onToggleOriginal,
  onToggleTheme,
  onOpenGrid,
  onSingleExport,
  onSingleShare,
  onExportBatch,
}) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo">
          <img
            src="/logo-bereasnap-icon.jpg"
            alt="BereaSnap"
            className="brand-logo-img"
            style={{ borderRadius: '0.45rem', objectFit: 'cover' }}
          />
        </div>

        {totalPhotos === 0 ? (
          <div className="brand-titles">
            <h1 className="brand-title">
              Berea<span className="brand-highlight">Snap</span>
              <span className="badge-pro">PRO</span>
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
