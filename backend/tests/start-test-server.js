import { loadTestEnvironment, validateTestDatabaseUrl } from './test-database.js';

const testEnvironment = loadTestEnvironment();
if (!validateTestDatabaseUrl(testEnvironment.DATABASE_URL)) {
  throw new Error('Server test dibatalkan karena target bukan database test yang diizinkan.');
}
Object.assign(process.env, testEnvironment);
process.env.PORT = process.env.TEST_SERVER_PORT || '3001';
await import('../server.js');
