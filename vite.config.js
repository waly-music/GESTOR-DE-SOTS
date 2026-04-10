import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: https://usuario.github.io/GESTOR-DE-SOTS/
// - `npm run build:gh` → base GH (por defecto en build).
// - `npm run build` → `--base=/` para Firebase en raíz.
// En `vite dev`, base `/` para abrir http://localhost:5173/
const GH_PAGES_BASE = '/GESTOR-DE-SOTS/';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : GH_PAGES_BASE,
  plugins: [react()],
  worker: {
    format: 'es',
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
}));
