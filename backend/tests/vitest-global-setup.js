import { resetAndSeedTestDatabase } from './test-database.js';

export default async function prepareTestSuite() {
  resetAndSeedTestDatabase();
}
