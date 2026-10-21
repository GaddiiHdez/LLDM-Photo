import React from 'react';
import { Capacitor } from '@capacitor/core';
import { Sparkles, RefreshCw, Download, Share2, X, CheckCircle2, Zap, ShieldCheck, Images, FileArchive } from 'lucide-react';
import type { ExportOptions } from '../types/editor';

interface ExportModalProps {
  isOpen: boolean;
  isProcessing: boolean;
  current: number;
  total: number;
  currentName: string;
  options: ExportOptions;
  onChangeOptions: (opts: ExportOptions) => void;
  onStartExport: (mode: 'download' | 'share') => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  isProcessing,
  current,
  total,
  currentName,
  options,
  onChangeOptions,
  onStartExport,
  onClose,
}) => {
  if (!isOpen) return null;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const isNative = Capacitor.isNativePlatform();
  const delivery = options.deliveryFormat || 'jpg';
  const primaryLabel =
    delivery === 'zip' ? 'Guardar ZIP' : isNative ? 'Guardar en Galería' : 'Descargar JPG';

  return (
    <div className="modal-backdrop" onClick={!isProcessing ? onClose : undefined}>
      <div
        className="export-modal card-glass"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', width: '92%', padding: '1.35rem', position: 'relative' }}
      >
        {!isProcessing ? (
          <>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary btn-sm"
              style={{ position: 'absolute', top: '0.85rem', right: '0.85rem', padding: '0.3rem 0.45rem' }}
              title="Cerrar"
            >
              <X size={15} />
            </button>

            <h3 className="modal-title" style={{ marginBottom: '0.25rem', fontSize: '1.08rem' }}>
              Exportar Lote ({total} {total === 1 ? 'foto' : 'fotos'})
            </h3>
            <p className="modal-subtitle" style={{ marginBottom: '1rem', fontSize: '0.78rem' }}>
              Elige el formato de salida y prefijo para tus fotografías
            </p>

            {/* PREFIJO DE ARCHIVO */}
            <div style={{ textAlign: 'left', marginBottom: '0.9rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Prefijo del Nombre de Archivo
              </label>
              <input
                type="text"
                value={options.filenamePrefix}
                onChange={(e) => onChangeOptions({ ...options, filenamePrefix: e.target.value })}
                placeholder="Ej. Dominical_20Oct"
                className="form-input"
                style={{ fontSize: '0.82rem', marginBottom: '0.4rem' }}
              />
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {['BereaSnap', 'Escuela_Dominical', 'Oracion_7pm', 'Servicio_Especial'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => onChangeOptions({ ...options, filenamePrefix: chip })}
                    className={`quick-chip-btn ${options.filenamePrefix === chip ? 'active' : ''}`}
                    style={{ fontSize: '0.66rem', padding: '0.18rem 0.48rem' }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* FORMATO DE ENTREGA */}
            <div style={{ textAlign: 'left', marginBottom: '0.9rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Formato de Entrega
              </label>
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                <button
                  type="button"
                  onClick={() => onChangeOptions({ ...options, deliveryFormat: 'jpg' })}
                  className={`preset-card ${delivery === 'jpg' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '0.6rem 0.65rem', textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%' }}>
                    <Images size={15} style={{ color: delivery === 'jpg' ? 'var(--color-brand-light)' : 'inherit' }} />
                    <strong style={{ fontSize: '0.78rem', flex: 1 }}>Fotos JPG</strong>
                    {delivery === 'jpg' && <CheckCircle2 size={14} style={{ color: 'var(--color-brand-light)' }} />}
                  </div>
                  <span style={{ fontSize: '0.64rem', opacity: 0.75, lineHeight: 1.3 }}>
                    {isNative ? 'Directo a tu Galería, sin descomprimir' : 'Cada foto como archivo .jpg'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeOptions({ ...options, deliveryFormat: 'zip' })}
                  className={`preset-card ${delivery === 'zip' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '0.6rem 0.65rem', textAlign: 'left', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%' }}>
                    <FileArchive size={15} style={{ color: delivery === 'zip' ? 'var(--color-brand-light)' : 'inherit' }} />
                    <strong style={{ fontSize: '0.78rem', flex: 1 }}>Archivo ZIP</strong>
                    {delivery === 'zip' && <CheckCircle2 size={14} style={{ color: 'var(--color-brand-light)' }} />}
                  </div>
                  <span style={{ fontSize: '0.64rem', opacity: 0.75, lineHeight: 1.3 }}>
                    Todo el lote en un solo archivo
                  </span>
                </button>
              </div>
            </div>

            {/* SELECTOR DE CALIDAD / TAMAÑO */}
            <div style={{ textAlign: 'left', marginBottom: '1.15rem' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Calidad y Resolución
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <button
                  type="button"
                  onClick={() => onChangeOptions({ ...options, qualityPreset: 'max' })}
                  className={`preset-card ${options.qualityPreset === 'max' ? 'active' : ''}`}
                  style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}
                >
                  <div className={`preset-icon-wrapper ${options.qualityPreset === 'max' ? 'active' : ''}`}>
                    <ShieldCheck size={17} />
                  </div>
                  <div className="preset-info" style={{ flex: 1 }}>
                    <strong className="preset-name" style={{ fontSize: '0.8rem' }}>Máxima Calidad Original (95%)</strong>
                    <span className="preset-desc" style={{ fontSize: '0.68rem' }}>Resolución nativa completa para archivo e impresión</span>
                  </div>
                  {options.qualityPreset === 'max' && <CheckCircle2 size={16} style={{ color: 'var(--color-brand-light)' }} />}
                </button>

                <button
                  type="button"
                  onClick={() => onChangeOptions({ ...options, qualityPreset: 'social' })}
                  className={`preset-card ${options.qualityPreset === 'social' ? 'active' : ''}`}
                  style={{ padding: '0.65rem 0.75rem', textAlign: 'left' }}
                >
                  <div className={`preset-icon-wrapper ${options.qualityPreset === 'social' ? 'active' : ''}`}>
                    <Zap size={17} />
                  </div>
                  <div className="preset-info" style={{ flex: 1 }}>
                    <strong className="preset-name" style={{ fontSize: '0.8rem' }}>Rápido para WhatsApp y Redes (2048px)</strong>
                    <span className="preset-desc" style={{ fontSize: '0.68rem' }}>Ligero (~400 KB/foto), exportación 3× más rápida en móvil</span>
                  </div>
                  {options.qualityPreset === 'social' && <CheckCircle2 size={16} style={{ color: 'var(--color-brand-light)' }} />}
                </button>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => onStartExport('download')}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', padding: '0.65rem 0.85rem', fontSize: '0.82rem', fontWeight: 700 }}
              >
                <Download size={15} />
                <span>{primaryLabel}</span>
              </button>

              <button
                type="button"
                onClick={() => onStartExport('share')}
                className="btn-secondary"
                style={{ flex: 1, justifyContent: 'center', padding: '0.65rem 0.85rem', fontSize: '0.82rem', fontWeight: 700, borderColor: 'var(--color-brand)' }}
                title="Abrir menú nativo de Android para enviar por WhatsApp, Telegram o Drive"
              >
                <Share2 size={15} style={{ color: 'var(--color-brand-light)' }} />
                <span>Compartir</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-icon">
              <RefreshCw size={36} className="spin-icon" style={{ color: 'var(--color-brand)' }} />
            </div>

            <h3 className="modal-title">Exportando Lote de Fotos...</h3>
            <p className="modal-subtitle">
              Procesando foto <strong>{current}</strong> de <strong>{total}</strong>
            </p>

            {currentName && <p className="current-photo-name">{currentName}</p>}

            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${percentage}%` }} />
            </div>

            <span className="progress-percentage">{percentage}% Completado</span>

            <p className="modal-hint">
              <Sparkles size={14} style={{ color: '#f59e0b', display: 'inline', marginRight: '4px' }} />
              Aplicando revelado, firma y marco digital...
            </p>
          </>
        )}
      </div>
    </div>
  );
};
