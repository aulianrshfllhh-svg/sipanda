# Goal: Reliable Section Orientation Across the Editor and Exports

## User Request

> PERBAIKAN INTI EDITOR: COVER BISA DIEDIT, ORIENTASI/LANDSCAPE, DAN PERILAKU SEPERTI MICROSOFT WORD
>
> The requested behavior includes a Word-like ordered section/content model, deterministic pagination, portrait/landscape transitions, editable cover content, correct page numbering and headers/footers, and editor/export parity.
>
> Diagnosis identified that BAB content is currently persisted in `sections[].subsections[].content` HTML, where `.doc-section-landscape` wrappers encode orientation. Rendering flattens wrappers into separate articles while the editor applies landscape sizing inside a portrait chapter canvas, causing potential duplicated or overlapping pages. Cover used to receive a front-matter footer/page number through DOCX section generation.
>
> The user selected the focused scope: establish reliable section-orientation behavior and correct page transitions in the editor, PDF, and DOCX, with a compatibility-preserving orientation-transition marker in existing HTML content rather than a database migration. Cover/footer defects are in scope only where directly related. Full Word-style editing features such as comprehensive Undo/Redo, two-page zoom, and drag resizing are out of scope. Word/LibreOffice visual opening is accepted as a manual verification limitation if unavailable locally.

## Refined Goal

Make portrait/landscape orientation transitions behave as ordered, next-page section breaks across the editor canvas, PDF, and editable DOCX, preventing overlap, duplicate rendering, and loss of content. Retain compatibility with already-saved orientation wrappers by standardizing them into a safe persisted transition representation within existing subsection HTML, without introducing a database migration. Ensure DOCX page sizes/orientations, continuous body numbering, and cover-without-footer behavior remain correct. Preserve editable cover content and reset behavior already present, fixing any directly related export or persistence regression.

## Acceptance Criteria

- [ ] Criterion 1: Legacy `.doc-section-landscape` / `.doc-section-portrait` documents and new orientation transitions render as one ordered body content stream, with every content block appearing exactly once.
- [ ] Criterion 2: A portrait → landscape → portrait scenario starts each orientation section on a new page in sequence in the editor canvas, PDF, and DOCX; no portrait/landscape overlap or duplicate page output occurs.
- [ ] Criterion 3: Re-rendering/pagination from unchanged content is deterministic and idempotent; body page numbers continue across landscape pages without resetting.
- [ ] Criterion 4: Selecting content or a table and applying orientation retains the selected content once, leaves surrounding content intact, and creates appropriate next-page transitions. Removing a transition merges content without data loss or duplication, where the editor already exposes that operation.
- [ ] Criterion 5: Editable DOCX has correct F4 portrait/landscape page dimensions and landscape orientation metadata; headers/footers and page numbering continue for body sections. Cover has no page number or footer reference.
- [ ] Criterion 6: The editable cover remains document-owned, survives export, is not silently overwritten when OPD settings change, and can be reset to generated defaults; cover/export paths do not emit unresolved placeholders.
- [ ] Criterion 7: Targeted automated tests and the frontend production build pass. Any full-suite failures are identified and shown to be unrelated to these changes. Word/LibreOffice opening is reported as manual verification if unavailable.

## Scope Boundaries

**In scope:**
- Orientation transition model and backward compatibility for stored subsection HTML.
- Editor orientation application to a section, selection, or table insofar as required for correct section flow.
- Sequential pagination and page canvas output for portrait and landscape sections.
- PDF and editable DOCX section dimensions/orientation, numbering continuity, and cover footer exclusion.
- Preservation and validation of the existing editable-cover implementation when coupled to these changes.
- Focused regression tests, frontend build, and backend test validation.

**Out of scope:**
- Database migration to a new first-class JSON sections schema.
- Complete Microsoft Word interaction parity (full Undo/Redo system, Ctrl+scroll zoom, two-page mode, advanced table/image drag-resizing, and every keyboard/selection behavior).
- Unrelated editor, planning, template, or application features.
- Claiming visual verification in Microsoft Word/LibreOffice when neither renderer is installed.

## Applicable Project Conventions

**Quality gate command:**
- `cd backend; npm test`
- `cd frontend; npm run build`
- Prefer focused `node --test tests/<relevant>.test.js` while iterating.

**Commit convention:**
- No project-specific convention found; use conventional commits.
- Builder iteration: `type(scope): [B] imperative description` (title ≤72 chars).
- Inspector iteration: `chore(scope): [I] imperative description` (title ≤72 chars).
- Include the required `Assisted-by:` trailer and the workspace-required Copilot co-author trailer.
- Preserve pre-existing worktree changes; stage and commit only goal-specific files.

**Guidelines:**
- No `AGENTS.md`, `CONSTITUTION.md`, `.agents/guidelines/`, or `.github/guidelines/` files were found during project discovery.
- See `README.md` for current editor/document behavior.

**Rules:**
- Worktree was already heavily dirty at goal start. Do not revert or commit unrelated user changes.
- Avoid a database migration; legacy stored HTML must remain readable.
- Report unavailable Word/LibreOffice visual verification honestly.
