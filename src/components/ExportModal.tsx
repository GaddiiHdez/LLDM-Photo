import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  current: number;
  total: number;
  currentName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  current,
  total,
  currentName,
}) => {
  if (!isOpen) return null;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="modal-backdrop">
      <div className="export-modal card-glass">
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
          Aplicando ajustes de luz, marca de agua y marco digital en alta definición...
        </p>
      </div>
    </div>
  );
};
