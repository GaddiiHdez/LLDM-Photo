# Registro de Cambios (Changelog) - BereaSnap

Todas las actualizaciones y mejoras notables de BereaSnap están documentadas en este archivo siguiendo el formato de versiones semánticas.

---

## [1.5.0] - 2026-10-22

### ✨ Herramientas Fotográficas Pro
* **Claridad / Micro-contraste**: Nuevo deslizador de textura que realza los detalles de vestiduras, corbatas, templos y arquitectura sagrada sin generar halos ni sobresaturación.
* **Protector de Tono de Piel (*Skin Tone Guard / Piel IA*)**: Algoritmo que aísla el rango cromático facial para evitar que los rostros queden anaranjados al intensificar la calidez del templo.
* **Reducción de Ruido (*Noise Reduction*)**: Filtro bilateral edge-preserving para limpiar grano digital en cultos u oraciones nocturnas con ISO alto.
* **Cuadrícula de Composición (Regla de Tercios 3×3)**: Superposición automática de líneas guía y puntos de intersección dorados al entrar en la pestaña de Encuadre.

### 🔄 Flujo de Trabajo Profesional
* **Deshacer y Rehacer paso a paso (`↺` y `↻`)**: Botones en la barra superior con historial por fotografía y atajos de teclado (`Ctrl+Z`, `Ctrl+Y`). Un gesto completo de slider se registra como un único paso de edición.
* **Presets de Usuario Compartibles (`.json`)**: Botones de Exportar e Importar para compartir estilos de revelado entre los hermanos del equipo de fotografía sin perder calibración.
* **Indicador de Luces Quemadas (*Zebra Blinkies*)**: Rayado diagonal en tiempo real sobre áreas sobreexpuestas ($RGB \ge 252$) para proteger las texturas en túnicas blancas de coro y lámparas del templo.
* **Monitor de Histograma RGB**: Visualización flotante AMOLED de las curvas multiespectrales (canales R, G, B y luminancia) en vivo.

### 📱 Almacenamiento y Exportación
* **Guardado Automático de Sesión (IndexedDB)**: Almacenamiento persistente en segundo plano (debounced 1.5s). Si se cierra la app o entra una llamada, al reabrir BereaSnap aparece la opción de restaurar todo el lote y sus ajustes.
* **Perfiles de Guardado con 1 Toque**:
  * *Máxima Calidad (Original)*: Conserva el 100% de la resolución nativa de la cámara para archivo histórico e impresión (96% calidad).
  * *Optimizado WhatsApp / Redes*: Redimensiona a 2048px al 85% de compresión para evitar que WhatsApp deteriore la calidad de la imagen.

---

## [1.4.0] - 2026-10-22

### 💎 Identidad de Marca
* **Nuevo Icono Oficial B+S**: Monograma flat estilizado en oro imperial cálido sobre fondo negro puro AMOLED, optimizado para visores móviles.

### ⚙️ Automatización EXIF
* **Extracción de Metadatos de Cámara**: Lectura ultrarrápida (< 3ms) de fecha, hora, modelo de cámara y exposición.
* **Clasificación Automática de Cultos**: Detección inteligente de Escuela Dominical, Oración de 5am, 9am, 6pm y Cultos Especiales según el horario de la toma.
* **Fecha Dinámica en Marco Centenario**: Auto-llenado automático de fecha en español y título de servicio en el marco institucional.

---

## [1.3.2] - 2026-10-22

### 🛠️ Correcciones de Diseño
* **Ajuste de Margen Seguro (*Safe Areas*)**: Corrección de barra de estado y padding inferior para dispositivos móviles.
* **Mayor Área de Visualización**: El lienzo ahora ocupa más del 75% de la pantalla sin superposiciones con los controles.

---

## [1.3.1] - 2026-10-21

### 📱 Experiencia Táctil
* **Carrete Integrado**: Desplazamiento horizontal fluido entre miniaturas en pantalla completa.
* **Soporte Offline Completo**: Tipografías locales y recursos empacados sin llamadas externas.

---

## [1.3.0] - 2026-10-21

### 🖤 Rediseño One UI
* **Modo AMOLED Negro Puro**: Interfaz optimizada para pantallas OLED con fondo `#000000`.
* **Diales Táctiles Circulares**: Controles radiales con valor numérico central.
* **Regla Graduada Táctil (*Haptic Ruler*)**: Deslizador milimétrico analógico a 120 FPS.
