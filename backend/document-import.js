import mammoth from 'mammoth';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { parseHTML } from 'linkedom';
import { readFile } from 'node:fs/promises';
import { cleanHtml } from './document-render.js';

function chapterHeading(text) {
  const normalized = text.normalize('NFKC').replace(/\u00a0/g, ' ').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^BAB\s*\.?\s*([IVXLCDM]+|\d+)\s*[.:–—-]?\s*(.*)$/i);
  return match ? { roman: match[1].toUpperCase(), title: match[2].trim() } : null;
}

function chapterNumber(roman) {
  if (/^\d+$/.test(roman)) return Number(roman);
  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let index = 0; index < roman.length; index += 1) {
    const value = values[roman[index]];
    total += value < (values[roman[index + 1]] || 0) ? -value : value;
  }
  return total;
}

function subsectionHeading(node, fallbackCode, chapterIndex, allowPlainNumbering) {
  const text = node.textContent.trim().replace(/\s+/g, ' ');
  if (!text) return null;
  const numbered = text.match(/^(\d+(?:\.\d+)+)\.?\s+(.+)$/);
  if (numbered && Number(numbered[1].split('.')[0]) === chapterIndex &&
    (allowPlainNumbering || /^H[1-6]$/.test(node.nodeName))) {
    return { code: numbered[1], title: numbered[2].trim() };
  }
  if (/^H[2-6]$/.test(node.nodeName)) return { code: fallbackCode, title: text };
  return null;
}

function chapterHeadingInBlock(block) {
  if (block.nodeName !== 'TABLE') return chapterHeading(block.textContent);
  for (const paragraph of block.querySelectorAll('p,h1,h2,h3,h4,h5,h6')) {
    const heading = chapterHeading(paragraph.textContent);
    if (heading) return heading;
  }
  return null;
}

function isUppercaseTitle(text) {
  const normalized = text.normalize('NFKC').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized.length <= 120 &&
    /[A-ZÀ-Ý]/.test(normalized) &&
    normalized === normalized.toLocaleUpperCase('id-ID') &&
    /^[A-ZÀ-Ý\d\s.,:;()/'’&-]+$/.test(normalized);
}

async function attachSourceColumnWidths(filePath, html) {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) return html;
  const xmlDocument = new DOMParser().parseFromString(documentXml, 'application/xml');
  const gridWidths = Array.from(xmlDocument.getElementsByTagName('w:tbl')).map(table => {
    const grid = table.getElementsByTagName('w:tblGrid')[0];
    return grid ? Array.from(grid.getElementsByTagName('w:gridCol'))
      .map(column => Number(column.getAttribute('w:w')))
      .filter(width => Number.isFinite(width) && width > 0) : [];
  });
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  [...document.querySelectorAll('table')].forEach((table, index) => {
    const widths = gridWidths[index];
    if (!widths?.length || table.querySelector('colgroup')) return;
    const columnCount = Math.max(0, ...[...table.querySelectorAll('tr')].map(row =>
      [...row.children].reduce((count, cell) => count + Number(cell.getAttribute('colspan') || 1), 0)
    ));
    if (widths.length !== columnCount) return;
    const total = widths.reduce((sum, width) => sum + width, 0);
    const colgroup = document.createElement('colgroup');
    widths.forEach(width => {
      const column = document.createElement('col');
      column.setAttribute('style', `width:${(width / total * 100).toFixed(3)}%`);
      colgroup.append(column);
    });
    table.insertBefore(colgroup, table.firstChild);
  });
  return document.body.innerHTML;
}

function tableHeaderSignature(table) {
  return [...table.querySelectorAll('tr')].slice(0, 4).map(row =>
    [...row.children].map(cell => `${cell.getAttribute('colspan') || 1}:${cell.textContent.replace(/\s+/g, ' ').trim()}`).join('|')
  ).join('\n');
}

export async function restoreSourceTableWidths(filePath, sections) {
  const { value } = await mammoth.convertToHtml({ path: filePath });
  const html = await attachSourceColumnWidths(filePath, value);
  const { document: sourceDocument } = parseHTML(`<html><body>${cleanHtml(html)}</body></html>`);
  const sourceTables = new Map();
  sourceDocument.querySelectorAll('table').forEach(table => {
    const colgroup = table.querySelector('colgroup');
    if (!colgroup) return;
    const signature = tableHeaderSignature(table);
    if (!sourceTables.has(signature)) sourceTables.set(signature, colgroup.cloneNode(true));
  });
  return sections.map(section => {
    let changed = false;
    const subsections = section.subsections.map(subsection => {
      const { document } = parseHTML(`<html><body>${subsection.content || ''}</body></html>`);
      let subsectionChanged = false;
      document.querySelectorAll('table').forEach(table => {
        if (table.querySelector('colgroup')) return;
        const colgroup = sourceTables.get(tableHeaderSignature(table));
        if (!colgroup) return;
        table.insertBefore(colgroup.cloneNode(true), table.firstChild);
        changed = true;
        subsectionChanged = true;
      });
      return subsectionChanged ? { ...subsection, content: document.body.innerHTML } : subsection;
    });
    return changed ? { ...section, subsections } : section;
  });
}

