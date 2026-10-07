import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
export const backendDirectory = path.resolve(testsDirectory, '..');
const envPath = path.join(backendDirectory, '.env.test');

export function validateTestDatabaseUrl(value) {
  if (typeof value !== 'string' || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'mysql:'
      && decodeURIComponent(url.pathname.replace(/^\/+/, '')) === 'sipanda_test';
  } catch {
    return false;
  }
}

export function loadTestEnvironment() {
  if (!fs.existsSync(envPath)) throw new Error('File backend/.env.test tidak ditemukan.');
  const values = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
  if (!validateTestDatabaseUrl(values.DATABASE_URL)) {
    throw new Error('Target database test harus tepat bernama sipanda_test; setup dibatalkan.');
  }
  return { ...values, NODE_ENV: 'test' };
}

export function resetAndSeedTestDatabase() {
  const testEnvironment = loadTestEnvironment();
  const environment = { ...process.env, ...testEnvironment };
  const prismaCli = path.join(backendDirectory, 'node_modules', 'prisma', 'build', 'index.js');
  const setup = spawnSync(process.execPath, [
    prismaCli,
    'db',
    'push',
    '--force-reset',
    '--accept-data-loss',
    '--skip-generate',
    '--schema',
    path.join(backendDirectory, 'prisma', 'schema.prisma')
  ], { cwd: backendDirectory, env: environment, encoding: 'utf8', windowsHide: true });

  if (setup.error || setup.status !== 0) {
    const output = `${setup.stdout || ''}\n${setup.stderr || ''}`;
    const reason = /P1001|Can't reach database server/i.test(output)
      ? 'server MySQL tidak dapat dijangkau'
      : /P1000|Access denied|authentication failed/i.test(output)
        ? 'autentikasi database ditolak'
        : 'Prisma gagal menjalankan reset';
    throw new Error(`Reset database test gagal (${reason}, kode ${setup.status ?? 'tidak tersedia'}); seed tidak dijalankan.`);
  }

  const seed = spawnSync(process.execPath, [
    path.join(testsDirectory, 'seed-test-data.js')
  ], { cwd: backendDirectory, env: environment, encoding: 'utf8', windowsHide: true });
  if (seed.error || seed.status !== 0) {
    throw new Error(`Seed database test gagal (kode ${seed.status ?? 'tidak tersedia'}).`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    resetAndSeedTestDatabase();
    console.log('Database sipanda_test berhasil direset dan diisi data uji.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
