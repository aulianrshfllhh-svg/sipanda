import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
const w = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const a = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const regularFamily = name => name.replace(/Arial\s*Black/ig, 'Arial').replace(/[- ,]*(?:Semi[- ]?Bold|Extra[- ]?Bold|Bold|Demi|Heavy|Black)/ig, '').trim();
export async function normalWeightDocx(zip) {
 for (const [name, entry] of Object.entries(zip.files)) {
  if (entry.dir || !/^word\/.*\.xml$/.test(name)) continue;
  const xml = await entry.async('string');
  if (!xml.includes(w) && !xml.includes(a)) continue;
  const dom = new DOMParser().parseFromString(xml, 'text/xml');
  // Explicit false overrides inherited paragraph, character, table and default styles.
  for (const run of [...dom.getElementsByTagNameNS(w, 'r')]) {
   let props = [...run.childNodes].find(n => n.namespaceURI === w && n.localName === 'rPr');
   if (!props) { props = dom.createElementNS(w, 'w:rPr'); run.insertBefore(props, run.firstChild); }
   for (const kind of ['b', 'bCs']) {
    let flag = [...props.childNodes].find(n => n.namespaceURI === w && n.localName === kind);
    if (!flag) { flag = dom.createElementNS(w, `w:${kind}`); props.appendChild(flag); }
    flag.setAttributeNS(w, 'w:val', '0');
   }
  }
  for (const kind of ['b', 'bCs']) for (const flag of [...dom.getElementsByTagNameNS(w, kind)]) flag.setAttributeNS(w, 'w:val', '0');
  for (const kind of ['rPr', 'defRPr', 'endParaRPr']) for (const props of [...dom.getElementsByTagNameNS(a, kind)]) props.setAttribute('b', '0');
  for (const fonts of [...dom.getElementsByTagNameNS(w, 'rFonts')]) for (const attr of ['ascii', 'hAnsi', 'eastAsia', 'cs']) {
   if (fonts.hasAttributeNS(w, attr)) fonts.setAttributeNS(w, `w:${attr}`, regularFamily(fonts.getAttributeNS(w, attr)));
  }
  for (const kind of ['latin', 'ea', 'cs']) for (const fonts of [...dom.getElementsByTagNameNS(a, kind)]) {
   if (fonts.hasAttribute('typeface')) fonts.setAttribute('typeface', regularFamily(fonts.getAttribute('typeface')));
  }
  zip.file(name, new XMLSerializer().serializeToString(dom));
 }
}
