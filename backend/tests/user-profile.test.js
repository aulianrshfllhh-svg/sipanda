import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUserProfile } from '../user-profile.js';

const user = (username, opdId, roleCodes = []) => ({
  id: `${username}-id`,
  username,
  opdId,
  nama: username,
  opd: { nama: 'Bapperida Kabupaten Cirebon' },
  roles: roleCodes.map(kode => ({ role: { kode } })),
});

test('legacy admin account for Bapperida receives the Super Admin profile', () => {
  const profile = buildUserProfile(user('admin', 'bapperida'));

  assert.equal(profile.role, 'admin');
  assert.equal(profile.isSuperAdmin, true);
  assert.equal(profile.roleLabel, 'BAPPERIDA (SUPER ADMIN)');
  assert.ok(profile.roleKodes.includes('super_admin'));
});

test('explicit account roles are retained without duplicating Super Admin', () => {
  const profile = buildUserProfile(user('admin', 'bapperida', ['super_admin', 'staf_bapperida']));

  assert.equal(profile.role, 'admin');
  assert.equal(profile.roleKodes.filter(kode => kode === 'super_admin').length, 1);
});

test('Bapperida staff without the legacy admin username remains staff', () => {
  const profile = buildUserProfile(user('operator.bapperida', 'bapperida', ['staf_bapperida']));

  assert.equal(profile.role, 'staf');
  assert.equal(profile.isSuperAdmin, false);
});

test('an admin username assigned to another agency is not elevated', () => {
  const profile = buildUserProfile(user('admin', 'dinkes', ['opd']));

  assert.equal(profile.role, 'opd');
  assert.equal(profile.isSuperAdmin, false);
});
