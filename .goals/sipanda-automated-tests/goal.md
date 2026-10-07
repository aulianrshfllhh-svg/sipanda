# Goal: Automated tests for SIPANDA

## User Request

Create and run automated tests for SIPANDA while preserving existing features. Use an isolated MySQL database named `sipanda_test` and its own `.env.test`; never touch `sipanda`. Reset and seed the test database before each test suite. Add backend API/access tests, frontend component tests, and Playwright Chromium flows covering the user's 23 listed login, authorization, workflow, assignment, editing, template, annex, export, and archive scenarios. Add `test:backend`, `test:frontend`, `test:e2e`, and aggregate `test` package scripts. Save example DOCX/PDF exports under `tests/output`. Report pass/fail counts, failed-test causes in plain Indonesian, and bugs found. Do not weaken failing tests or fix application bugs until the user has first been told and approved the fix.

## Refined Goal

Provide a reliable, runnable automated test suite for SIPANDA, organized into backend/API, frontend, and browser E2E layers, with repeatable test-only database seeding and a hard safety check that permits destructive setup only when the configured MySQL database is exactly `sipanda_test`. Cover the 23 behaviors in the request to the extent supported by the current application and make unsupported or failing behavior visible rather than concealing it. Do not change existing application behavior; if tests expose a product bug, report it and wait for user approval before changing feature code.

## Acceptance Criteria

- [ ] Test database setup uses an independently configured `.env.test`; every destructive test setup verifies the MySQL database name is exactly `sipanda_test` and refuses all other targets, including `sipanda`.
- [ ] Each test suite starts from a reset test database populated with deterministic dummy data; no test accesses the production/development database.
- [ ] Root `package.json` provides working `test:backend`, `test:frontend`, `test:e2e`, and aggregate `test` commands.
- [ ] Backend tests cover login success/failure/inactive accounts; OPD, verifier, planner, super-admin, dual-role access; self-approval denial; status transitions and revision notes; assignment changes and logs; and concurrent chapter editing.
- [ ] Backend tests cover template version pinning, generated annex numbering/content/layout constraints, DOCX export constraints, and exact rendered-PDF table-of-contents page numbering.
- [ ] Frontend tests use Vitest and Vue Test Utils for suitable component behavior.
- [ ] Chromium Playwright tests cover editor persistence, repeated landscape/undo behavior, pasted/cleaned tables and text, captions, format validation, cover reset/export, the three-user review workflow, and browser access denial.
- [ ] Representative DOCX and PDF exports are retained in `tests/output` and can be opened/inspected programmatically.
- [ ] The test run reports accurate pass/fail totals and plain-Indonesian causes for failures; failing tests are not skipped, weakened, or removed.
- [ ] Existing application features remain unchanged. Any bug exposed in application code is reported to the user and is not fixed without approval.

## Scope Boundaries

**In scope:**
- Test configuration, isolated test-only data/reset/seeding, test scripts, tests, and test documentation directly required to run the suite.
- Minimal testability-only adjustments that do not alter application behavior.
- Reproducible reports and sample export artifacts requested by the user.

**Out of scope:**
- Fixing or changing existing application behavior without first reporting each discovered bug and receiving user approval.
- Connecting tests or destructive setup to any database other than `sipanda_test`.
- Hiding, skipping, weakening, or deleting failing tests to obtain a passing result.
- Committing or overwriting unrelated pre-existing worktree changes.

## Applicable Project Conventions

**Quality gate command:**
- `npm test` (existing backend Node test runner); new root test scripts are part of this goal.

**Commit convention:**
- Conventional commits (limited recent history evidence).
- Include `[B]` / `[I]` role markers and the goal skill's `Assisted-by:` trailer as applicable.
- Required repository trailer for any commit: `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.

**Guidelines:**
- No `AGENTS.md`, `CONSTITUTION.md`, `.agents/guidelines/`, or `.github/guidelines/` found.

**Rules:**
- Preserve uncommitted changes; the worktree is already extensively modified and contains untracked files. Do not stage or commit changes not created for this goal.
- Existing test-related files include `backend/tests/`; Prisma's existing seeder is destructive. Treat current `.env.test` database target as unverified until checked without revealing values.
- Do not edit feature code to fix a discovered bug until user approval.
