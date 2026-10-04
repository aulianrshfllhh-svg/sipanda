// Runs in the preview iframe and in Chromium for export; a single pagination engine.
export async function paginate() {
 await document.fonts.ready;
 await Promise.all([...document.images].map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.onload=image.onerror=resolve;})));
 const source=document.querySelector('#source'),output=document.querySelector('#pages');
 const foot=document.body.dataset.footer||'';
 const f4=document.body.dataset.f4==='true',annex=document.body.dataset.annex==='true';
 const roman=n=>{let s='';for(const [v,c] of [[100,'c'],[90,'xc'],[50,'l'],[40,'xl'],[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']])while(n>=v){s+=c;n-=v;}return s;};
 let frontNo=0,bodyNo=0;
 function makePage(part,landscape=false) {
  const page=document.createElement('section');page.className='paper'+(landscape?' landscape':'')+(f4?' f4':'')+(annex?' annex':'');page.dataset.part=part;page.dataset.number=part==='front'?roman(++frontNo):String(++bodyNo);
  const area=document.createElement('div');area.className='page-body';page.append(area);
  const footer=document.createElement('footer');footer.textContent=part==='front'?page.dataset.number:`${foot}     |     ${page.dataset.number}`;page.append(footer);output.append(page);return area;
 }
 const fits=area=>area.scrollHeight<=area.clientHeight+1;
 function splitParagraph(node,area) {
  const text=node.textContent||'';const words=[...text.matchAll(/\S+\s*/g)];
  if(words.length<2)return null;
  const cutAt=offset=>{
   const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let remaining=offset,current;
   while((current=walker.nextNode())){if(remaining<=current.length)return [current,remaining];remaining-=current.length;}
   return [node,node.childNodes.length];
  };
  let low=1,high=words.length-1,best=0;
  while(low<=high){const mid=Math.floor((low+high)/2),offset=words[mid].index;const range=document.createRange();range.selectNodeContents(node);range.setEnd(...cutAt(offset));const piece=node.cloneNode(false);piece.append(range.cloneContents());area.append(piece);const ok=fits(area);piece.remove();if(ok){best=mid;low=mid+1;}else high=mid-1;}
  if(!best)return null;
  const point=cutAt(words[best].index),before=document.createRange(),after=document.createRange();before.selectNodeContents(node);before.setEnd(...point);after.selectNodeContents(node);after.setStart(...point);
  const first=node.cloneNode(false),rest=node.cloneNode(false);first.append(before.cloneContents());rest.append(after.cloneContents());rest.removeAttribute('id');rest.removeAttribute('data-anchor');return [first,rest];
 }
 function renderArticle(article){
  const part=article.dataset.part||'body',landscape=article.dataset.landscape==='true';let area=makePage(part,landscape);
  const next=()=>{area=makePage(part,landscape);};
  function append(node){
   if(node.nodeType===3 && !node.textContent.trim())return;
   if(node.classList?.contains('closing-block')){
    const previous=area.lastElementChild?.nodeName==='P'?area.lastElementChild:null;
    if(!previous)throw new Error('Blok penutup harus tetap bersama paragraf terakhir BAB Penutup.');
    previous.remove();
    next();
    area.append(previous,node);
    if(!fits(area))throw new Error('Blok penutup beserta paragraf terakhir tidak muat pada satu halaman.');
    return;
   }
   area.append(node);
   if(fits(area)){
    if ((/^H[123]$/.test(node.nodeName) || node.classList?.contains('doc-caption')) && area.children.length>1 && area.getBoundingClientRect().bottom-node.getBoundingClientRect().bottom<75) {node.remove();next();area.append(node);}
    return;
   }
   node.remove();
   if(node.nodeName==='TABLE'){
    const rows=[...node.querySelectorAll('tbody > tr')];
    const shell=()=>{const t=node.cloneNode(false);const cols=node.querySelector('colgroup');if(cols)t.append(cols.cloneNode(true));const head=node.querySelector('thead');if(head)t.append(head.cloneNode(true));t.append(document.createElement('tbody'));return t;};
    let table=shell();area.append(table);
    for(const row of rows){table.querySelector('tbody').append(row);if(!fits(area)){row.remove();if(table.querySelector('tbody').children.length===0)table.remove();next();table=shell();area.append(table);table.querySelector('tbody').append(row);if(!fits(area))throw new Error('Satu baris tabel melebihi tinggi halaman. Ringkas isi baris sebelum mengekspor.');}}
    const total=node.querySelector('tfoot');if(total){table.append(total);if(!fits(area)){total.remove();next();table=shell();table.append(total);area.append(table);}}return;
   }
   if(['P','DIV','UL','OL','BLOCKQUOTE'].includes(node.nodeName) && !node.classList?.contains('signature')){
    const split=splitParagraph(node,area);if(split){area.append(split[0]);next();append(split[1]);return;}
   }
   if(area.childNodes.length)next();area.append(node);
   if(!fits(area))throw new Error('Satu elemen melebihi tinggi halaman. Perkecil gambar atau ringkas isi sebelum mengekspor.');
  }
  for(const node of [...article.childNodes])append(node.cloneNode(true));
 }
 // Reserve TOC space first, then replace its page numbers without changing its row heights.
 for(const article of source.children)renderArticle(article);
 const anchors=new Map();output.querySelectorAll('[data-anchor]').forEach(el=>{if(!anchors.has(el.dataset.anchor))anchors.set(el.dataset.anchor,el.closest('.paper').dataset.number);});
 output.querySelectorAll('[data-page-ref]').forEach(el=>el.textContent=anchors.get(el.dataset.pageRef)||'');
 source.remove();document.body.classList.add('ready');window.documentReady=true;
}
if(typeof window!=='undefined') paginate().catch(error=>{window.documentError=error.message;document.querySelector('#error').textContent=error.message;});
