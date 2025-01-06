import { defineConfig } from 'vite';

export default defineConfig({
  root: './app', // Set the root folder for Vite
  server: {
    port: 5173,   // Change the port to 5173
    open: false,  // Disable automatic opening of the browser
    host: '0.0.0.0',   // Expose the server to the network
    strictPort: true,  // Ensure the server fails if the port is already in use
    watch: {
      usePolling: true, // Use polling to watch for file changes
    },
  },
  build: {
    outDir: '../dist', // Output directory after build
  },
});