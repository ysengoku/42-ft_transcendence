import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    watch: {
      usePolling: true,
    },
  },
  resolve: {
    alias: {
      '@main': path.resolve(__dirname, 'src/main.js'),
      '@router': path.resolve(__dirname, 'src/js/router.js'),
      '@api': path.resolve(__dirname, 'src/js/api/'),
      '@components': path.resolve(__dirname, 'src/js/components/'),
      '@mock': path.resolve(__dirname, 'src/js/mock/'),
      '@utils': path.resolve(__dirname, 'src/js/utils/'),
      '@css': path.resolve(__dirname, 'src/css/'),
    },
  },
});
