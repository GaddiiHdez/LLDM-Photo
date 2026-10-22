export interface ChurchEventClassification {
  eventTitle: string;
  formattedDate: string; // Ej: "22 de Octubre, 2026"
  fullDateString: string; // Ej: "Jueves, 22 de Octubre de 2026"
  shortDateString: string; // Ej: "22 Oct 2026"
  dayOfWeekName: string;
  day: number;
  monthName: string;
  year: number;
}

const SPANISH_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const SPANISH_DAYS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

/**
 * Clasifica de forma inteligente el servicio o evento eclesiástico basándose
 * en el día de la semana y la hora de captura extraída de los metadatos EXIF.
 */
export function classifyChurchEvent(dateInput?: Date | null): ChurchEventClassification {
  const date = dateInput && !isNaN(dateInput.getTime()) ? dateInput : new Date();

  const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeDecimal = hours + minutes / 60;

  let eventTitle = 'Culto Especial';

  if (dayOfWeek === 0) {
    // --- DOMINGO ---
    if (timeDecimal >= 6.5 && timeDecimal < 14.0) {
      eventTitle = 'Escuela Dominical';
    } else if (timeDecimal >= 16.5 && timeDecimal <= 22.0) {
      eventTitle = 'Oración 7pm';
    } else {
      eventTitle = 'Escuela Dominical';
    }
  } else if (dayOfWeek === 6) {
    // --- SÁBADO ---
    if (timeDecimal >= 4.5 && timeDecimal < 7.0) {
      eventTitle = 'Oración 5am';
    } else if (timeDecimal >= 8.5 && timeDecimal < 11.0) {
      eventTitle = 'Oración 9am';
    } else if (timeDecimal >= 15.5 && timeDecimal <= 21.5) {
      eventTitle = 'Reunión de Jóvenes';
    } else {
      eventTitle = 'Culto Especial';
    }
  } else {
    // --- LUNES A VIERNES ---
    if (timeDecimal >= 4.5 && timeDecimal < 7.0) {
      eventTitle = 'Oración 5am';
    } else if (timeDecimal >= 8.5 && timeDecimal < 11.0) {
      eventTitle = 'Oración 9am';
    } else if (timeDecimal >= 17.0 && timeDecimal <= 21.5) {
      eventTitle = 'Oración 7pm';
    } else if (timeDecimal >= 11.0 && timeDecimal < 17.0) {
      eventTitle = 'Estudio Bíblico';
    } else {
      eventTitle = 'Oración 7pm';
    }
  }

  const day = date.getDate();
  const monthName = SPANISH_MONTHS[date.getMonth()];
  const year = date.getFullYear();

  // Formato estándar para el marco Centenario ("22 de Octubre, 2026")
  const formattedDate = `${day} de ${monthName}, ${year}`;
  const fullDateString = `${SPANISH_DAYS[dayOfWeek]}, ${day} de ${monthName} de ${year}`;
  const shortDateString = `${day} ${monthName.slice(0, 3)} ${year}`;

  return {
    eventTitle,
    formattedDate,
    fullDateString,
    shortDateString,
    dayOfWeekName: SPANISH_DAYS[dayOfWeek],
    day,
    monthName,
    year,
  };
}

/**
 * Devuelve la fecha formateada en español para el marco Centenario
 */
export function formatFrameDate(dateInput?: Date | null): string {
  const c = classifyChurchEvent(dateInput);
  return c.formattedDate;
}
