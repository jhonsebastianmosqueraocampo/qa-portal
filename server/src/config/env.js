// Lee y valida las variables de entorno UNA vez al arrancar.
// Si falta algo o tiene un formato inválido, el servidor no arranca y dice exactamente qué
// corregir. Es mucho mejor que descubrirlo a mitad de una petición.
import 'dotenv/config';
import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    // Zona horaria de la empresa: define cuándo un sprint pasa a activo o finalizado
    APP_TIMEZONE: z.string().default('America/Bogota'),
    MONGODB_URI: z.string().startsWith('mongodb', 'Debe ser una URI de MongoDB'),

    // Autenticación
    JWT_SECRET: z.string().min(32, 'Usa al menos 32 caracteres aleatorios'),
    JWT_EXPIRES_HOURS: z.coerce.number().int().positive().default(8),
    COOKIE_SECURE: booleanString, // true en producción (solo HTTPS)

    // Origen permitido del frontend (CORS)
    CORS_ORIGIN: z.url().default('http://localhost:5173'),

    // Proveedor de CI que ejecuta las pruebas: "mock" (simulado, para desarrollo) o "gitlab"
    CI_PROVIDER: z.enum(['mock', 'gitlab']).default('mock'),
    GITLAB_API_URL: z.url().default('https://gitlab.com/api/v4'),
    GITLAB_PROJECT_ID: z.string().optional(),
    GITLAB_TRIGGER_TOKEN: z.string().optional(),
    GITLAB_REF: z.string().default('main'),

    // Token compartido con el pipeline para recibir resultados
    CI_RESULTS_TOKEN: z.string().min(32, 'Usa al menos 32 caracteres aleatorios'),
  })
  .superRefine((env, ctx) => {
    if (env.CI_PROVIDER === 'gitlab') {
      for (const key of ['GITLAB_PROJECT_ID', 'GITLAB_TRIGGER_TOKEN']) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: 'Obligatoria con CI_PROVIDER=gitlab',
          });
        }
      }
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`Configuración inválida. Revisa tu archivo .env:\n${problems}`);
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
