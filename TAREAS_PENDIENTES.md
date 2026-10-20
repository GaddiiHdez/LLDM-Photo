# 📋 Hoja de Ruta y Tareas — BereaSnap Android

Seguimiento de optimizaciones y características planificadas para las siguientes versiones de **BereaSnap**.

---

## ✅ Implementado en BereaSnap v1.1.0

- [x] **Rediseño UX/UI 2.0 Móvil**:
  - Deck de herramientas ergonómico de 2 filas horizontales con cero scroll vertical.
  - Carrete filmstrip persistente (50px) bajo el lienzo.
  - Botón de sustitución directa de fotografía conservando ajustes en lote.
  - Vista de cuadrícula completa de lote (`⊞ Lote`).
  - Gestos táctiles de deslizamiento (Swipe con 1 dedo) y zoom a 60 FPS (Pinch con 2 dedos).
- [x] **Empaquetado Nativo Android con Capacitor**:
  - Pipeline de compilación automática de APK en GitHub Actions.
  - Funcionamiento 100% offline sin servidores ni costos de alojamiento.
  - Fuentes, iconos y marcos integrados localmente en los assets.
- [x] **Sistema de Actualización In-App (APK Updater)**:
  - Detección automática de nuevas versiones desde GitHub Releases.
  - Modal informativo con notas de la versión y descarga directa del APK.
- [x] **Adopción de Versionado Semántico (SemVer)**:
  - Estándar `MAJOR.MINOR.PATCH` coordinado entre `package.json`, Gradle y GitHub Actions.
- [x] **Documentación y Organización del Repositorio**:
  - `README.md` reescrito con arquitectura, badges y guías de desarrollo.

---

## 🚀 Próximas Versiones (v1.2.0+)

### ⚡ 1. Rendimiento & Motor Gráfico
- [ ] **Migración a `OffscreenCanvas` en Web Worker**:
  - Mover el procesamiento intensivo de imágenes grandes (24-45 megapíxeles) fuera del hilo principal para garantizar fluidez absoluta durante la exportación.
- [ ] **Aceleración por GPU (WebGL Shaders)**:
  - Shaders para ajustes de balance de blancos, contraste y exposición en tiempo real en microsegundos.

### 📦 2. Exportación y Almacenamiento
- [ ] **Selector de Compresión y Formato**:
  - Opciones de calidad JPEG (85%, 95%, 100%) y exportación alternativa en formato WebP para ahorrar espacio.
- [ ] **Renombrado Inteligente de Lote**:
  - Plantillas de nombre personalizadas para eventos (ej. `Escuela_Dominical_2026_01.jpg`).
- [ ] **Integración con Android MediaStore**:
  - Guardado directo en el álbum fotográfico del dispositivo con nombre de álbum `BereaSnap`.

---

*Actualizado: Octubre 2026 — BereaSnap v1.1.0*
