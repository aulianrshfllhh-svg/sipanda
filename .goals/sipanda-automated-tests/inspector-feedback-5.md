# Iteration 5 independent inspection

**Verdict: FAIL**

Inspected builder commit `331878451339b5a614766ad8676b0e26ad6b47c9` against
the goal and all previous inspector feedback. No database reset, seed,
database-backed Vitest run, or E2E run was performed. Only the database-free
backend Node runner and frontend Vitest suite were executed.

## Verified results

1. `node backend/tests/run-node-tests.js` passed **101/101 tests**. This
   independently confirms that the two previously failing cases now pass:
   `specified year/type outlines and placeholders` and
   `ensureTemplates versions an active legacy 2027 Renja Murni template`.
   The assertions remain in the runner; the iteration-5 commit changes
   `backend/templates.js` and does not remove or skip those tests.
2. `npm run test:frontend -- --reporter=default` passed **3/3 tests** in one
   file. Vitest emitted the documented empty Tailwind `content` warning.
3. The documented 114 total is arithmetically consistent with its breakdown:
   101 Node + 8 backend Vitest + 3 frontend + 2 Playwright. I independently
   verified only the 101 Node and 3 frontend results. Backend Vitest global
   setup resets/seeds the database and Playwright setup also resets/seeds, so
   their reported 8/8 and 2/2 were not repeated. No claim here independently
   certifies those results or the aggregate `npm test` run.

## Acceptance gaps and report accuracy

1. **The complete 23 requested scenarios are not met.** The result document
   honestly acknowledges incomplete coverage. The E2E spec has only two flows:
   anonymous redirect and OPD denial from a staff API. Backend/unit tests
   exercise some auth, template, document, annex, and export behavior, but do
   not demonstrate the missing three-user review workflow, assignment/status
   and audit-log flows, concurrent editing, the listed editor browser
   interactions, or the full requested role/access and archive flows. The
   export-artifact test checks extracted DOCX/PDF text, nonzero PDF pages, and
   file sizes; it does not assert the requested exact PDF TOC page numbering
   or all export layout constraints. The report correctly distinguishes
   114/114 existing tests from completion of all 23 scenarios.
2. **Scripts are present only in the dirty worktree, not the inspected
   commit.** The current untracked root `package.json` defines all four
   requested scripts; `docs/automated-tests.md` itself says the manifest is
   not part of its changeset. Therefore the builder commit does not deliver
   working root scripts as committed acceptance evidence. The package script
   chain also resets twice during backend tests (explicit helper plus Vitest
   global setup), as documented.
3. **The E2E proxy/port claim is not true of commit 3318784.** The current
   worktree contains an uncommitted `playwright.config.ts` change that allows
   choosing API/frontend ports and passes the API target to Vite. The
   inspected commit's version still hard-codes API port 3001 and frontend
   port 5173 and does not set `SIPANDA_API_PROXY_TARGET`. The results document
   claims the final run used API 3002/frontend 5174 with the isolated proxy;
   that implementation is present only as an uncommitted worktree change, not
   in this commit. Thus the incident disclosure itself is appropriately
   candid, but the committed iteration does not yet deliver the stated
   mitigation.
4. **Database protection is structurally guarded; the live target was not
   re-verified.** Inspection of `test-database.js` confirms the reset helper
   first requires a MySQL URL whose decoded database path is exactly
   `sipanda_test`; `start-test-server.js` likewise loads and validates the
   test environment before starting. The helper is the sole reset/seed path
   found in `backend/tests`. I did not inspect credentials, connect to MySQL,
   or repeat a destructive run, so the documented live `SELECT DATABASE()`
   result remains a recorded claim rather than a fresh verification.
5. **Exports and reports:** the artifact test writes both requested sample
   formats under `tests/output` and inspects generated content, and the
   iteration-5 result document explicitly discloses the prior port-3001
   incident and unknown database target. Those statements are supported by
   the test code and the report. The report's larger 114/114 claim is
   documented but only partially revalidated here, and test execution used a
   dirty worktree: the package manifest, port-proxy change, and export files
   are not all part of commit 3318784.

## Decision

The approved two backend fixes are effective under the safe Node runner, and
the frontend result remains green. Nevertheless, key requested deliverables
are still uncommitted, the committed E2E configuration does not include the
reported port-proxy mitigation, and substantial parts of the 23 scenarios
remain untested. These are material acceptance gaps, so continue with
iteration 6. Preserve the honest partial-coverage and port-incident
disclosures; do not reset or seed a database without directly verifying the
exact target first.
