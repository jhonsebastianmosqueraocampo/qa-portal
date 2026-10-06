import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export const AUTH_COOKIE = 'qa_portal_session';

/**
 * Opciones de la cookie de sesión:
 * - httpOnly: JavaScript del navegador no puede leerla (protege contra robo por XSS).
 * - sameSite strict: el navegador no la envía en peticiones iniciadas desde otros sitios
 *   (protege contra CSRF).
 * - secure: solo viaja por HTTPS (activar en producción con COOKIE_SECURE=true).
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.COOKIE_SECURE,
    maxAge: env.JWT_EXPIRES_HOURS * 60 * 60 * 1000,
    path: '/',
  };
}

export function signSession(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: `${env.JWT_EXPIRES_HOURS}h`,
  });
}

/** Exige sesión válida. Deja el usuario en req.user. */
export async function requireAuth(req, _res, next) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) throw new AppError(401, 'Inicia sesión para continuar');

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new AppError(401, 'Tu sesión expiró. Inicia sesión de nuevo');
  }

  // Se consulta el usuario para que desactivarlo surta efecto de inmediato.
  const user = await User.findById(payload.sub);
  if (!user || !user.active) throw new AppError(401, 'Usuario no autorizado');

  req.user = user;
  next();
}

/** Exige uno de los roles indicados. Usar después de requireAuth. */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role)) throw new AppError(403, 'No tienes permiso para esto');
    next();
  };
}
