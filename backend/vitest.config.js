import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['backend/tests/**/*.vitest.test.js'],
    globalSetup: ['backend/tests/vitest-global-setup.js'],
    testTimeout: 20000,
    hookTimeout: 30000
  }
});
