# Automated test suite

Root commands:

- `npm run test:backend` runs the Node unit tests, guarded database-backed API tests, and export-artifact verification.
- `npm run test:frontend` runs Vue component tests with Vitest and Vue Test Utils.
- `npm run test:e2e` runs Chromium browser flows with Playwright.
- `npm test` runs all three suites in sequence.

Backend and browser tests require `backend/.env.test` to point to the isolated
MySQL database named exactly `sipanda_test`. The runner checks the parsed
`DATABASE_URL` before any reset, migration, or seed operation and rejects a
missing file, non-MySQL URL, or any other database name. It resets the test
schema, then seeds deterministic test-only roles, users, an OPD, and a document.
No test command falls back to `.env` or permits the development database.

The export test writes its generated DOCX and PDF examples to `tests/output`.
These files are intentional regression artifacts and are kept under version
control for review; they are not treated as temporary ignored files.

`npm run test:backend` reports the existing Node unit suite's pass/fail totals
first. Once the isolated MySQL service is available, the API and export tests
run afterward. Browser coverage currently includes login and denial of
unauthenticated/unauthorized access; broader editor, assignment, review, and
workflow coverage remains to be added.