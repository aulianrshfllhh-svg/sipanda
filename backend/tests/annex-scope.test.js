import test from 'node:test';
import assert from 'node:assert/strict';
import { annexOwnerOpdId } from '../annex-scope.js';

test('Lampiran ownership is the account OPD even for administrators and assigned staff', () => {
  assert.equal(annexOwnerOpdId({ role: 'admin', opdId: 'bapperida', isSuperAdmin: true }), 'bapperida');
  assert.equal(annexOwnerOpdId({ role: 'staf', opdId: 'bapperida' }), 'bapperida');
  assert.equal(annexOwnerOpdId({ role: 'opd', opdId: 'kec-depok' }), 'kec-depok');
  assert.equal(annexOwnerOpdId({ role: 'admin' }), null);
});
