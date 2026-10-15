import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.vitest.test.js'],
    globalSetup: ['tests/vitest-global-setup.js'],
    testTimeout: 20000,
    hookTimeout: 30000
  }
});
