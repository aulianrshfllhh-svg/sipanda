import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerNotificationRoutes } from '../notification-routes.js';

async function withServer(prisma, run) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const role = req.headers['x-role'] || 'opd';
    req.currentUser = {
      id: role === 'admin' ? 'admin-1' : `${role}-1`,
      role,
      roleKodes: role === 'admin' ? ['super_admin'] : [],
      opdId: role === 'opd' ? 'opd-1' : null
    };
    next();
  });
  registerNotificationRoutes(app, prisma, (_req, _res, next) => next(), user => user.roleKodes.includes('super_admin'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test('super admin can send a notification to all active OPDs', async () => {
  let createdRows;
  const prisma = {
    opd: { findMany: async query => {
      assert.deepEqual(query.where, { isActive: true });
      return [{ id: 'opd-1' }, { id: 'opd-2' }];
    } },
    notification: { createMany: async ({ data }) => {
      createdRows = data;
      return { count: data.length };
    } }
  };

  await withServer(prisma, async url => {
    const response = await fetch(`${url}/api/notifications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-role': 'admin' },
      body: JSON.stringify({ opdId: 'all', title: '  Jadwal Desk  ', message: '  Besok pukul 09.00  ' })
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { success: true, sentCount: 2 });
  });

  assert.equal(createdRows.length, 2);
  assert.deepEqual(createdRows.map(row => row.opdId), ['opd-1', 'opd-2']);
  assert.ok(createdRows.every(row => row.title === 'Jadwal Desk' && row.message === 'Besok pukul 09.00'));
  assert.equal(createdRows[0].createdAt.getTime(), createdRows[1].createdAt.getTime());
});

test('notification sending is restricted to super admin and validates required content', async () => {
  let recipientLookups = 0;
  const prisma = {
    opd: { findMany: async () => { recipientLookups += 1; return [{ id: 'opd-1' }]; } },
    notification: { createMany: async () => ({ count: 1 }) }
  };

  await withServer(prisma, async url => {
    const forbidden = await fetch(`${url}/api/notifications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-role': 'staf' },
      body: JSON.stringify({ opdId: 'all', title: 'Info', message: 'Pesan' })
    });
    assert.equal(forbidden.status, 403);

    const invalid = await fetch(`${url}/api/notifications`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-role': 'admin' },
      body: JSON.stringify({ opdId: 'all', title: ' ', message: 'Pesan' })
    });
    assert.equal(invalid.status, 400);
  });

  assert.equal(recipientLookups, 0);
});

test('OPD only reads and marks its own notifications as read', async () => {
  let readQuery;
  let updateQuery;
  const prisma = {
    notification: {
      findMany: async ({ where }) => {
        assert.deepEqual(where, { opdId: 'opd-1' });
        return [{
          id: 'note-1', title: 'Jadwal Desk', message: 'Besok', createdAt: new Date('2026-10-05T01:00:00Z'),
          readAt: null, sender: { nama: 'Admin' }
        }];
      },
      findFirst: async ({ where }) => {
        readQuery = where;
        return where.opdId === 'opd-1' && where.id === 'note-1' ? { id: 'note-1', readAt: null } : null;
      },
      updateMany: async query => {
        updateQuery = query;
        return { count: 1 };
      }
    }
  };

  await withServer(prisma, async url => {
    const list = await fetch(`${url}/api/notifications`, { headers: { 'x-role': 'opd' } });
    assert.equal(list.status, 200);
    assert.equal((await list.json())[0].senderName, 'Admin');

    const read = await fetch(`${url}/api/notifications/note-1/read`, {
      method: 'PATCH',
      headers: { 'x-role': 'opd' }
    });
    assert.equal(read.status, 200);

    const inaccessible = await fetch(`${url}/api/notifications/another-opd/read`, {
      method: 'PATCH',
      headers: { 'x-role': 'opd' }
    });
    assert.equal(inaccessible.status, 404);
  });

  assert.deepEqual(readQuery, { id: 'another-opd', opdId: 'opd-1' });
  assert.deepEqual(updateQuery.where, { id: 'note-1', opdId: 'opd-1', readAt: null });
});
