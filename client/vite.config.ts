import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // MUI pesa ~700 kB sin comprimir (~220 kB gzip): aceptable para una herramienta interna.
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 5173,
    // En desarrollo, Vite reenvía /api al backend. Para el navegador todo sale del mismo
    // origen (localhost:5173), así la cookie de sesión funciona sin configurar nada extra.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
