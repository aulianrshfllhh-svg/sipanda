import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'node backend/tests/start-test-server.js',
      cwd: repositoryDirectory,
      url: 'http://127.0.0.1:3001/api/health',
      reuseExistingServer: false,
      timeout: 60000,
      stdout: 'ignore',
      stderr: 'ignore',
      env: { TEST_SERVER_PORT: '3001' }
    },
    {
      command: 'node frontend/node_modules/vite/bin/vite.js frontend --config frontend/vite.config.ts --host 127.0.0.1 --port 5173 --strictPort',
      cwd: repositoryDirectory,
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
      timeout: 60000
    }
  ]
});
