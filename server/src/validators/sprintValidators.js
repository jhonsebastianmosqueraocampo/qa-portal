import { z } from 'zod';
import { jiraKey, objectId, optionalLink } from './common.js';

// Fecha de sprint (un "día"): se normaliza a medianoche UTC, que es como se comparan los estados.
const day = z.coerce
  .date({ error: 'Fecha inválida' })
  .transform(
    (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())),
  );

const sprintFields = {
  number: z.coerce.number().int().min(1).max(999),
  name: z.string().trim().min(1).max(100),
  // El estado no se envía: se calcula con estas fechas (ver utils/sprintStatus.js).
  startDate: day,
  endDate: day,
  links: z
    .object({
      testDesign: optionalLink.optional(),
      testExecution: optionalLink.optional(),
      regressionSummary: optionalLink.optional(),
    })
    .optional(),
};

const checkDates = (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate;
const datesMessage = {
  message: 'La fecha de fin debe ser posterior a la de inicio',
  path: ['endDate'],
};

export const createSprintBody = z.object(sprintFields).refine(checkDates, datesMessage);

// En una actualización todos los campos son opcionales (PATCH = cambio parcial).
export const updateSprintBody = z
  .object(sprintFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Envía al menos un campo')
  .refine(checkDates, datesMessage);

/** Filtros de la lista de sprints: estado y búsqueda general (sprint o tarea). */
export const listSprintsQuery = z.object({
  status: z.enum(['planned', 'active', 'closed']).optional(),
  q: z.string().trim().max(100).optional(),
});

const taskFields = {
  key: jiraKey,
  title: z.string().trim().min(1).max(300),
  jiraUrl: optionalLink.optional(),
};

export const createTaskBody = z.object(taskFields);

export const updateTaskBody = z
  .object(taskFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Envía al menos un campo');

export const taskParams = z.object({ id: objectId, taskId: objectId });

/** Resultado de la prueba manual de una tarea. */
export const manualResultBody = z.object({
  result: z.enum(['pending', 'passed', 'failed']),
  comment: z.string().trim().max(500).optional(),
});
