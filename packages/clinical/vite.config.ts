import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@optotipo/shared': path.resolve(__dirname, '../shared/src')
    }
  },
  server: {
    host: true,
    port: 5174,
    allowedHosts: true
  }
});

