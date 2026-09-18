import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command }) => ({
  // Em dev usa './' para funcionar em localhost:5174
  // Em build usa '/clinical/' para funcionar servido via Express em /clinical
  base: command === 'build' ? '/clinical/' : './',
  plugins: [react()],
  resolve: {
    alias: {
      '@optotipo/shared': path.resolve(__dirname, '../shared/src')
    }
  },
  server: {
    host: true,
    port: 5174,
    allowedHosts: true,
    proxy: {
      // Em dev, redireciona chamadas da API para o servidor Express na porta 8765
      '/api': {
        target: 'http://localhost:8765',
        changeOrigin: true,
        secure: false
      },
      '/health': {
        target: 'http://localhost:8765',
        changeOrigin: true,
        secure: false
      }
    }
  }
}));
