// El estado de un sprint se CALCULA con sus fechas (no se edita a mano):
//   pendiente  → hoy es antes de la fecha de inicio
//   activo     → hoy está entre inicio y fin (ambos incluidos)
//   finalizado → hoy es después de la fecha de fin
//
// Las fechas de sprint son "días": se guardan como medianoche UTC (2026-10-06T00:00:00Z).
// "Hoy" se calcula en la zona horaria de la empresa (Colombia por defecto), no en la del
// servidor, para que el sprint cambie de estado a la medianoche de Bogotá.
import { env } from '../config/env.js';

export const SPRINT_STATUSES = ['planned', 'active', 'closed'];

/** Hoy (en la zona horaria de la empresa) como Date a medianoche UTC, igual que las fechas de sprint. */
export function today(now = new Date()) {
  // en-CA formatea como YYYY-MM-DD
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: env.APP_TIMEZONE }).format(now);
  return new Date(`${day}T00:00:00.000Z`);
}

export function computeSprintStatus(startDate, endDate, now = new Date()) {
  const current = today(now);
  if (!startDate || current < startDate) return 'planned';
  if (endDate && current > endDate) return 'closed';
  return 'active';
}

/** Filtro de MongoDB equivalente a computeSprintStatus, para buscar sprints por estado. */
export function sprintStatusFilter(status, now = new Date()) {
  const current = today(now);
  switch (status) {
    case 'planned':
      return { $or: [{ startDate: null }, { startDate: { $gt: current } }] };
    case 'active':
      return {
        startDate: { $lte: current },
        $or: [{ endDate: null }, { endDate: { $gte: current } }],
      };
    case 'closed':
      return { endDate: { $lt: current } };
    default:
      return {};
  }
}
