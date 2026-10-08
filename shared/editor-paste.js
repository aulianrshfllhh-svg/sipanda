// The same allowlist is used for clipboard input and can be exercised with a DOM in tests.
const allowed = new Set(['P','BR','DIV','SPAN','STRONG','B','EM','I','U','S','SUP','SUB','A','UL','OL','LI','H1','H2','H3','H4','BLOCKQUOTE','TABLE','COLGROUP','COL','THEAD','TBODY','TFOOT','TR','TH','TD','IMG']);
const discard = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','META','LINK','FORM','INPUT','BUTTON','SVG','MATH','NOSCRIPT','TEMPLATE']);

export function pasteDocument(document, html) {
  const root = document.createElement('div');
  root.innerHTML = html || '';
  return root;
}

function cleanElement(element, { allowBold = false, preserveStructure = false } = {}) {
  const tag = element.tagName;
  if (discard.has(tag)) { element.remove(); return; }
  if (!allowed.has(tag)) { element.replaceWith(...element.childNodes); return; }
  const style = element.getAttribute('style') || '';
  const attributes = {};
  // Imported Word captions keep their semantic role; IDs are assigned by this document.
  if (tag==='P' && (element.classList.contains('doc-caption') || /^(Tabel|Gambar)\s+\d+(?:\.\d+)+\s+/i.test(element.textContent || '')) && !element.closest('table')) attributes.class='doc-caption';
  if (['TD','TH'].includes(tag)) for (const name of ['colspan','rowspan']) {
    const value = Number(element.getAttribute(name));
    if (Number.isInteger(value) && value > 1 && value <= 1000) attributes[name] = String(value);
  }
  if (tag === 'OL') {
    const type = element.getAttribute('type') || (/lower-alpha/i.test(style) ? 'a' : /lower-roman/i.test(style) ? 'i' : '1');
    if (/^(1|a|A|i|I)$/.test(type)) attributes.type = type;
    const start = element.getAttribute('start');
    if (/^\d{1,7}$/.test(start || '')) attributes.start = start;
  }
  if (tag === 'A' && /^https?:\/\//i.test(element.getAttribute('href') || '')) attributes.href = element.getAttribute('href');
  if (tag === 'IMG') {
    const src = element.getAttribute('src') || '';
    if (!/^data:image\/(png|jpeg|webp);base64,/i.test(src)) {
      element.replaceWith(element.ownerDocument.createTextNode('[Gambar sumber tidak terbaca; tempel gambar dari clipboard]')); return;
    }
    attributes.src = src;
    attributes.alt = element.getAttribute('alt') || '';
  }
  // Office stores formatting in spans. Retain semantic italics, scripts and template-approved bold.
  const italic = /font-style\s*:\s*italic/i.test(style);
  const bold = allowBold && /font-weight\s*:\s*(bold|[6-9]00)/i.test(style);
  const script = /vertical-align\s*:\s*(super|sub)/i.exec(style)?.[1];
  const align = preserveStructure && /text-align\s*:\s*(left|center|right|justify)/i.exec(style)?.[1];
  const width = tag === 'COL' && /width\s*:\s*(\d+(?:\.\d+)?)%/i.exec(style)?.[1];
  for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  if (width && Number(width) <= 100) element.setAttribute('style', `width:${width}%`);
  else if (align) element.setAttribute('style', `text-align:${align}`);
  if (['B','STRONG'].includes(tag) && !allowBold) { element.replaceWith(...element.childNodes); return; }
  for (const wrapper of [italic ? 'em' : '', bold ? 'strong' : '', script === 'super' ? 'sup' : script === 'sub' ? 'sub' : ''].filter(Boolean)) {
    const semantic = element.ownerDocument.createElement(wrapper);
    semantic.append(...element.childNodes); element.append(semantic);
  }
}

export function sanitizePaste(root, options = {}) {
  normalizeOfficeLists(root);
  // Reverse order cleans descendants before unwrapping unknown or disallowed formatting tags.
  for (const element of [...root.querySelectorAll('*')].reverse()) cleanElement(element, options);
  normalizeTables(root);
  return root.innerHTML;
}

export async function sanitizePasteAsync(root, options = {}, progress = () => {}) {
  normalizeOfficeLists(root);
  const elements = [...root.querySelectorAll('*')].reverse();
  for (let i = 0; i < elements.length; i++) {
    cleanElement(elements[i], options);
    if (i % 400 === 0) { progress(Math.round(i / Math.max(1, elements.length) * 100)); await new Promise(resolve => setTimeout(resolve, 0)); }
  }
  normalizeTables(root); progress(100);
  return root.innerHTML;
}

function normalizeOfficeLists(root) {
  const stacks = new Map();
  for (const paragraph of [...root.querySelectorAll('p')]) {
    const style = paragraph.getAttribute('style') || '';
    const marker = paragraph.querySelector('[style*="mso-list:Ignore"], [style*="mso-list: Ignore"]');
    const isOffice = /mso-list\s*:/i.test(style) && !/mso-list\s*:\s*none/i.test(style);
    if (!isOffice) { stacks.delete(paragraph.parentNode); continue; }
    const prefix = (marker?.textContent || paragraph.textContent || '').match(/^\s*([a-z]|[ivxlcdm]+|\d+)[.)]\s*/i);
    const type = prefix ? /^\d+$/.test(prefix[1]) ? '1' : /^[ivxlcdm]{2,}$/i.test(prefix[1]) || prefix[1] === 'i' ? 'i' : 'a' : null;
    const depth = Math.min(3, Number(style.match(/level(\d+)/i)?.[1] || 1));
    const parent = paragraph.parentNode;
    let stack = stacks.get(parent) || [];
    stack = stack.slice(0, depth);
    let list = stack[depth - 1];
    if (!list || list.tagName !== (type ? 'OL' : 'UL') || (type && list.getAttribute('type') !== type)) {
      list = paragraph.ownerDocument.createElement(type ? 'ol' : 'ul');
      if (type) list.setAttribute('type', type);
      if (depth > 1 && stack[depth - 2]?.lastElementChild) stack[depth - 2].lastElementChild.append(list);
      else parent.insertBefore(list, paragraph);
      stack[depth - 1] = list;
    }
    const item = paragraph.ownerDocument.createElement('li');
    if (marker) marker.remove();
    else if (prefix) {
      let remaining = prefix[0].length;
      const removePrefix = node => {
        for (const child of [...node.childNodes]) {
          if (!remaining) return;
          if (child.nodeType === 3) { const amount = Math.min(remaining, child.textContent.length); child.textContent = child.textContent.slice(amount); remaining -= amount; }
          else removePrefix(child);
        }
      };
      removePrefix(paragraph);
    }
    item.append(...paragraph.childNodes); list.append(item); paragraph.remove(); stacks.set(parent, stack);
  }
}

