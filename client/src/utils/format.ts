const LOCALE = 'es-CO';

const dateTime = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
// Las fechas de sprint son "días" (sin hora): el servidor las guarda a medianoche UTC.
// Se formatean en UTC para que en Colombia (UTC-5) no aparezcan como el día anterior.
const dayOnly = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

export function formatDateTime(iso?: string | null) {
  return iso ? dateTime.format(new Date(iso)) : '—';
}

export function formatDay(iso?: string | null) {
  return iso ? dayOnly.format(new Date(iso)) : '—';
}

export function formatSprintDates(start?: string | null, end?: string | null) {
  if (!start && !end) return 'Sin fechas';
  return `${formatDay(start)} – ${formatDay(end)}`;
}

/** 72000 → "1 min 12 s" */
export function formatDuration(ms?: number | null) {
  if (!ms) return '—';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return seconds ? `${minutes} min ${seconds} s` : `${minutes} min`;
}

/** Fecha "YYYY-MM-DD" para los campos <input type="date">. */
export function toDateInput(iso?: string | null) {
  return iso ? iso.slice(0, 10) : '';
}
