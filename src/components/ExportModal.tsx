import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Sparkles, RefreshCw, Download, Share2, X, CheckCircle2, Zap, ShieldCheck, Images, Image as ImageIcon, FileArchive } from 'lucide-react';
import type { ExportOptions } from '../types/editor';

interface ExportModalProps {
  isOpen: boolean;
  isProcessing: boolean;
  current: number;
  total: number;
  currentPhotoIndex?: number;
  currentName: string;
  options: ExportOptions;
  onChangeOptions: (opts: ExportOptions) => void;
  onStartExport: (mode: 'download' | 'share') => void;
  onSingleExport?: (mode: 'download' | 'share') => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  isProcessing,
  current,
  total,
  currentPhotoIndex = 0,
  currentName,
  options,
  onChangeOptions,
  onStartExport,
  onSingleExport,
  onClose,
}) => {
  const [exportScope, setExportScope] = useState<'single' | 'batch'>('single');

  useEffect(() => {
    if (isOpen && total === 1) {
      setExportScope('single');
    }
  }, [isOpen, total]);

  if (!isOpen) return null;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const isNative = Capacitor.isNativePlatform();
  const delivery = options.deliveryFormat || 'jpg';
  const isBatchMode = total > 1 && exportScope === 'batch';

  const primaryLabel = isBatchMode
    ? delivery === 'zip'
      ? `Guardar ZIP (${total})`
      : isNative
        ? `Guardar ${total} Fotos`
        : `Descargar ${total} JPG`
    : isNative
      ? 'Guardar en Galería'
      : 'Descargar JPG';

  const handleAction = (mode: 'download' | 'share') => {
    if (isBatchMode) {
      onStartExport(mode);
    } else if (onSingleExport) {
      onSingleExport(mode);
      onClose();
    } else {
      onStartExport(mode);
    }
  };

  return (
    <div className="modal-backdrop oneui-sheet-backdrop" onClick={!isProcessing ? onClose : undefined}>
      <div
        className="export-modal oneui-sheet card-glass"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Manija One UI para deslizar o cerrar */}
        <div className="oneui-sheet-handle-row" onClick={onClose} title="Cerrar">
          <div className="oneui-sheet-handle" />
        </div>

        {!isProcessing ? (
          <>
            <div className="oneui-deck-title-row" style={{ marginBottom: '0.65rem' }}>
              <div className="oneui-param-title-group">
                <span className="oneui-param-title" style={{ fontSize: '0.85rem' }}>GUARDAR FOTOGRAFÍA</span>
                <span className="oneui-param-meta-tag">
                  {total} {total === 1 ? 'foto' : 'fotos'}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="oneui-reset-tiny-btn"
                title="Cerrar"
              >
                <X size={13} />
              </button>
            </div>

            {/* SECCIÓN 0: ALCANCE DE GUARDADO (FOTO ACTUAL vs TODO EL LOTE) */}
            {total > 1 && (
              <div className="oneui-segmented-row">
                <button
                  type="button"
                  onClick={() => setExportScope('single')}
                  className={`oneui-segmented-card ${exportScope === 'single' ? 'active' : ''}`}
                >
                  <div className="oneui-segmented-header">
                    <span className="oneui-segmented-title">
                      <ImageIcon size={14} style={{ color: exportScope === 'single' ? '#f59e0b' : 'inherit' }} />
                      Foto Actual ({currentPhotoIndex + 1}/{total})
                    </span>
                    {exportScope === 'single' && <CheckCircle2 size={13} style={{ color: '#f59e0b' }} />}
                  </div>
                  <span className="oneui-segmented-desc">
                    Solo la foto visible en pantalla
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('batch')}
                  className={`oneui-segmented-card ${exportScope === 'batch' ? 'active' : ''}`}
                >
                  <div className="oneui-segmented-header">
                    <span className="oneui-segmented-title">
                      <Images size={14} style={{ color: exportScope === 'batch' ? '#f59e0b' : 'inherit' }} />
                      Todo el Lote ({total})
                    </span>
                    {exportScope === 'batch' && <CheckCircle2 size={13} style={{ color: '#f59e0b' }} />}
                  </div>
                  <span className="oneui-segmented-desc">
                    Procesar las {total} fotos de la sesión
                  </span>
                </button>
              </div>
            )}

            {/* SECCIÓN 1: FORMATO DE ENTREGA (SOLO EN MODO LOTE) */}
            {isBatchMode && (
              <div className="oneui-segmented-row">
                <button
                  type="button"
                  onClick={() => onChangeOptions({ ...options, deliveryFormat: 'jpg' })}
                  className={`oneui-segmented-card ${delivery === 'jpg' ? 'active' : ''}`}
                >
                  <div className="oneui-segmented-header">
                    <span className="oneui-segmented-title">
                      <Images size={14} style={{ color: delivery === 'jpg' ? '#f59e0b' : 'inherit' }} />
                      Fotos JPG
                    </span>
                    {delivery === 'jpg' && <CheckCircle2 size={13} style={{ color: '#f59e0b' }} />}
                  </div>
                  <span className="oneui-segmented-desc">
                    {isNative ? 'Directo a Galería de fotos' : 'Archivos JPG individuales'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeOptions({ ...options, deliveryFormat: 'zip' })}
                  className={`oneui-segmented-card ${delivery === 'zip' ? 'active' : ''}`}
                >
                  <div className="oneui-segmented-header">
                    <span className="oneui-segmented-title">
                      <FileArchive size={14} style={{ color: delivery === 'zip' ? '#f59e0b' : 'inherit' }} />
                      Archivo ZIP
                    </span>
                    {delivery === 'zip' && <CheckCircle2 size={13} style={{ color: '#f59e0b' }} />}
                  </div>
                  <span className="oneui-segmented-desc">
                    Lote comprimido único
                  </span>
                </button>
              </div>
            )}

            {/* SECCIÓN 2: PERFILES DE GUARDADO CON 1 TOQUE (SEGMENTADOS) */}
            <div className="oneui-segmented-row">
              <button
                type="button"
                onClick={() => onChangeOptions({ ...options, qualityPreset: 'max' })}
                className={`oneui-segmented-card ${options.qualityPreset === 'max' ? 'active' : ''}`}
              >
                <div className="oneui-segmented-header">
                  <span className="oneui-segmented-title">
                    <ShieldCheck size={14} style={{ color: options.qualityPreset === 'max' ? '#f59e0b' : 'inherit' }} />
                    Máxima Calidad (Original)
                  </span>
                  {options.qualityPreset === 'max' && <CheckCircle2 size={13} style={{ color: '#f59e0b' }} />}
                </div>
                <span className="oneui-segmented-desc">
                  Archivo histórico e impresión (resolución completa)
                </span>
              </button>

              <button
                type="button"
                onClick={() => onChangeOptions({ ...options, qualityPreset: 'social' })}
                className={`oneui-segmented-card ${options.qualityPreset === 'social' ? 'active' : ''}`}
              >
                <div className="oneui-segmented-header">
                  <span className="oneui-segmented-title">
                    <Zap size={14} style={{ color: options.qualityPreset === 'social' ? '#f59e0b' : 'inherit' }} />
                    Optimizado WhatsApp / Redes
                  </span>
                  {options.qualityPreset === 'social' && <CheckCircle2 size={13} style={{ color: '#f59e0b' }} />}
                </div>
                <span className="oneui-segmented-desc">
                  Comprime el peso sin perder nitidez en WhatsApp
                </span>
              </button>
            </div>

            {/* SECCIÓN 3: PREFIJO DE ARCHIVO COMPACTO */}
            <div className="oneui-dual-input-box" style={{ marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Prefijo:</span>
              <input
                type="text"
                value={options.filenamePrefix}
                onChange={(e) => onChangeOptions({ ...options, filenamePrefix: e.target.value })}
                placeholder="Nombre base..."
                className="oneui-mini-input"
              />
            </div>

            <div className="oneui-chips-row compact" style={{ marginBottom: '0.5rem' }}>
              {['BereaSnap', 'Escuela_Dominical', 'Oracion_7pm', 'Culto_Especial'].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onChangeOptions({ ...options, filenamePrefix: chip })}
                  className={`oneui-chip-btn ${options.filenamePrefix === chip ? 'active' : ''}`}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* BOTONES DE ACCIÓN ONE UI */}
            <div className="oneui-export-actions">
              <button
                type="button"
                onClick={() => handleAction('download')}
                className="oneui-primary-action-btn"
              >
                <Download size={16} />
                <span>{primaryLabel}</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction('share')}
                className="oneui-secondary-action-btn"
                title="Compartir por WhatsApp, Telegram o Drive"
              >
                <Share2 size={16} />
                <span>Compartir</span>
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '1rem 0', textAlign: 'center' }}>
            <div className="modal-icon" style={{ marginBottom: '0.75rem' }}>
              <RefreshCw size={32} className="spin-icon" style={{ color: '#f59e0b', margin: '0 auto' }} />
            </div>

            <h3 className="modal-title" style={{ fontSize: '1rem', marginBottom: '0.2rem' }}>
              Procesando fotografías...
            </h3>
            <p className="modal-subtitle" style={{ fontSize: '0.78rem', marginBottom: '0.65rem' }}>
              Foto <strong>{current}</strong> de <strong>{total}</strong>
            </p>

            {currentName && (
              <p
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.68rem',
                  color: '#94a3b8',
                  marginBottom: '0.6rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentName}
              </p>
            )}

            <div className="progress-bar-container" style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${percentage}%`,
                  background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  borderRadius: '3px',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.45rem', fontSize: '0.72rem', color: '#94a3b8' }}>
              <span>
                <Sparkles size={11} style={{ color: '#f59e0b', display: 'inline', marginRight: 4, verticalAlign: -1 }} />
                Revelado y marco
              </span>
              <strong style={{ color: '#ffffff' }}>{percentage}%</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
