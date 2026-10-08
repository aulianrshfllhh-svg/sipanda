import {parseHTML} from 'linkedom';
import {checkDocumentFormat} from '../shared/document-format.js';
export function documentFormatReport(doc) {
  return checkDocumentFormat(doc, sub=>parseHTML(`<html><body>${sub.content||''}</body></html>`).document.body);
}
export function submissionIssues(doc) {
  return documentFormatReport(doc).issues.filter(i=>i.level==='required').map(i=>i.message);
}
