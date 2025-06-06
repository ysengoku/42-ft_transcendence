// vitest.config.js
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'src': path.resolve(__dirname, 'src'),
      '@main': path.resolve(__dirname, 'src/main.js'),
      '@router': path.resolve(__dirname, 'src/js/router.js'),
      '@env': path.resolve(__dirname, 'src/js/env.js'),
      '@socket': path.resolve(__dirname, 'src/js/sockets/index.js'),
      '@auth': path.resolve(__dirname, 'src/js/auth/index.js'),
      '@api': path.resolve(__dirname, 'src/js/api/index.js'),
      '@components': path.resolve(__dirname, 'src/js/components'),
      '@utils': path.resolve(__dirname, 'src/js/utils/index.js'),
      '@mock': path.resolve(__dirname, '__mock__'),
      '\\.css$': '<rootDir>/__mock__/styleMock.js',
      '\\.(svg)(\\?url)?$': '<rootDir>/__mock__/svgMock.js',
      '\\.(png|jpg|jpeg|gif|svg)(\\?.*)?$': '<rootDir>/__mock__/fileMock.js',
    }
  },
  test: {
    environment: 'jsdom',
    include: ['**/__tests__/vitest/*.test.js'],
    exclude: ['node_modules', 'dist'],
    globals: true,
    coverage: {
      provider: 'istanbul'
    }
  }
});
