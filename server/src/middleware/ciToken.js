import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/**
 * Protege el endpoint que recibe resultados del pipeline.
 * El pipeline envía "Authorization: Bearer <CI_RESULTS_TOKEN>" (secreto compartido).
 */
export function requireCiToken(req, _res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  // timingSafeEqual compara en tiempo constante: evita adivinar el token midiendo
  // cuánto tarda la respuesta. Requiere buffers del mismo tamaño, por eso se comparan hashes.
  const hash = (value) => crypto.createHash('sha256').update(value).digest();
  if (!token || !crypto.timingSafeEqual(hash(token), hash(env.CI_RESULTS_TOKEN))) {
    throw new AppError(401, 'Token de CI inválido');
  }
  next();
}
