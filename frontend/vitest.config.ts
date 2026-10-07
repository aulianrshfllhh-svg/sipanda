import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: frontendDirectory,
  plugins: [vue()],
  resolve: {
    alias: { '@': path.join(frontendDirectory, 'src') },
    dedupe: ['vue']
  },
  test: {
    environment: 'jsdom',
    include: ['**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true
  }
});
