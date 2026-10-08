import {parseHTML} from 'linkedom';
import {tableColumns,tableDefinitions,calculatedRows,tableNeedsLandscape} from '../shared/document-tables.js';
import {escapeHtml as e} from './templates.js';
import fs from 'node:fs';
import { indexCaptions } from '../shared/document-captions.js';
import { F4_PAGE_CSS, F4_SCREEN_LAYOUT_CSS } from '../shared/f4-page-layout.js';
const bookmanFont=fs.readFileSync(new URL('./assets/fonts/URWBookman-Light.ttf',import.meta.url)).toString('base64');
const imageCss='.list-continuation::marker{content:""}.doc-caption-orphan{display:none}.doc-reference-broken{color:#991b1b}.doc-figure{max-width:100%;margin-top:12px;margin-bottom:12px;break-inside:avoid;display:block}.doc-figure img{width:100%;max-width:100%;max-height:none;height:auto;display:block;margin:0}.doc-figure>.doc-caption{display:block;margin:6px 0 0;text-align:center;line-height:1.3;text-indent:0}.doc-image-left{margin-left:0;margin-right:auto}.doc-image-center{margin-left:auto;margin-right:auto}.doc-image-right{margin-left:auto;margin-right:0}.doc-figure.doc-image-inline{display:inline-block;vertical-align:middle;margin:4px}';
const allowed=new Set(['P','BR','DIV','SPAN','STRONG','B','EM','I','U','S','SUP','SUB','A','UL','OL','LI','H1','H2','H3','H4','BLOCKQUOTE','TABLE','COLGROUP','COL','THEAD','TBODY','TFOOT','TR','TH','TD','IMG']);
export function cleanHtml(html, offline = true) {
 const {document}=parseHTML(`<html><body>${html||''}</body></html>`);
 function clean(node){for(const child of [...node.children]){
  if(!allowed.has(child.tagName)){child.remove();continue;}
  for(const attr of [...child.attributes])if(!['class','src','alt','colspan','rowspan','style','type','start','href','data-cover-layout','data-orientation','data-caption-id','data-caption-for','data-caption-kind','data-caption-owner','data-object-id','data-reference-id','data-image-width','data-image-height','contenteditable'].includes(attr.name))child.removeAttribute(attr.name);
  for(const attr of [...child.attributes]){
   if(attr.name==='data-cover-layout'&&(child.tagName!=='DIV'||!child.classList.contains('cover-layout')||attr.value!=='true'))child.removeAttribute(attr.name);
   if(attr.name==='data-orientation'&&(child.tagName!=='DIV'||!child.classList.contains('doc-section-break')||!['portrait','landscape'].includes(attr.value)))child.removeAttribute(attr.name);
   if(['data-caption-id','data-caption-for'].includes(attr.name)&&(!child.classList.contains('doc-caption')||!['P','SPAN'].includes(child.tagName)||!/^[\w-]{1,160}$/.test(attr.value)))child.removeAttribute(attr.name);
   if(attr.name==='data-caption-kind'&&(!child.classList.contains('doc-caption')||!['Tabel','Gambar'].includes(attr.value)))child.removeAttribute(attr.name);
   if(attr.name==='data-caption-owner'&&(child.tagName!=='SPAN'||!(child.classList.contains('doc-caption-number')||child.classList.contains('doc-caption-title'))||!/^[\w-]{1,160}$/.test(attr.value)))child.removeAttribute(attr.name);
   if(attr.name==='data-object-id'&&(!['TABLE','IMG'].includes(child.tagName)||!/^[\w-]{1,160}$/.test(attr.value)))child.removeAttribute(attr.name);
   if(attr.name==='data-reference-id'&&(child.tagName!=='SPAN'||!child.classList.contains('doc-reference')||!/^[\w-]{1,160}$/.test(attr.value)))child.removeAttribute(attr.name);
   if(['data-image-width','data-image-height'].includes(attr.name)&&(child.tagName!=='IMG'||!/^\d{1,5}$/.test(attr.value)||Number(attr.value)<1||Number(attr.value)>10000))child.removeAttribute(attr.name);
   if(attr.name==='contenteditable'&&(attr.value!=='false'||!(child.classList.contains('doc-caption-number')||child.classList.contains('doc-reference')||child.classList.contains('doc-page-break')||child.classList.contains('doc-section-break'))))child.removeAttribute(attr.name);
  }
  if(child.hasAttribute('href') && (child.tagName!=='A' || !/^https?:\/\//i.test(child.getAttribute('href'))))child.removeAttribute('href');
  if(child.hasAttribute('type') && (child.tagName!=='OL' || !/^(1|a|A|i|I)$/.test(child.getAttribute('type'))))child.removeAttribute('type');
  if(child.hasAttribute('start') && (child.tagName!=='OL' || !/^\d{1,7}$/.test(child.getAttribute('start'))))child.removeAttribute('start');
  if(child.tagName==='IMG' && !/^data:image\/(png|jpeg|webp);base64,/i.test(child.getAttribute('src')||'') && (offline || !/^(https?:\/\/|\/uploads\/)/i.test(child.getAttribute('src')||''))){child.replaceWith(document.createTextNode(`[Gambar: ${child.getAttribute('alt')||'impor gambar lokal untuk ekspor'}]`));continue;}
  const style=child.getAttribute('style')||'';child.removeAttribute('style');
  const align=style.match(/text-align:\s*(left|center|right|justify)/i);
  const vertical=['TD','TH'].includes(child.tagName)&&style.match(/vertical-align:\s*(top|middle|bottom)/i);
  const layout=child.tagName==='TABLE'&&style.match(/table-layout:\s*(auto|fixed)/i);
  const width=child.tagName==='COL'&&style.match(/width:\s*(\d+(?:\.\d+)?%)/i);
  const imageWidth=child.classList.contains('doc-figure')&&['DIV','SPAN'].includes(child.tagName)&&style.match(/(?:^|;)\s*width:\s*(\d+(?:\.\d+)?)%/i);
  const fontSize=style.match(/(?:^|;)\s*font-size:\s*(\d{1,2}(?:\.\d+)?(?:pt|px))/i);
  const fontWeight=style.match(/(?:^|;)\s*font-weight:\s*(normal|bold|[1-9]00)/i);
  const lineHeight=style.match(/(?:^|;)\s*line-height:\s*(\d(?:\.\d{1,2})?)/i);
  const margin=style.match(/(?:^|;)\s*margin:\s*(\d{1,2}(?:\.\d+)?(?:pt|px|mm))(?:\s+(\d{1,2}(?:\.\d+)?(?:pt|px|mm)))?/i);
  if(width)child.setAttribute('style',`width:${width[1]}`);
  else {
   const rules=[];
   if(align)rules.push(`text-align:${align[1]}`);
   if(vertical)rules.push(`vertical-align:${vertical[1]}`);
   if(layout)rules.push(`width:100%;table-layout:${layout[1]}`);
   if(imageWidth&&Number(imageWidth[1])>=5&&Number(imageWidth[1])<=100)rules.push(`width:${imageWidth[1]}%`);
   if(fontSize)rules.push(`font-size:${fontSize[1]}`);
   if(fontWeight)rules.push(`font-weight:${fontWeight[1]}`);
   if(lineHeight&&Number(lineHeight[1])>=0.8&&Number(lineHeight[1])<=3)rules.push(`line-height:${lineHeight[1]}`);
   if(margin)rules.push(`margin:${margin[1]}${margin[2]?` ${margin[2]}`:''}`);
   if(rules.length)child.setAttribute('style',rules.join(';'));
  }
  clean(child);
 }}clean(document.body);return document.body.innerHTML;
}

function captionSections(source) {
 const sections=source.map(section=>({...section,id:section.id||section.babId,title:section.title||section.babTitle,subsections:(section.subsections||[]).map(sub=>({...sub}))}));
 const result=indexCaptions(sections,sub=>parseHTML(`<html><body>${cleanHtml(sub.content)}</body></html>`).document.body,{normalize:true,tableTitle:type=>tableDefinitions[type]?.title||''});
 for(const {root,sub} of result.roots){root.querySelectorAll('.doc-caption-orphan').forEach(caption=>caption.remove());sub.content=root.innerHTML;}
 return sections;
}

// Flatten editor section wrappers while retaining their orientation transitions.
function orientationNodes(root) {
 const nodes=[];
 function visit(node){
  if(node.classList?.contains('doc-section-break')){
   nodes.push({orientation:node.dataset.orientation==='landscape'});
  }else if(node.classList?.contains('doc-section')){
   nodes.push({orientation:node.classList.contains('doc-section-landscape')});
   for(const child of node.children)visit(child);
  }else if([...node.classList||[]].some(name=>name.startsWith('paste-'))){for(const child of node.children)visit(child);}
  else nodes.push({node});
 }
 for(const node of root.children)visit(node);
 return nodes;
}

function signature(settings){const p=settings.opd;return `<div class="signature"><p>${e(p.tempat||'Sumber')}, ${e(p.bulan||'................')}</p><p>${e(p.jabatan||'[Jabatan pimpinan]')}</p><p class="sign-space">${e(p.pimpinan||'[Nama pimpinan]')}</p><p>${e(p.pangkat)}</p><p>NIP ${e(p.nip||'................')}</p></div>`;}
function standardTable(t,year){const definition=tableDefinitions[t.type],calc=calculatedRows(t),columns=tableColumns(t.type,year);return `<table>${t.type==='renja'?'<colgroup>'+[6,22,12,7,7,10,9,7,8,12].map(w=>`<col style="width:${w}%">`).join('')+'</colgroup>':''}<thead><tr>${columns.map(c=>`<th>${e(c)}</th>`).join('')}</tr></thead><tbody>${calc.rows.map(r=>`<tr class="${r.aggregate?'aggregate':''}">${r.cells.map((v,j)=>`<td>${t.type==='renja'&&[5,9].includes(j)?Number(v).toLocaleString('id-ID'):e(v)}</td>`).join('')}</tr>`).join('')}</tbody>${t.type==='renja'?`<tfoot><tr><th colspan="5">JUMLAH</th><th>${calc.total.toLocaleString('id-ID')}</th><td colspan="3"></td><th>${calc.totalMaju.toLocaleString('id-ID')}</th></tr></tfoot>`:''}</table>`;}
export function coverDetails(doc,settings){
 const type=String(doc.jenis||'').toLocaleLowerCase('id-ID'),name=settings.opdRecord?.nama||settings.opd?.nama||doc.opdName||'',year=String(doc.tahun||''),reg=doc.regulation||{};
 const period=year.includes('-')?year:`${reg.periodeMulai||year}-${reg.periodeAkhir||Number(reg.periodeMulai||year)+4}`;
 let title='RENCANA KERJA (RENJA)',middle=name.toLocaleUpperCase('id-ID'),yearLine=`TAHUN ${year}`;
 if(type.includes('rkpd')){title=`${type.includes('perubahan')?'PERUBAHAN ':''}RENCANA KERJA PEMERINTAH DAERAH (RKPD)`;middle='KABUPATEN CIREBON';}
 else if(type.includes('rpjmd')){title='RENCANA PEMBANGUNAN JANGKA MENENGAH DAERAH (RPJMD)';middle='KABUPATEN CIREBON';yearLine=`TAHUN ${period}`;}
 else if(type.includes('renstra')){title=`${type.includes('perubahan')?'PERUBAHAN ':''}RENCANA STRATEGIS (RENSTRA)`;yearLine=`TAHUN ${period}`;}
 else if(type.includes('perubahan'))title='PERUBAHAN RENCANA KERJA (RENJA)';
 const orgName=middle.toLocaleUpperCase('id-ID');
 const identity=/^kecamatan\b/i.test(name)?`${orgName} KABUPATEN CIREBON`:/(?:kabupaten cirebon)$/i.test(name)?orgName:`${orgName} KABUPATEN CIREBON`;
 const address=String(settings.opd?.alamat||'').trim(),logo=String(settings.global?.logoData||'');
 const titleSize=name.length>75?14:name.length>50?16:18;
 return {name,identity,address,logo,title,middle,yearLine,titleSize};
}
export function coverHtml(doc,settings){
 if(typeof doc.frontMatter?.cover==='string'&&doc.frontMatter.cover.trim()){
  const cleaned=cleanHtml(doc.frontMatter.cover,false),parsed=parseHTML(`<html><body>${cleaned}</body></html>`).document;
  const walker=parsed.createTreeWalker(parsed.body,4);let textNode;
  while((textNode=walker.nextNode()))textNode.textContent=textNode.textContent.replace(/\[Alamat OPD belum diisi\]/gi,'').replace(/Petunjuk:\s*[^<]*/gi,'');
  parsed.querySelectorAll('p,span').forEach(node=>{if(!node.textContent.trim()&&!node.querySelector('img'))node.remove();});
  return parsed.body.innerHTML;
 }
 const cover=coverDetails(doc,settings);
 return `<div class="cover-layout" data-cover-layout="true"><div class="cover-top">${cover.logo?`<img class="cover-logo" src="${e(cover.logo)}" alt="Logo Kabupaten Cirebon"/>`:''}<p class="cover-government">PEMERINTAH KABUPATEN CIREBON</p></div><div class="cover-middle"><p class="cover-title" style="font-size:${cover.titleSize}pt">${e(cover.title)}</p><p class="cover-org" style="font-size:${cover.titleSize}pt">${e(cover.middle)}</p><p class="cover-year" style="font-size:${cover.titleSize}pt">${e(cover.yearLine)}</p></div><div class="cover-bottom"><p>${e(cover.identity)}</p>${cover.address?`<p>${e(cover.address)}</p>`:''}</div></div>`;
}
function formatImportedTables(document,annex=false){
 document.querySelectorAll('table').forEach(table=>{
  const columnCount=Math.max(0,...[...table.querySelectorAll('tr')].map(row=>
   [...row.children].reduce((count,cell)=>count+Number(cell.getAttribute('colspan')||1),0)
  ));
  table.style.width='100%';
  table.style.tableLayout='fixed';
  if(annex)table.style.fontSize=columnCount>14?'7pt':columnCount>9?'8pt':'9pt';
  table.querySelectorAll('th,td').forEach(cell=>{
   cell.style.overflowWrap='break-word';
   cell.style.wordBreak='normal';
   if(!cell.style.verticalAlign)cell.style.verticalAlign='middle';
  });
  table.querySelectorAll('p').forEach(paragraph=>{
   paragraph.style.textIndent='0';
   paragraph.style.textAlign='left';
   paragraph.style.margin='0';
  });
 });
}
function annexCleanHtml(html){
 const parsed=parseHTML(`<html><body>${cleanHtml(html)}</body></html>`).document;
 parsed.querySelectorAll('b,strong').forEach(node=>node.replaceWith(...node.childNodes));
 parsed.querySelectorAll('[style]').forEach(node=>{
  const style=node.getAttribute('style')||'';
  const safe=style.split(';').filter(rule=>rule.trim()&&!/^font-weight\s*:/i.test(rule)).join(';');
  if(safe)node.setAttribute('style',safe);else node.removeAttribute('style');
 });
 formatImportedTables(parsed,true);
 return parsed.body.innerHTML;
}
function renderAttachmentDocument(doc,settings){
 const type=doc.jenis,reg=doc.regulation||{},opdName=settings.opdRecord?.nama||doc.opdName||settings.opd.nama;
 const number=settings.opdRecord?.nomorLampiran||'';
 const isChange=type==='Lampiran Kepbup Perubahan Renja';
 const isRenstra=type==='Lampiran Perbup Renstra';
 const periodStart=reg.periodeMulai||doc.tahun;
 const periodEnd=reg.periodeAkhir||periodStart;
 const period=isRenstra&&periodEnd!==periodStart?`${periodStart}-${periodEnd}`:doc.tahun;
 const adoptionYear=reg.tahunPenetapan||String(Number(doc.tahun)-(isChange?0:1));
 const opening=isChange
  ? `<div class="opening-block opening-wide"><p>LAMPIRAN ${e(number)} KEPUTUSAN BUPATI CIREBON</p><p>NOMOR : ${e(reg.nomorKepbup||'')}</p><p>TANGGAL : ${e(reg.tanggalKepbup||'')}</p><p>TENTANG : PERUBAHAN RENCANA KERJA PERANGKAT DAERAH ${e(opdName)} TAHUN ${e(doc.tahun)}</p></div>`
  : `<div class="opening-block opening-half"><p>LAMPIRAN ${e(number)}</p><p>PERATURAN BUPATI CIREBON</p><p>NOMOR ${e(reg.nomorPeraturan||'')} TAHUN ${e(adoptionYear)}</p><p>TENTANG</p><p>${isRenstra?'RENCANA STRATEGIS':'RENCANA KERJA'} PERANGKAT DAERAH ${e(opdName)} TAHUN ${e(period)}</p></div>`;
 const article=(html,landscape=false)=>`<article data-part="body" data-landscape="${landscape}">${html}</article>`;
 const sectionBreak=orientation=>`<div class="doc-section-break" data-orientation="${orientation?'landscape':'portrait'}"></div>`;
 const chapters=captionSections(doc.sections);
 let articles='',landscape=false;
 for(const [i,chapter] of chapters.entries()){
  const match=chapter.title.match(/^(BAB\s+[IVXLCDM]+)\s*(.*)$/i);
  const heading=match
   ? `<h2 data-anchor="${e(chapter.id)}"><span>${e(match[1].toUpperCase())}</span><span>${e(match[2].toUpperCase())}</span></h2>`
   : `<h2 data-anchor="${e(chapter.id)}">${e(chapter.title.toUpperCase())}</h2>`;
  let html=(i===0?opening:'')+heading;
  let tableNo=0,imageNo=0;
  for(const sub of chapter.subsections||[]){
   const subsectionOrientation=sub.orientation==='landscape';
   if(subsectionOrientation!==landscape){html+=sectionBreak(subsectionOrientation);landscape=subsectionOrientation;}
   else if(sub.pageBreakBefore&&html)html+='<div class="doc-page-break"></div>';
   html+=`<h3 data-anchor="${e(sub.id)}">${e(sub.code)}.  ${e(sub.title.toUpperCase())}</h3>`;
   const parsed=parseHTML(`<html><body>${annexCleanHtml(sub.content)}</body></html>`).document;
   parsed.querySelectorAll('.doc-caption').forEach(el=>{
    const image=/^Gambar/i.test(el.textContent),kind=image?'Gambar':'Tabel',seq=image?++imageNo:++tableNo;
    const title=el.textContent.replace(/^(Tabel|Gambar)\s+[\d.]+\s*[-–:]?\s*/i,'').trim();
    el.textContent=`${kind} ${i+1}.${seq} ${title}`;
    el.removeAttribute('data-anchor');
    el.style.fontSize='12pt';
   });
   const contentNodes=orientationNodes(parsed.body);
   for(const [nodeIndex,entry] of contentNodes.entries()){
    if('orientation' in entry){if(landscape!==entry.orientation){html+=sectionBreak(entry.orientation);landscape=entry.orientation;}continue;}
    const node=entry.node;
    if(landscape||node.nodeName!=='TABLE'){html+=node.outerHTML;continue;}
    const previous=contentNodes[nodeIndex-1]?.node;
    const hasRancanganCaption=previous?.classList.contains('doc-caption')&&/rancangan renja/i.test(previous.textContent);
    if(!hasRancanganCaption&&!tableNeedsLandscape(node,175)){html+=node.outerHTML;continue;}
    let caption='';
    if(previous?.classList.contains('doc-caption')&&html.endsWith(previous.outerHTML)){
     caption=previous.outerHTML;
     html=html.slice(0,-caption.length);
    }
    html+=sectionBreak(true)+caption+node.outerHTML+sectionBreak(false);
   }
   for(const table of sub.tables||[]){
    const def=tableDefinitions[table.type];if(!def)continue;
    const label=`Tabel ${i+1}.${++tableNo} ${def.title}`;
    const block=`<p class="doc-caption" style="font-size:12pt">${e(label)}</p>${standardTable(table,doc.tahun).replace('<table>','<table style="font-size:12pt">')}`;
    if(def.landscape)html+=sectionBreak(true)+block+sectionBreak(false);
    else html+=block;
   }
  }
  if(i===chapters.length-1){
   html+=`<div class="closing-block"><p>BUPATI CIREBON,</p><p class="sign-space" aria-label="Ruang tanda tangan"></p><p>${e(settings.global.bupati)}</p></div>`;
  }
  if(html)articles+=html;
 }
 if(articles)articles=article(articles,false);
 return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${e(doc.judul)}</title><style>
 @font-face{font-family:'Bookman Old Style';src:url(data:font/ttf;base64,${bookmanFont}) format('truetype');font-style:normal;font-weight:normal;font-display:block}*{box-sizing:border-box}body{margin:0;background:#e2e8f0;color:#111;font:12pt 'Bookman Old Style','URW Bookman','Bookman',serif;line-height:1.5}#source{display:none}.paper{position:relative;width:210mm;height:297mm;padding:20mm;margin:16px auto;background:white;break-after:page;page:portrait}.page-body{height:257mm;overflow:hidden}.landscape{width:297mm;height:210mm;page:landscape;padding:20mm}.landscape .page-body{height:170mm}.paper.f4{width:215mm;height:330mm;padding:20mm;page:f4-portrait}.paper.f4 .page-body{height:290mm}.paper.landscape.f4{width:330mm;height:215mm;padding:20mm;page:f4-landscape}.paper.landscape.f4 .page-body{height:175mm}footer{position:absolute;bottom:10mm;left:20mm;right:20mm;border-top:1px solid #333;padding-top:2mm;font-size:9pt;text-align:center}.landscape footer{left:20mm;right:20mm}.paper.annex footer{display:none}h1{font-size:18pt}h2{font-size:12pt;text-align:center;font-weight:normal;margin:0 0 20pt}h2 span{display:block}h3{font-size:12pt;font-weight:normal;text-transform:uppercase;margin:12pt 0 6pt}p{margin:0 0 8pt;text-align:justify;text-indent:1cm}table{width:100%;border-collapse:collapse;table-layout:auto;font-size:9pt;line-height:1.25;margin-bottom:10pt}th,td{border:1px solid #333;padding:4pt;overflow-wrap:anywhere;vertical-align:top}th{background:#eee;text-align:center;font-weight:normal}.aggregate{font-weight:normal}.doc-caption{font-size:10pt;text-align:center;font-style:normal;text-indent:0;break-after:avoid}.opening-block{margin:0 0 20pt;text-align:left}.opening-block p{text-align:left;text-indent:0;margin:0}.opening-half{width:50%;margin-left:auto}.opening-wide{width:100%}.closing-block{width:50%;margin:20pt 0 0 auto;break-inside:avoid}.closing-block p{text-align:left;text-indent:0;margin:0}.closing-block .sign-space{height:25mm}.closing-block p:last-child{text-transform:uppercase}.signature{margin:20pt 0 0 auto;width:75mm}.signature p{text-align:center}.sign-space{padding-top:45pt}.right{text-align:right}.toc-row{display:flex;align-items:baseline;font-size:11pt;gap:5pt;margin-bottom:6pt}.toc-row.sub{padding-left:12pt}.toc-row>span:first-child{max-width:90%}.dots{flex:1;border-bottom:1px dotted #333}.regulation{margin-bottom:18pt;font-size:11pt}#error{color:#b91c1c;padding:12px}#error:empty{display:none}@page portrait{size:A4 portrait;margin:0}@page landscape{size:A4 landscape;margin:0}@page f4-portrait{size:215mm 330mm;margin:0}@page f4-landscape{size:330mm 215mm;margin:0}@media print{body{background:white}.paper{margin:0}#error{display:none}}
 ${imageCss}${F4_PAGE_CSS}${F4_SCREEN_LAYOUT_CSS}</style></head><body data-footer="" data-f4="true" data-annex="true"><div id="error" role="alert"></div><div id="source">${articles}</div><main id="pages"></main><script type="module" src="/api/document-assets/paginate.js"></script></body></html>`;
}
export function renderDocument(doc,settings,{editing=false}={}) {
 if(doc.isLampiranOtomatis)return renderAttachmentDocument(doc,settings);
 const name=settings.opd.nama||doc.opdName,year=doc.tahun,attachment=doc.isLampiranOtomatis,change=doc.jenis.includes('Perubahan') || (attachment && doc.subJudul?.includes('Renja Perubahan')),reg=doc.regulation||{};
 const titleCase=value=>String(value||'').toLocaleLowerCase('id-ID').replace(/\b(opd|rkpd|rpjmd|apbd|kua|ppas)\b/gi,match=>match.toLocaleUpperCase('id-ID')).replace(/(^|[\s(/-])([\p{L}])/gu,(_,prefix,letter)=>prefix+letter.toLocaleUpperCase('id-ID'));
 const escapeRegExp=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const sections=captionSections(doc.sections);
 let editorBlock=0;
 let captions=[],toc=[],body='',landscape=false;
 const article=(html,part='body',landscape=false,numbering='auto')=>`<article data-part="${part}" data-landscape="${landscape}"${numbering==='none'?' data-numbering="none"':''}>${html}</article>`;
 const sectionBreak=orientation=>`<div class="doc-section-break" data-orientation="${orientation?'landscape':'portrait'}"></div>`;
 for(const [i,bab] of sections.entries()){
  let t=0,g=0,html=`<h2 data-anchor="${e(bab.id)}" data-toc-level="1">${e(bab.title)}</h2>`;toc.push({anchor:bab.id,label:bab.title.toLocaleUpperCase('id-ID'),level:1});
  if(attachment&&i===0)html=`<div class="regulation"><p>LAMPIRAN PERATURAN BUPATI CIREBON</p><p>NOMOR : ${e(reg.nomor||'................')}</p><p>TANGGAL : ${e(reg.tanggal||'................')}</p><p>TENTANG : ${change?'PERUBAHAN ':''}RENCANA KERJA ${e(name.toUpperCase())} KABUPATEN CIREBON TAHUN ${e(year)}</p></div>`+html;
  for(const sub of bab.subsections){
   let subTitle=titleCase(sub.title);
   if(name)subTitle=subTitle.replace(new RegExp(escapeRegExp(name),'gi'),name);
   toc.push({anchor:sub.id,label:`${sub.code} ${subTitle}`,level:2});
   const subsectionOrientation=sub.orientation==='landscape';
   if(subsectionOrientation!==landscape){html+=sectionBreak(subsectionOrientation);landscape=subsectionOrientation;}
   else if(sub.pageBreakBefore&&html)html+='<div class="doc-page-break"></div>';
   html+=`<h3 data-anchor="${e(sub.id)}" data-toc-level="2">${e(sub.code)} ${e(sub.title)}</h3>`;
   const parsed=parseHTML(`<html><body>${cleanHtml(sub.content)}</body></html>`).document;
   formatImportedTables(parsed);
   parsed.querySelectorAll('h1,h2,h3,h4').forEach((heading,index)=>{
    const isAppendix=/^LAMPIRAN(?:-LAMPIRAN)?$/i.test(heading.textContent.trim());
    if(!isAppendix&&heading.nodeName!=='H4')return;
    const anchor=heading.getAttribute('data-anchor')||`${isAppendix?'appendix':'subsub'}-${sub.id}-${index+1}`;
    heading.setAttribute('data-anchor',anchor);
    const level=isAppendix?1:3;
    heading.setAttribute('data-toc-level',String(level));
    let label=isAppendix?heading.textContent.trim().toLocaleUpperCase('id-ID'):titleCase(heading.textContent);
    if(name)label=label.replace(new RegExp(escapeRegExp(name),'gi'),name);
    toc.push({anchor,label,level});
   });
   parsed.querySelectorAll('.doc-caption').forEach((el,j)=>{
    const kind=/^Gambar/i.test(el.textContent)?'Gambar':'Tabel',n=kind==='Gambar'?++g:++t;
    const title=el.textContent.replace(/^(Tabel|Gambar)\s+[\d.]+\s*[-–:]?\s*/i,'');const anchor=`cap-${i}-${sub.id}-${j}`;
    el.textContent=`${kind} ${i+1}.${n} ${title}`;el.setAttribute('data-anchor',anchor);captions.push({kind,label:el.textContent,anchor});
   });
   const contentNodes=orientationNodes(parsed.body);
   if(editing){let index=0;for(const entry of contentNodes)if(entry.node){const node=entry.node;node.setAttribute('data-editor-block',String(++editorBlock));node.setAttribute('data-editor-index',String(index++));node.setAttribute('data-editor-sub',sub.id);node.setAttribute('data-editor-bab',bab.id);node.querySelectorAll('tbody > tr').forEach((row,j)=>row.setAttribute('data-editor-row',String(j)));}}
   for(const [nodeIndex,entry] of contentNodes.entries()){
    if('orientation' in entry){if(landscape!==entry.orientation){html+=sectionBreak(entry.orientation);landscape=entry.orientation;}continue;}
    const node=entry.node;
    if(landscape||node.nodeName!=='TABLE'||!tableNeedsLandscape(node)){html+=node.outerHTML;continue;}
    const previous=contentNodes[nodeIndex-1]?.node;
    let caption='';
    if(previous?.classList.contains('doc-caption')&&html.endsWith(previous.outerHTML)){
     caption=previous.outerHTML;
     html=html.slice(0,-caption.length);
    }
    html+=sectionBreak(true)+caption+node.outerHTML+sectionBreak(false);
   }
   for(const table of sub.tables||[]){
    const def=tableDefinitions[table.type];if(!def)continue;
    const label=`Tabel ${i+1}.${++t} ${def.title}`,anchor=`table-${table.id}`;captions.push({kind:'Tabel',label,anchor});
    const block=`<p class="doc-caption" data-anchor="${e(anchor)}">${e(label)}</p>${standardTable(table,year)}${table.type==='renja'?signature(settings):''}`;
    if(def.landscape){html+=sectionBreak(true)+block+sectionBreak(false);}else html+=block;
   }
  }
  if(html)body+=html;
 }
 if(attachment)body+=`<p class="right">BUPATI CIREBON,</p><p class="right sign-space">${e(settings.global.bupati||'................')}</p><p>Diundangkan di Sumber pada tanggal ${e(reg.tanggalDiundangkan||'................')}</p><p>SEKRETARIS DAERAH KABUPATEN CIREBON,</p><p class="sign-space">${e(settings.global.sekretarisDaerah||'................')}</p><p>BERITA DAERAH KABUPATEN CIREBON TAHUN ${e(year)} NOMOR ${e(reg.nomorBerita||'................')}</p>`;
if(body)body=article(body,'body',false);
 const row=(item,kind)=>`<p class="toc-row level-${item.level||1}" data-index-kind="${kind}" style="align-items:flex-end;font-size:12pt;line-height:1;margin:0 0 4pt;padding-left:${Math.max(0,(item.level||1)-1)*21.25}pt"><span>${e(item.label)}</span><span class="dots"></span><span data-page-ref="${e(item.anchor)}"></span></p>`;
 let front='';
 if(!attachment){
  front+=article(`<div class="cover" data-anchor="cover">${coverHtml(doc,settings)}</div>`,'front',false,'none');
  front+=article(`<h2 data-anchor="preface" data-toc-level="1">KATA PENGANTAR</h2>${cleanHtml(doc.frontMatter?.preface||`<p>Puji syukur ke hadirat Tuhan Yang Maha Esa atas tersusunnya ${e(doc.jenis)} ${e(name)} Tahun ${e(year)}.</p><p>Dokumen ini menjadi pedoman pelaksanaan program dan kegiatan perangkat daerah. Terima kasih kepada seluruh pihak yang berkontribusi dalam penyusunannya.</p>`)}${signature(settings)}`,'front');
  const tocEntries=[{anchor:'preface',label:'KATA PENGANTAR',level:1},{anchor:'toc',label:'DAFTAR ISI',level:1},{anchor:'tables',label:'DAFTAR TABEL',level:1},{anchor:'figures',label:'DAFTAR GAMBAR',level:1},...toc];
  front+=article(`<h2 data-anchor="toc" data-toc-level="1">DAFTAR ISI</h2>${tocEntries.map(item=>row(item,'toc')).join('')}`,'front');
  for(const kind of ['Tabel','Gambar']){
   const items=captions.filter(c=>c.kind===kind).map(c=>({...c,level:1}));
   front+=article(`<h2 data-anchor="${kind==='Tabel'?'tables':'figures'}" data-toc-level="1">DAFTAR ${kind.toUpperCase()}</h2>${items.map(item=>row(item,kind.toLowerCase())).join('')||`<p class="index-empty">Tidak ada ${kind.toLowerCase()} dalam dokumen ini</p>`}`,'front');
  }
 }
 const footer=attachment?`RENJA ${year} ${name}`:`${change?'Perubahan ':''}Rencana Kerja ${name} tahun ${year}`;
 return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${e(doc.judul)}</title><style>
 @font-face{font-family:'Bookman Old Style';src:url(data:font/ttf;base64,${bookmanFont}) format('truetype');font-style:normal;font-weight:normal;font-display:block}*{box-sizing:border-box}body{margin:0;background:#e2e8f0;color:#111;font:12pt 'Bookman Old Style',serif;line-height:1.5}#source{display:none}.paper{position:relative;width:215mm;height:330mm;padding:20mm;margin:16px auto;background:white;break-after:page;page:portrait}.page-body{height:290mm;overflow:hidden}.landscape{width:330mm;height:215mm;page:landscape;padding:20mm}.landscape .page-body{height:175mm}footer{position:absolute;bottom:10mm;left:20mm;right:20mm;border-top:1px solid #333;padding-top:2mm;font-size:9pt;text-align:center}.landscape footer{left:20mm;right:20mm}h1{font-size:18pt}h2{font-size:14pt;text-align:center;margin:0 0 20pt}h3{font-size:12pt;margin:12pt 0 6pt}p{margin:0 0 8pt;text-align:justify}table{width:100%;border-collapse:collapse;table-layout:auto;font-size:10pt;line-height:1.25;margin-bottom:10pt}th,td{border:1px solid #333;padding:4pt;overflow-wrap:anywhere;vertical-align:top}th{background:#eee;text-align:center}.aggregate{font-weight:bold}.doc-caption{font-size:10pt;text-align:center;font-style:italic;break-after:avoid}img{max-width:100%;max-height:180mm;object-fit:contain}.signature{margin:20pt 0 0 auto;width:75mm}.signature p{text-align:center}.sign-space{padding-top:45pt}.right{text-align:right}.cover{text-align:center;height:235mm;display:flex;flex-direction:column;align-items:center;font-weight:bold;text-transform:uppercase}.cover h1{margin:auto 0}.cover-bottom{margin-top:auto}.cover p{text-align:center}.toc-row{display:flex;align-items:baseline;font-size:11pt;gap:5pt;margin-bottom:6pt}.toc-row.sub{padding-left:12pt}.toc-row>span:first-child{max-width:90%}.dots{flex:1;border-bottom:1px dotted #333}.regulation{font-weight:bold;margin-bottom:18pt;font-size:11pt}#error{color:#b91c1c;padding:12px}#error:empty{display:none}@page portrait{size:215mm 330mm;margin:0}@page landscape{size:330mm 215mm;margin:0}@media print{body{background:white}.paper{margin:0}#error{display:none}}
 .paper.f4{page:portrait}.paper.f4.landscape{page:landscape} table.table-no-repeat thead{display:table-row-group} tr{break-inside:avoid} td,th{font-size:10pt} ol.list-parenthesis > li::marker{content:counter(list-item) ") "} ol[type="a"]{list-style-type:lower-alpha} ol[type="i"]{list-style-type:lower-roman}
 .cover{height:290mm;margin:0}.cover-layout{height:290mm;display:grid;grid-template-rows:1fr 1fr 1fr;text-align:center}.cover-top,.cover-middle,.cover-bottom{display:flex;flex-direction:column;align-items:center;justify-content:center}.cover-top{justify-content:flex-start}.cover-logo{width:auto;height:40mm;max-height:40mm;max-width:45mm;object-fit:contain;margin:0 auto 10mm}.cover-government{font-size:14pt;line-height:1.15;margin:0;text-align:center;text-indent:0}.cover-middle p,.cover-bottom p{margin:0;text-align:center;text-indent:0;font-weight:bold;line-height:1.15}.cover-title,.cover-org,.cover-year{font-size:18pt}.cover-bottom{justify-content:flex-end}.cover-bottom p{font-size:12pt}
 ${imageCss}${F4_PAGE_CSS}${F4_SCREEN_LAYOUT_CSS}</style></head><body data-f4="true"${editing?' data-editor="true"':''} data-footer="${e(footer)}"><div id="error" role="alert"></div><div id="source">${front}${body}</div><main id="pages"></main><script type="module" src="/api/document-assets/paginate.js"></script></body></html>`;
}
