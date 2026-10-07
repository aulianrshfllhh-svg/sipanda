import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const testFiles = fs.readdirSync(testsDirectory)
  .filter(name => name.endsWith('.test.js') && !name.endsWith('.vitest.test.js'))
  .map(name => path.join(testsDirectory, name));

const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  cwd: path.resolve(testsDirectory, '..'),
  stdio: 'inherit',
  windowsHide: true
});

if (result.error) {
  console.error('Runner test Node gagal dijalankan.');
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
