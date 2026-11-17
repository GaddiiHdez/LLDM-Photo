# Registro de Cambios (Changelog) - BereaSnap

Todas las actualizaciones y mejoras notables de BereaSnap están documentadas en este archivo siguiendo el formato de versiones semánticas.

---

## [1.8.0] - 2026-11-16

### 📱 Diseño Responsive, Temas y Visor Preciso
* **Modo Horizontal (Landscape) y Portrait Estables**: Panel lateral y rail vertical derecho al girar la pantalla, hoja inferior táctil estable en vertical (`360px+`), objetivos táctiles `>= 44px` y barra de estado nativa sincronizada con **Blanco Galería** y **Negro AMOLED** en todos los paneles.
* **Cuadrícula y Capa Cebra Alineadas al Pixel**: La regla de tercios, el histograma flotante y la alerta de altas luces (`Zebra`) ahora se ajustan exactamente al área visible de la fotografía tras cualquier recorte o zoom.

### 🔁 Historial Completo, Lotes Seguros y EXIF Transparente
* **Deshacer / Rehacer Unificado (hasta 40 pasos)**: Incluye cambios globales de **Marco**, **Texto** y **Logo / Firma**, además de revertir acciones aplicadas a todo el lote con un solo toque en `↺`.
* **Confirmación Previa al Sincronizar Lote**: Antes de copiar luz, color, nitidez y filtro al resto de fotos se muestra un resumen que garantiza conservar intactos los encuadres individuales de cada fotografía.
* **Detección EXIF vs Fecha de Archivo**: Indica claramente si la fecha sugerida proviene de los metadatos EXIF reales de la cámara o de la fecha aproximada del archivo, y solo auto-rellena el marco al abrir una sesión nueva.

### 🎨 Herramientas Más Claras y Miniaturas en Vivo
* **Revelado Agrupado y Accesible**: Parámetros organizados por categorías (*Todos / Luz / Color / Detalle*), regla háptica compatible con teclado/lector de pantalla y botón rápido de reinicio a `0`.
* **Encuadre con Etiquetas y Zoom de Recorte**: Acciones etiquetadas (*Nivelar*, *Girar 90°*, *Espejo*, *Auto IA*, *Al lote*), proporción `Al marco` y control dedicado `Zoom de recorte`.
* **Miniaturas Reales en Filtros**: Previsualización en vivo de *Estilos base* y *Mis filtros* sobre la foto activa.

### 🖼️ Marcos sin Deformación, Logo Visual y Carrete Tactil
* **Marcos Centenario Borde a Borde**: Eliminadas las bandas laterales en recortes `4:5` y similares; incorpora aviso con botón `Adaptar al marco` y zonas laterales seguras alrededor del emblema central.
* **Selector Visual 3×3 para Logo y Nombres Editables**: Renombra marcos o logos propios y posiciona tu marca de agua en una cuadrícula visual.
* **Reordenamiento Accesible en Carrete**: Botones explícitos `←` / `→` junto al arrastre táctil prolongado.

### 💾 Exportación Fiable, Presets JSON y Auto-guardado
* **Resumen de Exportación y Cancelación Limpia**: Muestra ubicación exacta (*Galería › Álbum BereaSnap* o *Documentos/BereaSnap/...*), cantidad procesada y opción de compartir; cancelar el diálogo de compartir conserva el archivo sin falsos errores.
* **Exportación e Importación Nativa de Filtros `.json`**: Respalda y comparte tus filtros personalizados en `Documentos/BereaSnap/` con validación segura.
* **Volcado en Segundo Plano y Validación de Lote**: Guarda borradores al suspender la app y omite archivos vacíos o incompatibles sin interrumpir el resto del lote.

---

## [1.7.0] - 2026-11-15

### 📲 Integración Nativa con Galería Android
* **Compartir desde Galería → BereaSnap**: Ahora puedes seleccionar una o varias fotos directamente en tu Galería o app de Fotos, tocar **Compartir** y elegir **BereaSnap** para abrirlas al instante en el editor conservando sus metadatos EXIF originales.

