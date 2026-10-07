# Automated test suite

The four commands below are present in the current root `package.json`. That
manifest is not part of this changeset; a commit containing only these test
documents and harness fixes will not by itself provide the npm scripts.

- `npm run test:backend` first invokes the guarded test-database reset/seed
  helper, then runs the Node unit tests and database-backed Vitest tests. The
  Vitest global setup also resets/seeds, so this command can reset twice.
- `npm run test:frontend` runs Vue component tests with Vitest and Vue Test Utils;
  it does not reset or connect to a database.
- `npm run test:e2e` first invokes the guarded test-database reset/seed helper,
  then runs Chromium browser flows with Playwright.
- `npm test` runs backend, frontend, and E2E commands in sequence. Since its
  backend and E2E steps can reset the database, it is not a database-free run.

Backend and browser tests require `backend/.env.test` to point to the isolated
MySQL database named exactly `sipanda_test`. The runner checks the parsed
`DATABASE_URL` before any reset, migration, or seed operation and rejects a
missing file, non-MySQL URL, or any other database name. It resets the test
schema, then seeds deterministic test-only roles, users, an OPD, and a document.
No test command falls back to `.env` or permits the development database. Do
not run database-backed commands unless the test database is available and a
destructive reset of `sipanda_test` is intended.

The export test writes its generated DOCX and PDF examples to `tests/output`.
These files are intentional regression artifacts and are kept under version
control for review; they are not treated as temporary ignored files.

The Node runner can be run by itself with `node backend/tests/run-node-tests.js`;
it does not reset or connect to a database. Current browser coverage includes
login and denial of unauthenticated/unauthorized access; broader editor,
assignment, review, and workflow coverage remains incomplete. The database
guard Vitest test belongs to the database-backed Vitest invocation, whose
global setup resets the test database, so do not run that suite merely to
exercise the guard. Recorded outcomes and unrun coverage are in
`docs/safe-test-results-2026-10-07.md`.
