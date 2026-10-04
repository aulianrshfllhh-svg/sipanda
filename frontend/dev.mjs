import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(frontendDir, '../backend');
const children = new Set();
let stopping = false;
let backend;
let backendRestartCount = 0;
let backendRestartWindow = Date.now();

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
}

function startNode(args, cwd, onUnexpectedExit) {
  const child = spawn(process.execPath, args, { cwd, env: process.env, stdio: 'inherit' });
  children.add(child);
  let exitHandled = false;
  const handleUnexpectedExit = (error, code) => {
    if (stopping || exitHandled) return;
    exitHandled = true;
    children.delete(child);
    onUnexpectedExit(error, code);
  };

  child.on('error', error => {
    handleUnexpectedExit(error, 1);
  });
  child.on('exit', code => {
    children.delete(child);
    handleUnexpectedExit(new Error(`${args[0]} exited`), code || 1);
  });
  return child;
}

async function isBackendReady() {
  try {
    const response = await fetch('http://localhost:3001/api/health');
    return response.ok && response.headers.get('content-type')?.includes('application/json') === true;
  } catch {
    return false;
  }
}

async function isViteReady() {
  try {
    const response = await fetch('http://localhost:5173/api/health');
    return response.ok && response.headers.get('content-type')?.includes('application/json') === true;
  } catch {
    return false;
  }
}

function handleBackendExit(error, code) {
  if (stopping) return;

  setTimeout(async () => {
    if (stopping) return;
    if (await isBackendReady()) {
      console.log('Backend is already healthy on port 3001; reusing it.');
      return;
    }

    if (Date.now() - backendRestartWindow > 60_000) {
      backendRestartWindow = Date.now();
      backendRestartCount = 0;
    }

    backendRestartCount++;
    if (backendRestartCount > 5) {
      console.error('Backend exceeded the restart limit:', error.message);
      stop(code || 1);
      return;
    }

    console.error(`Backend stopped (${error.message}); restarting (${backendRestartCount}/5).`);
    backend = startNode(['server.js'], backendDir, handleBackendExit);
  }, 1000);
}

async function waitForBackend(backend) {
  for (let attempt = 0; attempt < 30; attempt++) {
    if (stopping || (backend && backend.exitCode !== null)) {
      throw new Error('Backend exited before becoming ready.');
    }
    try {
      if (await isBackendReady()) return;
    } catch {
      // Backend is still starting.
    }
    await delay(500);
  }
  throw new Error('Backend did not become ready on port 3001. Check backend/.env and logs.');
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

if (await isBackendReady()) {
  console.log('Existing backend is healthy on port 3001; reusing it.');
} else {
  backend = startNode(['server.js'], backendDir, handleBackendExit);
}

try {
  await waitForBackend(backend);
  console.log('Backend ready; starting Vite.');
  if (await isViteReady()) {
    console.log('Existing Vite is healthy on port 5173; reusing it.');
  } else {
    startNode(
      ['node_modules/vite/bin/vite.js', '--host', 'localhost', '--port', '5173'],
      frontendDir,
      (error, code) => {
        console.error('Vite stopped:', error.message);
        stop(code || 1);
      }
    );
  }
} catch (error) {
  console.error(error.message);
  stop(1);
}