### 🖼️ Control Total de Marcos y Logo / Firma
* **Sub-pestaña "Logo / Firma" dentro de Marco**: Recupera el control de marca de agua en la interfaz One UI: activa o sube el logotipo PNG de tu iglesia o escribe tu firma en texto, elige esquina o centro y ajusta tamaño y opacidad con un toque.
* **Posición, Tamaño, Color y Visibilidad de Textos en Marco**: En la pestaña de **Marcos**, ahora puedes mover el texto dinámico (*Doble / Centro / Izquierda / Derecha*), cambiar color (*Oro / Blanco / Plata*), escalar tamaño (`70%–140%`), ocultarlo por completo o borrar el texto derecho si tu marco ya incluye texto impreso.

### 🎛️ Comparativa Rápida y Calibración de Color Pro
* **Mantener presionado para ver Original (Hold-to-Compare)**: Deja el dedo presionado sobre la fotografía (sin arrastrar) para ver la imagen original al instante y suelta para volver a tus ajustes.
* **Gotero de Balance de Blancos (`Gotero WB`) + Dial de Matiz (Verde ↔ Magenta)**: Activa el gotero en **Ajustes** y toca una túnica blanca o pared neutra para neutralizar automáticamente luces verdosas o amarillas de auditorios y templos, junto al nuevo dial de **Matiz**.

---

## [1.6.0] - 2026-11-15

### ⚡ Rendimiento, Memoria y Estabilidad en Android
* **Exportación fluida en segundo plano (Web Worker)**: El procesado pesado de luces, sombras, claridad, reducción de ruido y nitidez ahora corre fuera del hilo principal al exportar en alta resolución, evitando que la app se congele con lotes grandes.
* **Auto-guardado incremental de sesión**: Las fotos cargadas se almacenan una sola vez en IndexedDB y solo se actualizan los ajustes ligeros al editar, evitando reescrituras pesadas cada vez que mueves un slider.
* **Apertura más ligera para lotes y archivos RAW**: Los archivos `.NEF`, `.CR2`, `.ARW` y `.DNG` ahora se leen por bloques de 4 MB sin duplicar copias en RAM, y la importación múltiple limita la concurrencia (2–3 fotos a la vez) para prevenir cierres por falta de memoria.
* **Limpieza automática de memoria y caché**: Se liberan buffers temporales tras exportar, cachés de vista previa al borrar fotos o salir, y archivos temporales de compartición en Android.

### 🎨 Mejoras de Interfaz y Calidad
* **Confirmación One UI al cerrar sesión**: Al volver al inicio se muestra una hoja inferior estilo AMOLED en lugar de la alerta genérica del navegador, y las notificaciones de filtros ahora usan toasts integrados.
* **Detección exacta de cambios ("Revertir")**: Corregido el estado inicial de modificación provocado por *Skin Tone Guard*, permitiendo restaurar la foto exactamente a valores neutros.
* **Arquitectura modular y pruebas automáticas**: Panel de herramientas dividido por pestañas y nueva suite de pruebas unitarias para validaciones clave.

---

## [1.5.4] - 2026-10-25

### 🎨 Barra Superior y Ventana de Guardado Rediseñadas
* **Barra superior sin desbordamiento**: Se compactaron los botones (atrás, deshacer, rehacer, contador, ojo, Guardar, Compartir y menú ⋮) para que quepan completos en pantallas de teléfono. "Revertir" ya no ocupa espacio en la barra en móvil: ahora está dentro del menú ⋮ como "Revertir foto original".
* **Botón Compartir visible**: El icono de compartir ahora se muestra siempre en la barra, con tamaño táctil normal.
* **Ventana de guardado unificada**: Al tocar "Guardar" se abre una sola hoja inferior con el mismo diseño One UI del resto de la app, donde eliges "Foto actual" o "Todo el lote", calidad, formato (JPG/ZIP) y prefijo. Se eliminó la ventana intermedia y el botón "Cancelar" que rompía la estética; se cierra con la manija, la X o tocando fuera.

---

## [1.5.3] - 2026-10-25

### 🩹 Corrección de Renderizado del Menú de Guardado (Hotfix)
* **Renderizado en Pantalla Completa (React Portal)**: Se corrigió el fallo donde el menú de selección de guardado ("¿Qué deseas guardar?") quedaba atrapado y recortado dentro de los 52px de la barra superior debido al filtro de desenfoque (`backdrop-filter`) del encabezado. Ahora se inyecta directamente en la raíz de la pantalla (`document.body`), desplegándose limpiamente como una hoja inferior completa estilo Samsung One UI en la parte baja del teléfono.

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
