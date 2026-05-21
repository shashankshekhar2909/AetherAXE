import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const hmrDisabled = process.env.DISABLE_HMR === 'true';
  const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT || '0') || undefined;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: hmrDisabled
        ? false
        : {
            clientPort: hmrClientPort,
          },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: hmrDisabled ? null : {},
    },
  };
});
