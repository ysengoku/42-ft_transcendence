import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    watch: {
      usePolling: true,
    },
    historyFallback: true,
  },
  resolve: {
    alias: {
      '@main': path.resolve(__dirname, 'src/main.js'),
      '@router': path.resolve(__dirname, 'src/js/router.js'),
      '@socket': path.resolve(__dirname, 'src/js/socket.js'),
      '@api': path.resolve(__dirname, 'src/js/api/index.js'),
      '@components': path.resolve(__dirname, 'src/js/components/'),
      '@auth': path.resolve(__dirname, 'src/js/auth/index.js'),
      '@utils': path.resolve(__dirname, 'src/js/utils/index.js'),
      '@mock': path.resolve(__dirname, '__mock__/'),
      '@css': path.resolve(__dirname, 'src/css/'),
    },
  },
  plugins: [
    {
      name: 'inject-theme-init',
      transformIndexHtml(html) {
        return html.replace(
          /(<head[^>]*>)/i,
          `$1
          <script src='/src/js/theme.js'></script>`
        );
      }
    }
  ]
});
