# Registro de Cambios (Changelog) - BereaSnap

Todas las actualizaciones y mejoras notables de BereaSnap están documentadas en este archivo siguiendo el formato de versiones semánticas.

---

## [1.5.2] - 2026-10-25

### 🩹 Correcciones Críticas de Experiencia y Usabilidad Móvil
* **Barra Superior Optimizada (Cero Desbordamiento)**: Se rediseñó el espaciado y tamaño de los controles en la barra de navegación superior. En pantallas móviles compactas se oculta el texto secundario de "Revertir" (manteniendo su icono activo) y se protege la prioridad de los botones de la derecha, evitando que el botón "Guardar" o el menú de opciones (⋮) queden recortados o fuera de la pantalla.
* **Menú Inteligente de Guardado (Foto Actual vs Todo el Lote)**: Al presionar el botón "Guardar" teniendo más de una fotografía en la sesión, ahora se despliega una hoja inferior táctil (One UI Save Sheet) que te permite elegir con claridad entre guardar únicamente la fotografía activa o exportar el lote completo con sus ajustes a la Galería o ZIP. Si solo tienes una foto cargada, se guarda al instante con un solo toque.
* **Gesto Táctil de Desplazamiento Fluido en el Carrete de Sesión**: Se solucionó la restricción táctil que impedía deslizar horizontalmente con el dedo a través de las miniaturas del carrete. Ahora puedes navegar con total suavidad con un toque y desplazamiento natural hasta la última foto de la sesión, reservando la pulsación prolongada (450ms) únicamente para reordenar fotos.
* **Centrado Automático de Fotografía Activa**: Al cambiar de foto o tocar un elemento en el carrete, la miniatura correspondiente se desplaza suavemente al centro de la vista sin tener que buscarla manualmente.

---

## [1.5.1] - 2026-10-22

### 📲 Actualizaciones Integradas Directas (In-App OTA)
* **Descarga e Instalación Dentro de la App**: La actualización ahora se descarga y gestiona 100% dentro de BereaSnap mediante un canal nativo seguro, sin necesidad de abrir el navegador web ni redirigir a pestañas externas.
* **Monitor de Progreso en Vivo**: Nueva tarjeta One UI con barra de progreso animada, porcentaje exacto (`%`) y conteo de MB descargados en tiempo real.
* **Apertura Automática del Instalador Android**: Al concluir la descarga al 100%, se invoca de inmediato el instalador de paquetes del sistema operativo mediante `FileProvider`, con botón para reabrir el instalador si el aviso se cerró accidentalmente.
* **Rediseño Visual One UI de Actualizaciones**: Modal rediseñado con fondo negro puro AMOLED, tarjeta de comparación de versiones, distintivo dorado de novedades y formato tipográfico limpio y estructurado.

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
