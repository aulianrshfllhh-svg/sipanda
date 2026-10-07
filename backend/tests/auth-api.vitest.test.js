import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let serverProcess;
let api;

async function availablePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => listener.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = listener.address();
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}

async function waitForApi(baseUrl) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error('Server test berhenti sebelum siap.');
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  throw new Error('Server test tidak siap dalam batas waktu.');
}

async function login(username, password = 'sipanda-test-password') {
  return request(api).post('/api/auth/login').send({ username, password });
}

describe('API autentikasi dan akses', () => {
  beforeAll(async () => {
    const port = await availablePort();
    api = `http://127.0.0.1:${port}`;
    serverProcess = spawn(process.execPath, [
      path.join(backendDirectory, 'tests', 'start-test-server.js')
    ], {
      cwd: backendDirectory,
      env: { ...process.env, TEST_SERVER_PORT: String(port) },
      stdio: 'ignore',
      windowsHide: true
    });
    await waitForApi(api);
  });

  afterAll(async () => {
    if (!serverProcess || serverProcess.exitCode !== null) return;
    serverProcess.kill();
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 3000);
      serverProcess.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  });

  it('menerima kredensial akun OPD aktif', async () => {
    const response = await login('test-opd');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user).toMatchObject({ id: 'user-test-opd', role: 'opd' });
    expect(response.body.token).toEqual(expect.any(String));
  });

  it('menolak kata sandi yang salah dan akun nonaktif', async () => {
    const badPassword = await login('test-opd', 'salah');
    const inactive = await login('test-inactive');
    expect(badPassword.status).toBe(401);
    expect(inactive.status).toBe(401);
  });

  it('menolak login tanpa kredensial lengkap', async () => {
    const response = await request(api).post('/api/auth/login').send({ username: 'test-opd' });
    expect(response.status).toBe(400);
  });

  it('memuat profil untuk token yang valid dan menolak akses anonim', async () => {
    const anonymous = await request(api).get('/api/auth/me');
    const signedIn = await login('test-opd');
    const profile = await request(api)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signedIn.body.token}`);
    expect(anonymous.status).toBe(401);
    expect(profile.status).toBe(200);
    expect(profile.body.user.id).toBe('user-test-opd');
  });

  it('mempertahankan semua role pada akun ganda', async () => {
    const response = await login('test-dual');
    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('staf');
    expect(response.body.user.roleKodes).toEqual(expect.arrayContaining(['opd', 'staf_bapperida']));
  });

  it('membatasi pergantian pengguna hanya untuk super-admin', async () => {
    const opd = await login('test-opd');
    const admin = await login('test-admin');
    const denied = await request(api)
      .post('/api/auth/switch-user')
      .set('Authorization', `Bearer ${opd.body.token}`)
      .send({ username: 'test-staff' });
    const allowed = await request(api)
      .post('/api/auth/switch-user')
      .set('Authorization', `Bearer ${admin.body.token}`)
      .send({ username: 'test-staff' });
    expect(denied.status).toBe(403);
    expect(allowed.status).toBe(200);
  });
});
