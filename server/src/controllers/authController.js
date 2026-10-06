import { AUTH_COOKIE, sessionCookieOptions, signSession } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export async function login(req, res) {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');

  // Mismo mensaje si el correo no existe o la contraseña es incorrecta:
  // así no se revela qué correos están registrados.
  if (!user || !user.active || !(await user.checkPassword(password))) {
    throw new AppError(401, 'Correo o contraseña incorrectos');
  }

  res.cookie(AUTH_COOKIE, signSession(user), sessionCookieOptions());
  res.json({ user });
}

export function logout(_req, res) {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(AUTH_COOKIE, options);
  res.status(204).end();
}

export function me(req, res) {
  res.json({ user: req.user });
}
