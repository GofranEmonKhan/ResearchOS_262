import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const apiProxy = {
  target: 'http://localhost:3001',
  bypass: (req: any) => {
    if (req.headers?.accept?.includes('text/html')) {
      return '/index.html';
    }
  },
};

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
      '/health': apiProxy,
      '/me': apiProxy,
      '/profiles': apiProxy,
      '/supervisor-verification': apiProxy,
      '/admin': apiProxy,
      '/projects': apiProxy,
      '/invites': apiProxy,
      '/milestones': apiProxy,
      '/tasks': apiProxy,
      '/notifications': apiProxy,
      '/messages': apiProxy,
      '/papers': apiProxy,
      '/collections': apiProxy,
      '/experiments': apiProxy,
      '/forum': apiProxy,
      '/leaderboard': apiProxy,
      '/users': apiProxy,
      '/manuscripts': apiProxy,
      '/sections': apiProxy,
      '/citations': apiProxy,
      '/ai': apiProxy,
      '/community': apiProxy,
      '/api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/api/, ''),
        bypass: (req: any) => {
          if (req.headers?.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
    },
  },
});
