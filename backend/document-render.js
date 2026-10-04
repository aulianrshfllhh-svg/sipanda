import {parseHTML} from 'linkedom';
import {tableColumns,tableDefinitions,calculatedRows,tableNeedsLandscape} from '../shared/document-tables.js';
import {escapeHtml as e} from './templates.js';
import fs from 'node:fs';
const logoSource=fs.readFileSync(new URL('../frontend/src/components/common/KabCirebonLogo.vue',import.meta.url),'utf8');
const logo=logoSource.match(/<svg[\s\S]*?<\/svg>/)?.[0].replace(/:width="width" :height="height"/,'width="96" height="116"')||'';
const bookmanFont=fs.readFileSync(new URL('./assets/fonts/URWBookman-Light.ttf',import.meta.url)).toString('base64');
const allowed=new Set(['P','BR','DIV','SPAN','STRONG','B','EM','I','U','S','UL','OL','LI','H1','H2','H3','H4','BLOCKQUOTE','TABLE','COLGROUP','COL','THEAD','TBODY','TFOOT','TR','TH','TD','IMG']);
export function cleanHtml(html, offline = true) {
 const {document}=parseHTML(`<html><body>${html||''}</body></html>`);
 function clean(node){for(const child of [...node.children]){
  if(!allowed.has(child.tagName)){child.remove();continue;}
  for(const attr of [...child.attributes])if(!['class','src','alt','colspan','rowspan','style'].includes(attr.name))child.removeAttribute(attr.name);
  if(child.tagName==='IMG' && !/^data:image\/(png|jpeg|webp);base64,/i.test(child.getAttribute('src')||'') && (offline || !/^(https?:\/\/|\/uploads\/)/i.test(child.getAttribute('src')||''))){child.replaceWith(document.createTextNode(`[Gambar: ${child.getAttribute('alt')||'impor gambar lokal untuk ekspor'}]`));continue;}
  const style=child.getAttribute('style')||'';child.removeAttribute('style');
  const align=style.match(/text-align:\s*(left|center|right|justify)/i);
  const width=child.tagName==='COL'&&style.match(/width:\s*(\d+(?:\.\d+)?%)/i);
  if(width)child.setAttribute('style',`width:${width[1]}`);
  else if(align)child.setAttribute('style',`text-align:${align[1]}`);
  clean(child);
 }}clean(document.body);return document.body.innerHTML;
}
function signature(settings){const p=settings.opd;return `<div class="signature"><p>${e(p.tempat||'Sumber')}, ${e(p.bulan||'................')}</p><p>${e(p.jabatan||'[Jabatan pimpinan]')}</p><p class="sign-space">${e(p.pimpinan||'[Nama pimpinan]')}</p><p>${e(p.pangkat)}</p><p>NIP ${e(p.nip||'................')}</p></div>`;}
function standardTable(t,year){const definition=tableDefinitions[t.type],calc=calculatedRows(t),columns=tableColumns(t.type,year);return `<table>${t.type==='renja'?'<colgroup>'+[6,22,12,7,7,10,9,7,8,12].map(w=>`<col style="width:${w}%">`).join('')+'</colgroup>':''}<thead><tr>${columns.map(c=>`<th>${e(c)}</th>`).join('')}</tr></thead><tbody>${calc.rows.map(r=>`<tr class="${r.aggregate?'aggregate':''}">${r.cells.map((v,j)=>`<td>${t.type==='renja'&&[5,9].includes(j)?Number(v).toLocaleString('id-ID'):e(v)}</td>`).join('')}</tr>`).join('')}</tbody>${t.type==='renja'?`<tfoot><tr><th colspan="5">JUMLAH</th><th>${calc.total.toLocaleString('id-ID')}</th><td colspan="3"></td><th>${calc.totalMaju.toLocaleString('id-ID')}</th></tr></tfoot>`:''}</table>`;}
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
   cell.style.verticalAlign='middle';
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
 const chapters=doc.sections.map(section=>({...section,id:section.id||section.babId,title:section.title||section.babTitle}));
 let articles='';
 for(const [i,chapter] of chapters.entries()){
  const match=chapter.title.match(/^(BAB\s+[IVXLCDM]+)\s*(.*)$/i);
  const heading=match
   ? `<h2 data-anchor="${e(chapter.id)}"><span>${e(match[1].toUpperCase())}</span><span>${e(match[2].toUpperCase())}</span></h2>`
   : `<h2 data-anchor="${e(chapter.id)}">${e(chapter.title.toUpperCase())}</h2>`;
  let html=(i===0?opening:'')+heading;
  let tableNo=0,imageNo=0;
  for(const sub of chapter.subsections||[]){
   html+=`<h3 data-anchor="${e(sub.id)}">${e(sub.code)}.  ${e(sub.title.toUpperCase())}</h3>`;
   const parsed=parseHTML(`<html><body>${annexCleanHtml(sub.content)}</body></html>`).document;
   parsed.querySelectorAll('.doc-caption').forEach(el=>{
    const image=/^Gambar/i.test(el.textContent),kind=image?'Gambar':'Tabel',seq=image?++imageNo:++tableNo;
    const title=el.textContent.replace(/^(Tabel|Gambar)\s+[\d.]+\s*[-–:]?\s*/i,'').trim();
    el.textContent=`${kind} ${i+1}.${seq} ${title}`;
    el.removeAttribute('data-anchor');
    el.style.fontSize='12pt';
   });
   const contentNodes=[...parsed.body.children];
   for(const [nodeIndex,node] of contentNodes.entries()){
    if(node.nodeName!=='TABLE'){html+=node.outerHTML;continue;}
    const previous=contentNodes[nodeIndex-1];
    const hasRancanganCaption=previous?.classList.contains('doc-caption')&&/rancangan renja/i.test(previous.textContent);
    if(!hasRancanganCaption&&!tableNeedsLandscape(node,175)){html+=node.outerHTML;continue;}
    let caption='';
    if(previous?.classList.contains('doc-caption')&&html.endsWith(previous.outerHTML)){
     caption=previous.outerHTML;
     html=html.slice(0,-caption.length);
    }
    if(html)articles+=article(html);
    html='';
    articles+=article(`${caption}${node.outerHTML}`,true);
   }
   for(const table of sub.tables||[]){
    const def=tableDefinitions[table.type];if(!def)continue;
    const label=`Tabel ${i+1}.${++tableNo} ${def.title}`;
    const block=`<p class="doc-caption" style="font-size:12pt">${e(label)}</p>${standardTable(table,doc.tahun).replace('<table>','<table style="font-size:12pt">')}`;
    if(def.landscape){articles+=article(html);html='';articles+=article(block,true);}
    else html+=block;
   }
  }
  if(i===chapters.length-1){
   html+=`<div class="closing-block"><p>BUPATI CIREBON,</p><p class="sign-space" aria-label="Ruang tanda tangan"></p><p>${e(settings.global.bupati)}</p></div>`;
  }
  if(html)articles+=article(html);
 }
 return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${e(doc.judul)}</title><style>
 @font-face{font-family:'Bookman Old Style';src:url(data:font/ttf;base64,${bookmanFont}) format('truetype');font-style:normal;font-weight:normal;font-display:block}*{box-sizing:border-box}body{margin:0;background:#e2e8f0;color:#111;font:12pt 'Bookman Old Style','URW Bookman','Bookman',serif;line-height:1.5}#source{display:none}.paper{position:relative;width:210mm;height:297mm;padding:20mm;margin:16px auto;background:white;break-after:page;page:portrait}.page-body{height:257mm;overflow:hidden}.landscape{width:297mm;height:210mm;page:landscape;padding:20mm}.landscape .page-body{height:170mm}.paper.f4{width:215mm;height:330mm;padding:20mm;page:f4-portrait}.paper.f4 .page-body{height:290mm}.paper.landscape.f4{width:330mm;height:215mm;padding:20mm;page:f4-landscape}.paper.landscape.f4 .page-body{height:175mm}footer{position:absolute;bottom:10mm;left:20mm;right:20mm;border-top:1px solid #333;padding-top:2mm;font-size:9pt;text-align:center}.landscape footer{left:20mm;right:20mm}.paper.annex footer{display:none}h1{font-size:18pt}h2{font-size:12pt;text-align:center;font-weight:normal;margin:0 0 20pt}h2 span{display:block}h3{font-size:12pt;font-weight:normal;text-transform:uppercase;margin:12pt 0 6pt}p{margin:0 0 8pt;text-align:justify;text-indent:1cm}table{width:100%;border-collapse:collapse;table-layout:auto;font-size:9pt;line-height:1.25;margin-bottom:10pt}th,td{border:1px solid #333;padding:4pt;overflow-wrap:anywhere;vertical-align:top}th{background:#eee;text-align:center;font-weight:normal}.aggregate{font-weight:normal}.doc-caption{font-size:10pt;text-align:center;font-style:normal;text-indent:0;break-after:avoid}.opening-block{margin:0 0 20pt;text-align:left}.opening-block p{text-align:left;text-indent:0;margin:0}.opening-half{width:50%;margin-left:auto}.opening-wide{width:100%}.closing-block{width:50%;margin:20pt 0 0 auto;break-inside:avoid}.closing-block p{text-align:left;text-indent:0;margin:0}.closing-block .sign-space{height:25mm}.closing-block p:last-child{text-transform:uppercase}.signature{margin:20pt 0 0 auto;width:75mm}.signature p{text-align:center}.sign-space{padding-top:45pt}.right{text-align:right}.toc-row{display:flex;align-items:baseline;font-size:11pt;gap:5pt;margin-bottom:6pt}.toc-row.sub{padding-left:12pt}.toc-row>span:first-child{max-width:90%}.dots{flex:1;border-bottom:1px dotted #333}.regulation{margin-bottom:18pt;font-size:11pt}#error{color:#b91c1c;padding:12px}#error:empty{display:none}@page portrait{size:A4 portrait;margin:0}@page landscape{size:A4 landscape;margin:0}@page f4-portrait{size:215mm 330mm;margin:0}@page f4-landscape{size:330mm 215mm;margin:0}@media print{body{background:white}.paper{margin:0}#error{display:none}}
 </style></head><body data-footer="" data-f4="true" data-annex="true"><div id="error" role="alert"></div><div id="source">${articles}</div><main id="pages"></main><script type="module" src="/api/document-assets/paginate.js"></script></body></html>`;
}
export function renderDocument(doc,settings) {
 if(doc.isLampiranOtomatis)return renderAttachmentDocument(doc,settings);
 const name=settings.opd.nama||doc.opdName,year=doc.tahun,attachment=doc.isLampiranOtomatis,change=doc.jenis.includes('Perubahan') || (attachment && doc.subJudul?.includes('Renja Perubahan')),reg=doc.regulation||{};
 const sections=doc.sections.map(s=>({...s,id:s.id||s.babId,title:s.title||s.babTitle}));
 let captions=[],toc=[],body='';
 const article=(html,part='body',landscape=false)=>`<article data-part="${part}" data-landscape="${landscape}">${html}</article>`;
 for(const [i,bab] of sections.entries()){
  let t=0,g=0,html=`<h2 data-anchor="${e(bab.id)}">${e(bab.title)}</h2>`;toc.push({anchor:bab.id,label:bab.title});
  if(attachment&&i===0)html=`<div class="regulation"><p>LAMPIRAN PERATURAN BUPATI CIREBON</p><p>NOMOR : ${e(reg.nomor||'................')}</p><p>TANGGAL : ${e(reg.tanggal||'................')}</p><p>TENTANG : ${change?'PERUBAHAN ':''}RENCANA KERJA ${e(name.toUpperCase())} KABUPATEN CIREBON TAHUN ${e(year)}</p></div>`+html;
  for(const sub of bab.subsections){
   toc.push({anchor:sub.id,label:`${sub.code} ${sub.title}`,sub:true});
   html+=`<h3 data-anchor="${e(sub.id)}">${e(sub.code)} ${e(sub.title)}</h3>`;
   const parsed=parseHTML(`<html><body>${cleanHtml(sub.content)}</body></html>`).document;
   formatImportedTables(parsed);
   parsed.querySelectorAll('.doc-caption').forEach((el,j)=>{
    const kind=/^Gambar/i.test(el.textContent)?'Gambar':'Tabel',n=kind==='Gambar'?++g:++t;
    const title=el.textContent.replace(/^(Tabel|Gambar)\s+[\d.]+\s*[-–:]?\s*/i,'');const anchor=`cap-${i}-${sub.id}-${j}`;
    el.textContent=`${kind} ${i+1}.${n} ${title}`;el.setAttribute('data-anchor',anchor);captions.push({kind,label:el.textContent,anchor});
   });
   const contentNodes=[...parsed.body.children];
   for(const [nodeIndex,node] of contentNodes.entries()){
    if(node.nodeName!=='TABLE'||!tableNeedsLandscape(node)){html+=node.outerHTML;continue;}
    const previous=contentNodes[nodeIndex-1];
    let caption='';
    if(previous?.classList.contains('doc-caption')&&html.endsWith(previous.outerHTML)){
     caption=previous.outerHTML;
     html=html.slice(0,-caption.length);
    }
    if(html)body+=article(html);
    html='';
    body+=article(`${caption}${node.outerHTML}`,'body',true);
   }
   for(const table of sub.tables||[]){
    const def=tableDefinitions[table.type];if(!def)continue;
    const label=`Tabel ${i+1}.${++t} ${def.title}`,anchor=`table-${table.id}`;captions.push({kind:'Tabel',label,anchor});
    const block=`<p class="doc-caption" data-anchor="${e(anchor)}">${e(label)}</p>${standardTable(table,year)}${table.type==='renja'?signature(settings):''}`;
    if(def.landscape){body+=article(html);html='';body+=article(block,'body',true);}else html+=block;
   }
  }
  if(html)body+=article(html);
 }
 if(attachment)body+=article(`<p class="right">BUPATI CIREBON,</p><p class="right sign-space">${e(settings.global.bupati||'................')}</p><p>Diundangkan di Sumber pada tanggal ${e(reg.tanggalDiundangkan||'................')}</p><p>SEKRETARIS DAERAH KABUPATEN CIREBON,</p><p class="sign-space">${e(settings.global.sekretarisDaerah||'................')}</p><p>BERITA DAERAH KABUPATEN CIREBON TAHUN ${e(year)} NOMOR ${e(reg.nomorBerita||'................')}</p>`);
 const row=item=>`<p class="toc-row${item.sub?' sub':''}"><span>${e(item.label)}</span><span class="dots"></span><span data-page-ref="${e(item.anchor)}"></span></p>`;
 let front='';
 if(!attachment){
  const title=doc.jenis.includes('RKPD')?`${change?'PERUBAHAN ':''}RENCANA KERJA PEMERINTAH DAERAH (RKPD)`:doc.jenis==='RPJMD'?'RENCANA PEMBANGUNAN JANGKA MENENGAH DAERAH (RPJMD)':`${change?'PERUBAHAN ':''}RENCANA KERJA (RENJA) ${name}`;
  front+=article(`<div class="cover" data-anchor="cover">${logo}<h2>PEMERINTAH KABUPATEN CIREBON</h2><h1>${e(title.toUpperCase())}<br/>TAHUN ${e(year)}</h1><div class="cover-bottom"><h2>${e(name.toUpperCase())}</h2><p>KABUPATEN CIREBON</p><p>${e(settings.opd.alamat||'[Alamat OPD belum diisi]')}</p></div></div>`,'front');
  front+=article(`<h2 data-anchor="preface">KATA PENGANTAR</h2>${cleanHtml(doc.frontMatter?.preface||`<p>Puji syukur ke hadirat Tuhan Yang Maha Esa atas tersusunnya ${e(doc.jenis)} ${e(name)} Tahun ${e(year)}.</p><p>Dokumen ini menjadi pedoman pelaksanaan program dan kegiatan perangkat daerah. Terima kasih kepada seluruh pihak yang berkontribusi dalam penyusunannya.</p>`)}${signature(settings)}`,'front');
  front+=article(`<h2 data-anchor="toc">DAFTAR ISI</h2>${[{anchor:'cover',label:'HALAMAN SAMPUL'},{anchor:'preface',label:'KATA PENGANTAR'},{anchor:'toc',label:'DAFTAR ISI'},{anchor:'tables',label:'DAFTAR TABEL'},{anchor:'figures',label:'DAFTAR GAMBAR'},...toc].map(row).join('')}`,'front');
  for(const kind of ['Tabel','Gambar'])front+=article(`<h2 data-anchor="${kind==='Tabel'?'tables':'figures'}">DAFTAR ${kind.toUpperCase()}</h2>${captions.filter(c=>c.kind===kind).map(row).join('')||'<p>Belum ada caption.</p>'}`,'front');
 }
 const footer=attachment?`RENJA ${year} ${name}`:`${change?'Perubahan ':''}Rencana Kerja ${name} tahun ${year}`;
 return `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${e(doc.judul)}</title><style>
 *{box-sizing:border-box}body{margin:0;background:#e2e8f0;color:#111;font:12pt 'Times New Roman',serif;line-height:1.5}#source{display:none}.paper{position:relative;width:210mm;height:297mm;padding:20mm;margin:16px auto;background:white;break-after:page;page:portrait}.page-body{height:257mm;overflow:hidden}.landscape{width:297mm;height:210mm;page:landscape;padding:20mm}.landscape .page-body{height:170mm}footer{position:absolute;bottom:10mm;left:20mm;right:20mm;border-top:1px solid #333;padding-top:2mm;font-size:9pt;text-align:center}.landscape footer{left:20mm;right:20mm}h1{font-size:18pt}h2{font-size:14pt;text-align:center;margin:0 0 20pt}h3{font-size:12pt;margin:12pt 0 6pt}p{margin:0 0 8pt;text-align:justify}table{width:100%;border-collapse:collapse;table-layout:auto;font-size:9pt;line-height:1.25;margin-bottom:10pt}th,td{border:1px solid #333;padding:4pt;overflow-wrap:anywhere;vertical-align:top}th{background:#eee;text-align:center}.aggregate{font-weight:bold}.doc-caption{font-size:10pt;text-align:center;font-style:italic;break-after:avoid}img{max-width:100%;max-height:180mm;object-fit:contain}.signature{margin:20pt 0 0 auto;width:75mm}.signature p{text-align:center}.sign-space{padding-top:45pt}.right{text-align:right}.cover{text-align:center;height:235mm;display:flex;flex-direction:column;align-items:center;font-weight:bold;text-transform:uppercase}.cover h1{margin:auto 0}.cover-bottom{margin-top:auto}.cover p{text-align:center}.toc-row{display:flex;align-items:baseline;font-size:11pt;gap:5pt;margin-bottom:6pt}.toc-row.sub{padding-left:12pt}.toc-row>span:first-child{max-width:90%}.dots{flex:1;border-bottom:1px dotted #333}.regulation{font-weight:bold;margin-bottom:18pt;font-size:11pt}#error{color:#b91c1c;padding:12px}#error:empty{display:none}@page portrait{size:A4 portrait;margin:0}@page landscape{size:A4 landscape;margin:0}@media print{body{background:white}.paper{margin:0}#error{display:none}}
 </style></head><body data-footer="${e(footer)}"><div id="error" role="alert"></div><div id="source">${front}${body}</div><main id="pages"></main><script type="module" src="/api/document-assets/paginate.js"></script></body></html>`;
}
