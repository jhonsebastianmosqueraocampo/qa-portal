// Construye la aplicación Express (sin arrancarla). Separarla de server.js permite
// usarla en las pruebas automatizadas sin abrir un puerto real.
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { router } from './routes/index.js';

export function createApp() {
  const app = express();

  // Detrás de un proxy (Nginx, balanceador) para que la IP real llegue al rate limit.
  app.set('trust proxy', 1);

  app.use(helmet()); // cabeceras HTTP de seguridad
  app.use(
    cors({
      origin: env.CORS_ORIGIN, // solo el frontend del portal puede llamar a la API
      credentials: true, // permite enviar la cookie de sesión
    }),
  );
  app.use(express.json({ limit: '2mb' })); // resultados con miles de pruebas caben de sobra
  app.use(cookieParser());

  app.use('/api', router);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
