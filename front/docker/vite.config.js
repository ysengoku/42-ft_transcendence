import { defineConfig } from 'vite';

export default defineConfig({
  root: './app', // Set the root folder for Vite
  server: {
    port: 3000,   // Default port for Vite
    open: false,  // Disable automatic opening of the browser
    host: '0.0.0.0',   // Expose the server to the network
  },
  build: {
    outDir: '../dist', // Output directory after build
  },
});