# Iteration 3 independent inspection

**Verdict: FAIL**

Inspected builder commit `8f0c908420e42fda63021ffba13dd3854d1bee72` on
2026-10-07. No database reset, seed, backend Vitest suite, or Playwright suite
was run. Only the feedback and goal status are changed for this inspection;
the extensively dirty application worktree was left untouched.

## Findings

1. **The two earlier frontend failures were test-harness failures, not
   established application bugs.** The builder commit changes only the goal
   status, `LoginView.test.ts`, and `frontend/vitest.config.ts`; it changes no
   application component. The Vitest config now resolves/deduplicates one Vue
   runtime, and the strengthened assertions exercise the alert, request body,
   and both directions of the visibility toggle. Safe rerun:
   `npm run test:frontend -- --reporter=default` — **1 file passed, 3/3 tests
   passed**. This supports the prior failure being caused by the component
   test's Vue runtime setup; the prior reports should not describe those
   observations as confirmed product defects. A Tailwind `content` warning
   appeared but did not affect these tests.

2. **The required root scripts still are not delivered by this commit.** The
   target commit tree contains no root `package.json`. The current worktree has
   an untracked root `package.json` with all four commands, but that is not
   committed evidence and was not staged. Its backend and E2E commands invoke
   the destructive database helper; backend Vitest also invokes it again via
   global setup. Those commands were deliberately not run.

3. **Safe backend Node tests currently report four failures, but this is not a
   clean result attributable to the inspected commit.** Directly running
   `node backend/tests/run-node-tests.js` (which does not perform database
   setup) produced **101 tests: 97 passed, 4 failed**. The current worktree
   contains modifications to `backend/templates.js` and
   `backend/tests/planning.test.js`, plus an untracked
   `backend/tests/templates-migration.test.js`; these files are outside the
   iteration-3 commit's changes. Failures observed:
   - `specified year/type outlines and placeholders`: expected three outline
     entries, received an empty list.
   - `rancangan Renja table is emitted on a landscape page`: fixture assigns
     `tables` on a missing subsection (`subsections[2]`).
   - `generated annex tables use 12pt text on a landscape F4 page`: same
     missing-subsection fixture indexing.
   - `ensureTemplates versions an active legacy 2027 Renja Murni template`:
     expected the old record to become inactive, but it remained active.
   These need reconciliation against the intended template/application
   behavior, but should not be misreported as regressions introduced by this
   small frontend-only commit.

4. **The database guard logic is narrow and the current test target is
   correct, but one committed guard-test fixture is malformed.** Safely
   loading `backend/.env.test` confirmed only that its parsed URL is accepted
   and has the exact `/sipanda_test` path; no reset was attempted. Direct
   checks show the validator accepts a syntactically valid MySQL URL for
   `sipanda_test` and rejects `sipanda`, a suffixed database, and the
   placeholder fixture. However,
   `test-database-guard.vitest.test.js` expects
   `validateTestDatabaseUrl('******localhost:3306/sipanda_test')` to be true;
   that string is not a valid MySQL URL and evaluates false. The guard test
   itself is under Vitest global setup, which resets/seeds before the assertion,
   so it was not run. Fix the fixture without weakening the guard test.

5. **Artifacts and their tracking documentation are accurate, but validation
   is too shallow for acceptance.** The target tree tracks both
   `tests/output/sipanda-sample.docx` and `.pdf`, and `docs/automated-tests.md`
   correctly calls them intentional tracked artifacts. The current files
   exist (56,965-byte DOCX and 95,848-byte PDF). The export-artifact test
   generates them using the renderer and checks DOCX/PDF sample text and a
   nonzero PDF page count, but it was not run because the suite's global setup
   is destructive. It does not establish required layout constraints or exact
   rendered-PDF table-of-contents page numbering.

6. **Scenario coverage and result reporting remain materially incomplete.**
   The docs themselves say browser coverage is currently login and access
   denial, with broader editor, assignment, review, and workflow cases still
   to add. The inspected commit adds no backend or E2E scenario coverage. There
   is no aggregate report with all-suite totals and plain-Indonesian causes;
   the current docs only describe Node test totals. The requested
   authorization/workflow/editing/template/annex/export/archive criteria are
   therefore not established.

## Required iteration 4 work

1. Commit the root manifest/lockfile and verify all four commands in a clean
   install context; make aggregate results and Indonesian failure causes
   explicit.
2. Correct the malformed positive DB-guard fixture; retain exact-name refusal
   checks. Do not run any reset/seed/database-backed suite during this
   inspection.
3. Resolve the four safe Node failures against intended feature behavior and
   rerun that non-destructive runner.
4. Add and report the still-missing backend/E2E acceptance scenarios, including
   exact PDF TOC numbering and format constraints; keep failed behaviors
   visible and obtain user approval before any product fix.

Iteration 3 is not accepted. No destructive database setup was performed.
