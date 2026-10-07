# Iteration 1 inspection

**Verdict: FAIL**

Inspected builder commit `fe9aeee85cb82f99513c80faf36ea89efd791752` and the
current test setup on 2026-10-07. No application or test implementation was
changed, and no database reset or database-backed suite was run.

## Findings

1. **Required package scripts are present only in the worktree, not in the
   builder commit.** The untracked root `package.json` currently defines
   `test:backend`, `test:frontend`, `test:e2e`, and `test`, but it is not among
   the commit's files. Therefore the committed iteration does not deliver the
   required root commands. Include the intended package manifest (and only its
   related lockfile changes) in the next builder iteration after confirming
   they are goal-owned.

2. **Frontend checks currently fail.** The safe targeted command
   `npm run test:frontend` ran 3 tests: 1 passed and 2 failed. The rejected-login
   test expected “Username atau password salah” in the rendered text but did
   not find it; the password-visibility test expected `type="text"` after
   clicking “Tampilkan password” but observed `type="password"`. Do not skip or
   weaken these checks. Determine whether each failure is a test harness issue
   or an application defect; report any product defect and wait for approval
   before changing application behavior.

3. **The committed coverage falls substantially short of the stated
   scenarios.** The new API tests cover login success, bad password, inactive
   account, incomplete credentials, anonymous/valid profile access, dual-role
   login, and super-admin-only user switching. The two browser tests cover
   anonymous redirect and denial of one staff API to an OPD user. The frontend
   adds three LoginView tests. These do not establish the required role-specific
   OPD/verifier/planner/admin access matrix, self-approval denial, status
   transitions/revision notes, assignment changes/logs, concurrent chapter
   editing, template pinning, annex constraints, the exact rendered-PDF TOC
   page numbering, or the requested editor and three-user workflow browser
   scenarios. The export test does create DOCX/PDF files and parse their
   contents, but checks only sample text, non-empty page count, and file sizes;
   it does not validate the listed format/layout/TOC constraints.

4. **Reporting requirements are not met.** The frontend run emits standard
   Vitest totals and assertion errors, not plain-Indonesian causes or a report
   of bugs found. No aggregate report for backend, frontend, and E2E results is
   produced by the committed files. Backend/E2E totals remain unverified here
   because their runners perform destructive database setup.

5. **Documentation is inaccurate about artifact tracking.** The new
   `docs/automated-tests.md` says files under `tests/output` are ignored by
   Git, but this commit adds both sample DOCX/PDF files as tracked artifacts.
   Correct the statement or change artifact handling in the next iteration.

## Safety and checks

- Static inspection confirms the reset helper validates a MySQL URL whose
  decoded database path is exactly `sipanda_test` before invoking Prisma
  `--force-reset`; seed and test-server setup also use the validated test
  configuration. A non-destructive check confirmed the present
  `backend/.env.test` target passes that guard. No URL, credential, or other
  environment value is included here.
- The package scripts invoke database reset/seeding in backend and E2E paths;
  they were deliberately not run. The backend Vitest global setup also resets
  and seeds, so backend command execution performs redundant destructive setup.
- Syntax checks of the added JavaScript scaffolding completed successfully.
- The sample-export test implementation checks generated DOCX/PDF contents,
  but its backend Vitest global setup prevents running it without the
  destructive reset.

**Required next step:** address these findings in iteration 2, preserving
failing tests and the no-unapproved-application-fix rule, then request a fresh
inspection.
