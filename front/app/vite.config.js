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
      '@socket': path.resolve(__dirname, 'src/js/socket.js'),
      '@api': path.resolve(__dirname, 'src/js/api/'),
      '@components': path.resolve(__dirname, 'src/js/components/'),
      '@auth': path.resolve(__dirname, 'src/js/auth/'),
      '@utils': path.resolve(__dirname, 'src/js/utils/'),
      '@mock': path.resolve(__dirname, 'src/js/mock/'),
      '@css': path.resolve(__dirname, 'src/css/'),
    },
  },
});
