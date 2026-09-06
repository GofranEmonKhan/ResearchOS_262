import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/health': 'http://localhost:3001',
      '/me': 'http://localhost:3001',
      '/profiles': 'http://localhost:3001',
      '/supervisor-verification': 'http://localhost:3001',
      '/admin': 'http://localhost:3001',
      '/projects': 'http://localhost:3001',
      '/invites': 'http://localhost:3001',
      '/milestones': 'http://localhost:3001',
      '/tasks': 'http://localhost:3001',
      '/notifications': 'http://localhost:3001',
    },
  },
});
