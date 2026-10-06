import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/** Ruta inexistente → 404 en JSON (no la página HTML por defecto de Express). */
export function notFound(req, _res, next) {
  next(new AppError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

/**
 * Manejo centralizado de errores: TODA respuesta de error tiene la misma forma
 *   { error: { message, details? } }
 * así el frontend los muestra siempre igual. Express 5 envía aquí automáticamente
 * los errores de funciones async (no hace falta try/catch en cada controlador).
 * Express lo reconoce como manejador de errores porque recibe 4 parámetros.
 */
export function errorHandler(err, _req, res, _next) {
  let status = 500;
  let message = 'Error interno del servidor';
  let details;

  if (err instanceof AppError) {
    ({ status, message, details } = err);
  } else if (err instanceof ZodError) {
    status = 400;
    message = 'Datos inválidos';
    details = err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Valor inválido para ${err.path}`;
  } else if (err?.code === 11000) {
    status = 409;
    message = `Ya existe un registro con ese ${Object.keys(err.keyValue || {}).join(', ')}`;
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'El cuerpo de la petición no es JSON válido';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    message = 'La petición es demasiado grande';
  }

  // Los errores inesperados se registran completos en el servidor, pero al cliente solo
  // le llega un mensaje genérico (no se exponen detalles internos).
  if (status >= 500 && env.NODE_ENV !== 'test') console.error(err);

  res.status(status).json({ error: { message, ...(details && { details }) } });
}
