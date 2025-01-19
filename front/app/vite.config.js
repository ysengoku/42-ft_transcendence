import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures relative paths in the built index.html
  server: {
    port: 5173,
    open: false,
    host: '0.0.0.0',
    strictPort: true,
    watch: {
      usePolling: true,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    }
  },
  resolve: {
    alias: {
      '@': '/js',  // This allows you to import from '@/components' etc.
    }
  }
});