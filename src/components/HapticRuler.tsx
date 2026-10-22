import React, { useRef, useCallback } from 'react';

interface HapticRulerProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  accentColor?: string;
  formatValue?: (val: number) => string;
}

/**
 * Regla graduada táctil analógica (Haptic Ruler Slider) inspirada en Samsung One UI.
 * Permite deslizar con el pulgar o ratón a 60-120fps sobre marcas verticales con indicador central.
 */
export const HapticRuler: React.FC<HapticRulerProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  accentColor = '#f59e0b',
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
      const tickColor = isZero
        ? accentColor
        : isMajor
        ? 'rgba(255, 255, 255, 0.75)'
        : isMedium
        ? 'rgba(255, 255, 255, 0.45)'
        : 'rgba(255, 255, 255, 0.22)';

      ticks.push(
        <div
          key={i}
          className="ruler-tick-mark"
          style={{
            height: `${tickHeight}px`,
            backgroundColor: isOutOfBounds ? 'transparent' : tickColor,
            width: isZero ? '2.5px' : isMajor ? '1.5px' : '1px',
            borderRadius: '1px',
            opacity: Math.max(0.15, 1 - Math.abs(i) / (half + 2)),
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

  return (
    <div
      ref={containerRef}
      className="oneui-haptic-ruler"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={() => onChange(0)}
      title="Desliza con el pulgar para calibrar • Doble toque para volver a 0"
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
