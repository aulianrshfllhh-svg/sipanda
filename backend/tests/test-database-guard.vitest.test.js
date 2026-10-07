import { describe, expect, it } from 'vitest';
import { validateTestDatabaseUrl } from './test-database.js';

describe('pagar keselamatan database test', () => {
  it('hanya mengizinkan MySQL dengan nama database tepat sipanda_test', () => {
    expect(validateTestDatabaseUrl('mysql://user:password@localhost:3306/sipanda_test')).toBe(true);
    expect(validateTestDatabaseUrl('mysql://user:password@localhost:3306/sipanda')).toBe(false);
    expect(validateTestDatabaseUrl('mysql://user:password@localhost:3306/sipanda_test_copy')).toBe(false);
    expect(validateTestDatabaseUrl('postgresql://user:password@localhost:5432/sipanda_test')).toBe(false);
    expect(validateTestDatabaseUrl('')).toBe(false);
  });
});
