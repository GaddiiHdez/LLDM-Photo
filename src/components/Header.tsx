import React from 'react';
import { Download, Plus, Sliders, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  totalPhotos: number;
  theme: 'light' | 'dark';
  onSelectTheme: (theme: 'light' | 'dark') => void;
  onToggleTheme?: () => void;
  onAddPhotosClick: () => void;
  onExportBatch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalPhotos,
  theme,
  onSelectTheme,
  onAddPhotosClick,
  onExportBatch,
}) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo">
          <img
            src="/logo-bereasnap.svg"
            alt="BereaSnap"
            className="brand-logo-img"
          />
        </div>
        <div className="brand-titles">
          <h1 className="brand-title">
            <span className="brand-text-desktop">
              Berea<span className="brand-highlight">Snap</span>
              <span className="badge-pro">PRO</span>
            </span>
            <span className="brand-text-mobile">
              Berea<span className="brand-highlight">Snap</span>
            </span>
          </h1>
          <p className="brand-subtitle">
            <Sliders size={12} style={{ color: 'var(--color-brand-light)' }} />
            <span>Revelado Rápido, Marcos & Edición</span>
          </p>
        </div>
      </div>

      <div className="header-actions">
        {/* Selector de Tema Dual Segmentado: [ ☀️ Blanco | 🌙 Grafito ] */}
        <div className="theme-switch-group" role="group" aria-label="Selector de Tema">
          <button
            type="button"
            onClick={() => onSelectTheme('light')}
            className={`theme-switch-btn ${theme === 'light' ? 'active' : ''}`}
            title="Modo Blanco Premium (Estudio Editorial)"
            aria-pressed={theme === 'light'}
          >
            <Sun size={13} className="theme-icon-sun" />
            <span className="theme-btn-label">Blanco</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTheme('dark')}
            className={`theme-switch-btn ${theme === 'dark' ? 'active' : ''}`}
            title="Modo Grafito Oscuro (Cuarto Oscuro)"
            aria-pressed={theme === 'dark'}
          >
            <Moon size={13} className="theme-icon-moon" />
            <span className="theme-btn-label">Grafito</span>
          </button>
        </div>

        {totalPhotos > 0 && (
          <>
            <button
              onClick={onAddPhotosClick}
              className="btn-secondary header-btn"
              title="Añadir más fotos a la sesión actual"
            >
              <Plus size={15} />
              <span className="btn-label-desktop">Añadir Fotos</span>
            </button>

            <button
              onClick={onExportBatch}
              className="btn-primary header-btn"
              title="Exportar todas las fotos procesadas en archivo ZIP de alta resolución"
            >
              <Download size={14} />
              <span className="btn-label-desktop">Exportar ZIP ({totalPhotos})</span>
              <span className="btn-label-mobile">ZIP ({totalPhotos})</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
