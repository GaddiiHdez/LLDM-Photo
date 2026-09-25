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
            src="/logo-lldm-studio.jpg"
            alt="LLDM Photo Studio"
            className="brand-logo-img"
          />
        </div>
        <div className="brand-titles">
          <h1 className="brand-title">
            LLDM <span className="brand-highlight">Photo Studio</span>
            <span className="badge-pro">PRO</span>
          </h1>
          <p className="brand-subtitle">
            <Sliders size={12} style={{ color: 'var(--color-brand-light)' }} />
            <span>Motor RAW 14-Bit & Edición en Lote</span>
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
            <span>Blanco</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectTheme('dark')}
            className={`theme-switch-btn ${theme === 'dark' ? 'active' : ''}`}
            title="Modo Grafito Oscuro (Cuarto Oscuro)"
            aria-pressed={theme === 'dark'}
          >
            <Moon size={13} className="theme-icon-moon" />
            <span>Grafito</span>
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
              <span className="btn-label-mobile">Añadir</span>
            </button>

            <button
              onClick={onExportBatch}
              className="btn-primary header-btn"
              title="Exportar todas las fotos procesadas en archivo ZIP de alta resolución"
            >
              <Download size={15} />
              <span className="btn-label-desktop">Exportar ZIP ({totalPhotos})</span>
              <span className="btn-label-mobile">Exportar ({totalPhotos})</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
