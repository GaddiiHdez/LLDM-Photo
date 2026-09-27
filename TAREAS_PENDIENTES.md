# 📋 Tareas Pendientes y Hoja de Ruta — LLDM Photo Studio PRO

Documento de seguimiento de mejoras técnicas, optimizaciones de rendimiento y características planificadas para futuras versiones de la aplicación.

---

## ⚡ 1. Rendimiento & Motor Gráfico (Alta Prioridad)

### 🚀 Optimización del Motor de Lienzo para Dispositivos de Gama de Entrada
- [ ] **Migración a `OffscreenCanvas` en Web Worker**:
  - Mover las operaciones de procesamiento y renderizado de canvas fuera del hilo principal (Main UI Thread) hacia un Web Worker secundario.
  - Esto garantiza que la interfaz de usuario, los gestos táctiles y las animaciones permanezcan a 60–120 FPS sin importar la carga de procesamiento de la imagen.
- [ ] **Arquitectura de Drag basada en CSS Transform con Commit Diferido**:
  - Durante el arrastre o pellizco en tiempo real, transformar la posición y escala visual del contenedor con `transform: translate3d(...) scale(...)` acelerado al 100% por el Compositor de la GPU.
  - Ejecutar el redibujado de la matriz gráfica del canvas únicamente al levantar los dedos (`touchend` / `mouseup`).
- [ ] **Pipeline de Shaders WebGL / WebGPU**:
  - Implementar shaders GLSL para filtros de exposición, brillo, contraste, temperatura, sombras y altas luces.
  - El cálculo pixel por pixel se ejecutará en paralelo en los núcleos de la GPU del celular en microsegundos, eliminando cualquier cuello de botella en CPU para teléfonos de gama baja o media.

---

## 🎨 2. Interfaz y Experiencia de Usuario (UI/UX)

- [ ] **Soporte para Gestos de Rotación (Giro con dos dedos)**:
  - Permitir rotar libremente o nivelar horizontes torcidos con dos dedos sobre la pantalla.
- [ ] **Guías de Composición Superpuestas (Regla de Tercios / Sección Áurea)**:
  - Opción para activar una cuadrícula translúcida al arrastrar para facilitar el encuadre fotográfico profesional.
- [ ] **Historial de Deshacer / Rehacer (Undo / Redo)**:
  - Botones y atajos `Ctrl+Z` / `Ctrl+Y` para revertir ajustes y encuadres aplicados por error.

---

## 📦 3. Procesamiento en Lote y Exportación

- [ ] **Opciones de Compresión y Formato en la Exportación**:
  - Selector de calidad JPEG (80%, 90%, 100%) y soporte para exportar en WebP para reducir peso de descarga.
- [ ] **Renombrado Inteligente de Lote**:
  - Posibilidad de definir un prefijo común (ej. `Culto_Dominical_01.jpg`, `Culto_Dominical_02.jpg`).

---

*Última actualización: 26 de Septiembre, 2026*
