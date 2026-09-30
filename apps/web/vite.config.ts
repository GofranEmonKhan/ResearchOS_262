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
      '/messages': 'http://localhost:3001',
      '/papers': 'http://localhost:3001',
      '/collections': 'http://localhost:3001',
      '/experiments': 'http://localhost:3001',
      '/forum': 'http://localhost:3001',
      '/leaderboard': 'http://localhost:3001',
      '/users': 'http://localhost:3001',
      '/manuscripts': 'http://localhost:3001',
      '/sections': 'http://localhost:3001',
      '/citations': 'http://localhost:3001',
      '/api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
