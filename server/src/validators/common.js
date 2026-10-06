import { z } from 'zod';

/** ID de MongoDB (24 caracteres hexadecimales). */
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'ID inválido');

/**
 * Enlace opcional: vacío o una URL http(s).
 * Rechazar otros protocolos es importante por seguridad: el portal muestra estos enlaces
 * para hacer clic, y un "javascript:..." ejecutaría código en el navegador de quien lo pulse.
 */
export const optionalLink = z.union([
  z.literal(''),
  z.url({ protocol: /^https?$/, error: 'Debe ser un enlace http(s) válido' }),
]);

/** Clave de Jira: UA-123 */
export const jiraKey = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9]+-\d+$/, 'Formato esperado: UA-123');

export const idParams = z.object({ id: objectId });
