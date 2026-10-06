import { createApp } from './app.js';
import { connectDb, disconnectDb } from './config/db.js';
import { env } from './config/env.js';

// Cualquier error que se escape queda registrado en la terminal en vez de pasar desapercibido.
process.on('unhandledRejection', (error) => console.error('[API] Error no manejado:', error));

try {
  await connectDb(env.MONGODB_URI);
} catch (error) {
  console.error(`No se pudo conectar a MongoDB (${env.MONGODB_URI}): ${error.message}`);
  console.error('¿Está corriendo el servicio? PowerShell: Get-Service MongoDB');
  process.exit(1);
}

const server = createApp().listen(env.PORT, () => {
  console.log(`qa-portal API en http://localhost:${env.PORT}/api (CI: ${env.CI_PROVIDER})`);
});

// Cierre ordenado (Ctrl+C o el sistema detiene el proceso): termina peticiones y cierra Mongo.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  });
}
