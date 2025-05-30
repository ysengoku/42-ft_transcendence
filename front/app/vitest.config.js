// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/__tests__/vitest/router.test.js'],
    exclude: ['node_modules', 'dist'],
    globals: true,
  },
});
