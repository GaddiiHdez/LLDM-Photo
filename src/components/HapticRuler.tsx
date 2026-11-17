import React, { useRef, useCallback } from 'react';

interface HapticRulerProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  accentColor?: string;
  formatValue?: (val: number) => string;
  ariaLabel?: string;
}

/**
 * Regla graduada táctil analógica (Haptic Ruler Slider) inspirada en Samsung One UI.
 * Permite deslizar con el pulgar o teclado a 60-120fps sobre marcas verticales con indicador central.
 */
export const HapticRuler: React.FC<HapticRulerProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  accentColor = '#f59e0b',
  formatValue,
  ariaLabel = 'Ajuste de parámetro',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startValRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sensibilidad: cuántos píxeles de arrastre representan 1 unidad de valor
  const pixelsPerUnit = 4.2;

  const clampValue = useCallback((val: number): number => {
    const clamped = Math.max(min, Math.min(max, val));
    const inv = 1 / step;
    return Math.round(clamped * inv) / inv;
  }, [min, max, step]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startValRef.current = value;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // Feedback háptico en móviles
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    // Arrastrar a la derecha aumenta el valor, a la izquierda lo reduce
    const deltaVal = (dx / pixelsPerUnit) * step;
    const newVal = clampValue(startValRef.current + deltaVal);
    if (newVal !== value) {
      onChangeRef.current(newVal);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignorar si ya se soltó
    }
  };

  // Generar marcas de la regla alrededor del valor actual
  const renderTicks = () => {
    const tickCount = 41; // Número de marcas visibles en la ventana de la regla
    const half = Math.floor(tickCount / 2);
    const ticks: React.ReactNode[] = [];

    // Desplazamiento fino continuo del carrusel de marcas
    const unitOffset = (value - Math.round(value / step) * step) * pixelsPerUnit;

    for (let i = -half; i <= half; i++) {
      const markVal = Math.round(value / step) * step + i * step;
      const isOutOfBounds = markVal < min || markVal > max;
      const isZero = markVal === 0;
      const isMajor = Math.abs(markVal) % 10 === 0 || (step < 1 && Math.abs(markVal * 10) % 5 === 0);
      const isMedium = !isMajor && (Math.abs(markVal) % 5 === 0 || (step < 1 && Math.abs(markVal * 10) % 2 === 0));

      const tickHeight = isZero ? 24 : isMajor ? 18 : isMedium ? 12 : 7;
      const tickColor = isZero ? accentColor : 'var(--oneui-text)';
      const tickContrast = isZero ? 1 : isMajor ? 0.78 : isMedium ? 0.48 : 0.26;
      const distFade = Math.max(0.18, 1 - Math.abs(i) / (half + 2));

      ticks.push(
        <div
          key={i}
          className="ruler-tick-mark"
          style={{
            height: `${tickHeight}px`,
            backgroundColor: isOutOfBounds ? 'transparent' : tickColor,
            width: isZero ? '2.5px' : isMajor ? '1.5px' : '1px',
            borderRadius: '1px',
            opacity: tickContrast * distFade,
          }}
        />
      );
    }

    return (
      <div
        className="ruler-ticks-track"
        style={{
          transform: `translateX(${-unitOffset}px)`,
        }}
      >
        {ticks}
      </div>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const bigStep = Math.max(step, (max - min) >= 100 ? step * 5 : step * 2);
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      next = clampValue(value + step);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      next = clampValue(value - step);
    } else if (e.key === 'PageUp') {
      next = clampValue(value + bigStep);
    } else if (e.key === 'PageDown') {
      next = clampValue(value - bigStep);
    } else if (e.key === 'Home') {
      next = min;
    } else if (e.key === 'End') {
      next = max;
    } else if (e.key === '0') {
      next = 0;
    }
    if (next !== null) {
      e.preventDefault();
      if (next !== value) {
        onChangeRef.current(next);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={formatValue ? formatValue(value) : String(value)}
      className="oneui-haptic-ruler"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      onDoubleClick={() => onChange(0)}
      title="Desliza con el pulgar o usa flechas • Doble toque para volver a 0"
    >
      {/* Indicador Central Fijo (Aguja amarilla One UI) */}
      <div className="ruler-center-needle" style={{ backgroundColor: accentColor }} />

      {/* Riel de Marcas Desplazable */}
      <div className="ruler-viewport">{renderTicks()}</div>

      {/* Punto de apoyo neutro en 0 */}
      {value === 0 && <span className="ruler-zero-dot" style={{ backgroundColor: accentColor }} />}
    </div>
  );
};