export async function importDocxSections(filePath) {
  const { value } = await mammoth.convertToHtml({ path: filePath });
  const html = await attachSourceColumnWidths(filePath, value);
  const { document } = parseHTML(`<html><body>${cleanHtml(html)}</body></html>`);
  const blocks = [...document.body.children];
  const candidates = [];
  const consumedTitleIndices = new Set();

  for (let index = 0; index < blocks.length; index += 1) {
    const headingIndex = index;
    const headingBlock = blocks[index];
    const heading = chapterHeadingInBlock(headingBlock);
    if (!heading) continue;
    const next = blocks[index + 1];
    if (!heading.title && next &&
      (isUppercaseTitle(next.textContent) || /^H[1-6]$/.test(next.nodeName))) {
      heading.title = next.textContent.trim();
      consumedTitleIndices.add(index + 1);
      index += 1;
    }
    candidates.push({ index: headingIndex, heading, block: headingBlock });
  }

  const styledCandidates = candidates.filter(candidate =>
    /^H[1-6]$/.test(candidate.block.nodeName) || candidate.block.nodeName === 'TABLE'
  );
  const hasCompleteSequence = items => {
    const first = items.findIndex(candidate => candidate.heading.roman === 'I');
    return first >= 0 && items.some((candidate, index) =>
      index >= first && /PENUTUP/i.test(candidate.heading.title)
    );
  };
  const chapterCandidates = hasCompleteSequence(styledCandidates) ? styledCandidates : candidates;
  const systematicIndex = chapterCandidates === candidates
    ? blocks.findLastIndex(block => /SISTEMATIKA\s+PENULISAN/i.test(block.textContent))
    : -1;
  const firstChapterIndex = chapterCandidates.findIndex(candidate =>
    candidate.heading.roman === 'I' && candidate.index > systematicIndex
  );
  if (firstChapterIndex < 0) {
    const found = chapterCandidates.map(({ heading }) => `BAB ${heading.roman}${heading.title ? ` ${heading.title}` : ''}`);
    throw new Error(`BAB I tidak dikenali pada DOCX${found.length ? `; judul BAB terbaca: ${found.join(', ')}` : ''}. Sistem mengenali format seperti “BAB I PENDAHULUAN” atau “BAB I” diikuti judul BAB pada baris berikutnya.`);
  }
  const closingIndex = chapterCandidates.findLastIndex((candidate, index) =>
    index >= firstChapterIndex && /PENUTUP/i.test(candidate.heading.title)
  );
  if (closingIndex < 0 || closingIndex < firstChapterIndex) {
    throw new Error('BAB Penutup tidak ditemukan pada DOCX. Lampiran otomatis memerlukan dokumen lengkap sampai BAB Penutup.');
  }

  const chapters = [];
  let lastChapterNumber = 0;
  const candidateByIndex = new Map(chapterCandidates.map(candidate => [candidate.index, candidate]));
  const nextChapterIndex = chapterCandidates[closingIndex + 1]?.index ?? blocks.length;
  for (let index = chapterCandidates[firstChapterIndex].index; index < nextChapterIndex; index += 1) {
    const block = blocks[index];
    const candidate = candidateByIndex.get(index);
    if (!candidate) {
      if (chapters.length && !consumedTitleIndices.has(index)) chapters.at(-1).blocks.push(block);
      continue;
    }

    const number = chapterNumber(candidate.heading.roman);
    if (number <= lastChapterNumber) {
      chapters.at(-1).blocks.push(block);
      continue;
    }
    lastChapterNumber = number;
    const chapter = { ...candidate.heading, blocks: [] };
    if (block.nodeName === 'TABLE') chapter.blocks.push(block);
    chapters.push(chapter);
  }

  return chapters.map((chapter, index) => {
    const subsections = [];
    let current = null;
    let generatedNumber = 0;
    const chapterIndex = chapterNumber(chapter.roman);
    const hasStyledSubsections = chapter.blocks.some(block =>
      /^H[2-6]$/.test(block.nodeName) ||
      (/^H1$/.test(block.nodeName) && subsectionHeading(block, '', chapterIndex, false))
    );
    const addSubsection = (heading, block) => {
      if (current) subsections.push(current);
      current = {
        id: `import-sub-${index + 1}-${generatedNumber + 1}`,
        code: heading.code,
        title: heading.title,
        locked: true,
        content: ''
      };
      if (block) current.content = block.outerHTML;
    };

    for (const block of chapter.blocks) {
      const fallbackCode = `${index + 1}.${generatedNumber + 1}`;
      const heading = subsectionHeading(block, fallbackCode, chapterIndex, !hasStyledSubsections);
      if (heading) {
        generatedNumber += 1;
        addSubsection(heading);
      } else {
        if (!current) {
          generatedNumber += 1;
          addSubsection({ code: `${index + 1}.${generatedNumber}`, title: 'URAIAN' });
        }
        current.content += block.outerHTML;
      }
    }
    if (current) subsections.push(current);

    return {
      id: `import-bab-${index + 1}-${chapter.roman.toLowerCase()}`,
      order: index + 1,
      title: `BAB ${chapter.roman}${chapter.title ? ` ${chapter.title.toUpperCase()}` : ''}`,
      locked: true,
      subsections: subsections.length ? subsections : [{
        id: `import-sub-${index + 1}-1`,
        code: `${index + 1}.1`,
        title: 'URAIAN',
        locked: true,
        content: ''
      }]
    };
  });
}
