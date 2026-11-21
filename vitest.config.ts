import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@second-thought/core': resolve(__dirname, 'packages/core/src/index.ts'),
    },
  },
  test: {
    globals: true,
    include: ['packages/*/test/**/*.test.ts', 'extension/test/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    environmentMatchGlobs: [['extension/test/dom/**', 'jsdom']],
    testTimeout: 15000,
    setupFiles: ['vitest.setup.ts'],
    reporters: 'default',
  },
});
