import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/') ||
            id.includes('vite/preload-helper') ||
            id.includes('commonjsHelpers')
          ) {
            return 'vendor-react';
          }
          if (
            id.includes('/node_modules/jspdf/') ||
            id.includes('/node_modules/jspdf-autotable/') ||
            id.includes('/node_modules/fflate/') ||
            id.includes('/node_modules/fast-png/') ||
            id.includes('/node_modules/iobuffer/') ||
            id.includes('/node_modules/pako/') ||
            id.includes('/node_modules/html2canvas/') ||
            id.includes('/node_modules/canvg/') ||
            id.includes('/node_modules/rgbcolor/') ||
            id.includes('/node_modules/svg-pathdata/') ||
            id.includes('/node_modules/stackblur-canvas/') ||
            id.includes('/node_modules/raf/') ||
            id.includes('/node_modules/dompurify/') ||
            id.includes('/node_modules/core-js/')
          ) {
            return 'vendor-pdf';
          }
        },
      },
    },
  },
});
