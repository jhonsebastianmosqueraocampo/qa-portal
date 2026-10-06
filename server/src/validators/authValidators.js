import { z } from 'zod';

export const loginBody = z.object({
  email: z.email('Correo inválido').trim().toLowerCase(),
  password: z.string().min(1, 'La contraseña es obligatoria').max(200),
});