function normalizeTables(root) {
  for (const table of root.querySelectorAll('table')) {
    // Retain merged cells and their text verbatim. Do not guess numeric values on paste.
    if (!table.querySelector('thead')) {
      const first = table.querySelector('tr');
      if (first && [...first.children].every(cell => cell.tagName === 'TH')) {
        const head = table.ownerDocument.createElement('thead'); head.append(first); table.prepend(head);
      }
    }
    if (!table.querySelector('tbody')) {
      const body = table.ownerDocument.createElement('tbody');
      for (const row of [...table.children].filter(child => child.tagName === 'TR')) body.append(row);
      table.append(body);
    }
  }
}

export function plainTextHtml(document, text) {
  const root = document.createElement('div');
  // Spreadsheet text fallback uses tab-delimited rows, keeping Indonesian numbers as strings.
  if (text.includes('\t')) {
    const table = document.createElement('table'), body = document.createElement('tbody');
    for (const line of text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n')) {
      const row = document.createElement('tr');
      for (const value of line.split('\t')) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
      body.append(row);
    }
    table.append(body); root.append(table);
  } else for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const paragraph = document.createElement('p'); paragraph.textContent = line;
    if (!line) paragraph.append(document.createElement('br'));
    root.append(paragraph);
  }
  return root.innerHTML;
}
