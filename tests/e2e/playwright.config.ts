import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const apiPort = process.env.SIPANDA_E2E_API_PORT || '3001';
const frontendPort = process.env.SIPANDA_E2E_FRONTEND_PORT || '5173';

export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    browserName: 'chromium',
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'node backend/tests/start-test-server.js',
      cwd: repositoryDirectory,
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: false,
      timeout: 60000,
      stdout: 'ignore',
      stderr: 'ignore',
      env: { TEST_SERVER_PORT: apiPort, PORT: apiPort }
    },
    {
      command: `node frontend/node_modules/vite/bin/vite.js frontend --config frontend/vite.config.ts --host 127.0.0.1 --port ${frontendPort} --strictPort`,
      cwd: repositoryDirectory,
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: false,
      timeout: 60000,
      env: { SIPANDA_API_PROXY_TARGET: `http://127.0.0.1:${apiPort}` }
    }
  ]
});
