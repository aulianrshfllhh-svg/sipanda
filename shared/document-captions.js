const validId = value => /^[\w-]{1,160}$/.test(value || '');
function kindOf(caption) {
  const number=caption.querySelector('.doc-caption-number')?.textContent;
  return number && /^(Tabel|Gambar)/i.test(number) ? (/^Gambar/i.test(number)?'Gambar':'Tabel') : caption.getAttribute('data-caption-kind') || (/^Gambar/i.test(caption.textContent || '')?'Gambar':'Tabel');
}
export function captionTitle(node) {
  const title = node.querySelector('.doc-caption-title');
  return (title?.textContent ?? node.textContent ?? '').replace(/^(?:Tabel|Gambar)\s+\d+(?:\.\d+)*\s*[-\u2013:]?\s*/i, '').trim();
}

// Deterministic fallback for legacy, read-only content. Once stored, the ID survives title edits.
function legacyId(subId, kind, title, occurrence) {
  let hash = 2166136261;
  for (const character of `${subId}\0${kind}\0${title}\0${occurrence}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return `caption-${hash.toString(16)}-${String(subId).replace(/[^\w-]/g, '').slice(0,70)}`;
}

export function captionObject(caption, root) {
  const kind = kindOf(caption);
  const tag = kind === 'Gambar' ? 'IMG' : 'TABLE';
  const owner = caption.querySelector('.doc-caption-title')?.getAttribute('data-caption-owner') || caption.querySelector('.doc-caption-number')?.getAttribute('data-caption-owner');
  const target = validId(owner) ? owner : caption.getAttribute('data-caption-for');
  const adjacent = [caption.previousElementSibling, caption.nextElementSibling];
  if (validId(target)) {
    const object = adjacent.find(node=>node?.tagName===tag&&node.getAttribute('data-object-id')===target) || [...root.querySelectorAll(tag.toLowerCase())].find(node => node.getAttribute('data-object-id') === target);
    // An explicit association is authoritative, even when its object has been removed.
    return object || null;
  }
  return adjacent.find(node => node?.tagName === tag) || null;
}

function stripPrefix(root, amount) {
  for (const node of [...root.childNodes]) {
    if (!amount) break;
    if (node.nodeType === 3) {
      const count = Math.min(amount, node.textContent.length);
      node.textContent = node.textContent.slice(count); amount -= count;
    } else amount = stripPrefix(node, amount);
  }
  return amount;
}

export function setCaptionNumber(caption, number, id) {
  let label = caption.querySelector('.doc-caption-number');
  if (!label) {
    const prefix = (caption.textContent || '').match(/^(?:Tabel|Gambar)\s+\d+(?:\.\d+)*\s*[-\u2013:]?\s*/i)?.[0] || '';
    stripPrefix(caption, prefix.length);
    const title = caption.ownerDocument.createElement('span'); title.className = 'doc-caption-title';
    title.append(...caption.childNodes);
    label = caption.ownerDocument.createElement('span'); label.className = 'doc-caption-number';
    caption.append(label, caption.ownerDocument.createTextNode(' '), title);
  }
  label.setAttribute('contenteditable', 'false');
  if (id) {
    label.setAttribute('data-caption-owner',id);
    caption.querySelector('.doc-caption-title')?.setAttribute('data-caption-owner',id);
  }
  if (label.textContent !== number) label.textContent = number;
}

/** Build a document-wide index against detached or live DOM roots, without changing template topology. */
export function indexCaptions(sections, rootForSub, { normalize = false, tableTitle = () => '', editable = () => true } = {}) {
  const entries = [], roots = [], used = new Set(), duplicates = new Map();
  for (const [chapter, bab] of sections.entries()) {
    let tables = 0, images = 0;
    for (const sub of bab.subsections || []) {
      const root = rootForSub(sub); roots.push({ root, sub, bab });
      for (const caption of root.querySelectorAll('.doc-caption')) {
        const kind = kindOf(caption);
        const title = captionTitle(caption), key = `${sub.id}\0${kind}\0${title}`;
        const occurrence = (duplicates.get(key) || 0) + 1; duplicates.set(key, occurrence);
        let id = caption.querySelector('.doc-caption-title')?.getAttribute('data-caption-owner') || caption.getAttribute('data-caption-id');
        if (!validId(id) || used.has(id)) id = legacyId(sub.id,kind,title,occurrence);
        while (used.has(id)) id += '-copy';
        used.add(id);
        const object = captionObject(caption, root);
        // Explicitly bound orphan captions must not keep a deleted target alive.
        const orphan = !!caption.getAttribute('data-caption-for') && !object;
        if (normalize) caption.classList.toggle('doc-caption-orphan',orphan);
        if (orphan) continue;
        const number = `${kind} ${chapter + 1}.${kind === 'Gambar' ? ++images : ++tables}`;
        const entry = { id, kind, title, number, label: `${number}${title ? ` ${title}` : ''}`, subId:sub.id, babId:bab.id || bab.babId, caption, object, orphan };
        entries.push(entry);
        if (normalize) {
          setCaptionNumber(caption,number,editable(bab.id || bab.babId) ? id : undefined);
          if (editable(bab.id || bab.babId)) {
            caption.setAttribute('data-caption-id', id); caption.setAttribute('data-caption-kind', kind);
            if (object) { object.setAttribute('data-object-id',id);caption.setAttribute('data-caption-for',id); }
          }
        }
      }
      for (const table of sub.tables || []) {
        const number = `Tabel ${chapter + 1}.${++tables}`, title = tableTitle(table.type);
        entries.push({ id:table.id,kind:'Tabel',title,number,label:`${number} ${title}`,subId:sub.id,babId:bab.id || bab.babId,caption:null,object:null,orphan:false });
      }
    }
  }
  const targets = new Map(entries.filter(entry=>!entry.orphan).map(entry=>[entry.id,entry]));
  const broken = [];
  if (normalize) for (const {root,sub,bab} of roots) for (const reference of root.querySelectorAll('.doc-reference')) {
    const id = reference.getAttribute('data-reference-id'), target = targets.get(id);
    const text = target ? `lihat ${target.number}` : '[Rujukan tidak ditemukan]';
    if (reference.textContent !== text) reference.textContent = text;
    reference.classList.toggle('doc-reference-broken', !target);
    reference.setAttribute('contenteditable','false');
    if (!target) broken.push({id,subId:sub.id,babId:bab.id || bab.babId});
  }
  return { entries, roots, broken };
}
