import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHTML } from 'linkedom';
import { normalizeSubsectionOrientation } from '../../shared/editor-orientation.js';

const parse = html => parseHTML(`<html><body>${html}</body></html>`).document.body;

test('full legacy landscape wrapper migrates without changing its inner content and is repeatable', () => {
  const original = { id:'legacy-landscape', content:'<div class="doc-section doc-section-landscape"><p>Keep this paragraph.</p><table><tbody><tr><td>Keep this cell.</td></tr></tbody></table></div>' };
  const first = normalizeSubsectionOrientation(original, parse);
  const second = normalizeSubsectionOrientation(first.subsection, parse);
  assert.equal(first.subsection.orientation, 'landscape');
  assert.equal(first.subsection.pageBreakBefore, false);
  assert.equal(first.subsection.content, '<p>Keep this paragraph.</p><table><tbody><tr><td>Keep this cell.</td></tr></tbody></table>');
  assert.equal(first.migrated, true);
  assert.equal(second.migrated, false);
  assert.equal(second.subsection.content, first.subsection.content);
  assert.equal(original.content.includes('doc-section-landscape'), true);
});

test('mixed legacy orientations stay intact and signal an editor warning', () => {
  const content = '<p>Portrait text.</p><div class="doc-section doc-section-landscape"><p>Landscape text.</p></div><div class="doc-section-break" data-orientation="portrait"></div><p>Back to portrait.</p>';
  const result = normalizeSubsectionOrientation({ id:'legacy-mixed', content }, parse);
  assert.equal(result.mixedLegacy, true);
  assert.equal(result.migrated, false);
  assert.equal(result.subsection.content, content);
  assert.equal(result.subsection.orientation, 'portrait');
});

test('legacy transition inside a wrapper is not flattened', () => {
  const content = '<div class="doc-section doc-section-landscape"><p>Landscape.</p><div class="doc-section-break" data-orientation="portrait"></div><p>Portrait.</p></div>';
  const result = normalizeSubsectionOrientation({ id:'legacy-inner-transition', content }, parse);
  assert.equal(result.mixedLegacy, true);
  assert.equal(result.subsection.content, content);
});
