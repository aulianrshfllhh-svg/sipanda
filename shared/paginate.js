// Runs in the preview iframe and in Chromium for export; a single pagination engine.
export async function paginate() {
 // Hidden source does not trigger font loading. Measure only after the locked font is available.
 await document.fonts.load("12pt 'Bookman Old Style'");
 await document.fonts.ready;
 await Promise.all([...document.images].map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.onload=image.onerror=resolve;})));
 const source=document.querySelector('#source'),output=document.querySelector('#pages');
 if(document.body.dataset.editor==='true')window.editorSource=source.cloneNode(true);
 const foot=document.body.dataset.footer||'';
 const f4=document.body.dataset.f4==='true',annex=document.body.dataset.annex==='true';
 const roman=n=>{let s='';for(const [v,c] of [[100,'c'],[90,'xc'],[50,'l'],[40,'xl'],[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']])while(n>=v){s+=c;n-=v;}return s;};
 let frontNo=0,bodyNo=0;
 function makePage(part,landscape=false,numbering='auto') {
  const numbered=numbering!=='none';
  const page=document.createElement('section');page.className='paper'+(landscape?' landscape':'')+(f4?' f4':'')+(annex?' annex':'');page.dataset.part=part;page.dataset.number=part==='front'?(numbered?roman(++frontNo):''):String(++bodyNo);
  const area=document.createElement('div');area.className='page-body';page.append(area);
  const footer=document.createElement('footer');footer.textContent=part==='front'?page.dataset.number:`${foot}     |     ${page.dataset.number}`;if(!numbered)footer.hidden=true;page.append(footer);output.append(page);return area;
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
  const first=node.cloneNode(false),rest=node.cloneNode(false);first.append(before.cloneContents());rest.append(after.cloneContents());rest.removeAttribute('id');rest.removeAttribute('data-anchor');
  if(['OL','UL'].includes(node.nodeName)){
   first.querySelectorAll(':scope > li').forEach(item=>{if(!item.textContent.trim()&&!item.querySelector('img'))item.remove();});
   const last=first.lastElementChild,head=rest.firstElementChild,original=[...node.children][first.children.length-1];
   const continuation=!!last&&!!head&&!!original&&last.textContent!==original.textContent;
   if(continuation)head.classList.add('list-continuation');
   if(node.nodeName==='OL')rest.setAttribute('start',String((Number(node.getAttribute('start'))||1)+first.children.length-(continuation?1:0)));
  }
  return [first,rest];
 }
 function renderArticle(article){
  const part=article.dataset.part||'body';let landscape=article.dataset.landscape==='true';const numbering=article.dataset.numbering||'auto';let area=makePage(part,landscape,numbering);
  const next=()=>{area=makePage(part,landscape,numbering);};
  let pendingOrientation=null;
  function applyPendingOrientation(){
   if(pendingOrientation===null)return;
   const orientation=pendingOrientation;pendingOrientation=null;
   if(orientation===landscape)return;
   landscape=orientation;
   if(area.childNodes.length)next();
   else area.parentElement.classList.toggle('landscape',landscape);
  }
  function append(node){
   if(node.nodeType===3 && !node.textContent.trim())return;
   if(node.classList?.contains('doc-section-break')){
    pendingOrientation=node.dataset.orientation==='landscape';
    return;
   }
   applyPendingOrientation();
   if(node.classList?.contains('doc-page-break')){if(area.childNodes.length)next();return;}
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
   // A dense imported grid may give prose columns too little space at the locked 10pt size.
   // Rebalance only when a single row cannot fit even on a fresh page; never shrink the font.
   if(node.nodeName==='TABLE'&&!node.dataset.layoutBalanced&&[...node.querySelectorAll('tbody > tr')].some(row=>row.getBoundingClientRect().height>area.clientHeight-(node.querySelector('thead')?.getBoundingClientRect().height||0)-30)){
    const weights=[];for(const row of node.querySelectorAll('tbody > tr')){let column=0;for(const cell of row.children){const span=Number(cell.getAttribute('colspan'))||1,value=Math.max(2,Math.sqrt(cell.textContent.trim().length/span));for(let i=0;i<span;i++)weights[column+i]=Math.max(weights[column+i]||2,value);column+=span;}}
    if(weights.length){const total=weights.reduce((a,b)=>a+b,0),cols=document.createElement('colgroup');for(const weight of weights){const col=document.createElement('col');col.style.width=`${weight/total*100}%`;cols.append(col);}node.querySelector('colgroup')?.remove();node.prepend(cols);node.dataset.layoutBalanced='true';node.remove();append(node);return;}
   }
   node.remove();
   if(node.nodeName==='TABLE'){
    const rows=[...node.querySelectorAll('tbody > tr')];
    let firstFragment=true;
    const shell=()=>{const t=node.cloneNode(false);const cols=node.querySelector('colgroup');if(cols)t.append(cols.cloneNode(true));const head=node.querySelector('thead');if(head&&(firstFragment||!node.classList.contains('table-no-repeat')))t.append(head.cloneNode(true));firstFragment=false;t.append(document.createElement('tbody'));return t;};
    let table=shell();area.append(table);
    // Rows connected by rowspan must remain together; moving them separately corrupts merges.
    const groups=[];
    for(let index=0;index<rows.length;){let end=index+1;const group=[];for(let r=index;r<end&&r<rows.length;r++){group.push(rows[r]);for(const cell of rows[r].children)end=Math.max(end,r+Math.max(1,Number(cell.getAttribute('rowspan'))||1));}groups.push(group);index=Math.min(end,rows.length);}
    function splitRow(row){
     const cells=[...row.children];if(cells.some(cell=>Number(cell.getAttribute('rowspan'))>1||cell.querySelector('img,table')))return null;
     const lengths=cells.map(cell=>[...cell.textContent.matchAll(/\S+\s*/g)]),maximum=Math.max(...lengths.map(words=>words.length));if(maximum<2)return null;
     function slice(cell,offset){const walker=document.createTreeWalker(cell,NodeFilter.SHOW_TEXT);let current,left=offset;while((current=walker.nextNode())){if(left<=current.length)return [current,left];left-=current.length;}return [cell,cell.childNodes.length];}
     function pieces(amount){const before=row.cloneNode(false),after=row.cloneNode(false);cells.forEach((cell,index)=>{const words=lengths[index],count=Math.min(words.length,Math.max(1,Math.floor(words.length*amount/maximum))),offset=count>=words.length?cell.textContent.length:words[count].index,point=slice(cell,offset),a=document.createRange(),b=document.createRange();a.selectNodeContents(cell);a.setEnd(...point);b.selectNodeContents(cell);b.setStart(...point);const first=cell.cloneNode(false),rest=cell.cloneNode(false);first.append(a.cloneContents());rest.append(b.cloneContents());before.append(first);after.append(rest);});return [before,after];}
     let low=1,high=maximum-1,best=0;while(low<=high){const middle=Math.floor((low+high)/2),[piece]=pieces(middle);table.querySelector('tbody').append(piece);const ok=fits(area);piece.remove();if(ok){best=middle;low=middle+1;}else high=middle-1;}return best?pieces(best):null;
    }
    for(const group of groups){
     table.querySelector('tbody').append(...group);if(fits(area))continue;
     for(const row of group)row.remove();
     if(node.classList.contains('table-allow-split')&&group.length===1){
      let remaining=group[0],piece=splitRow(remaining);
      if(piece){table.querySelector('tbody').append(piece[0]);remaining=piece[1];}
      if(!table.querySelector('tbody').children.length)table.remove();next();table=shell();area.append(table);
      while(true){table.querySelector('tbody').append(remaining);if(fits(area))break;remaining.remove();piece=splitRow(remaining);if(!piece)throw new Error('Isi sel tidak dapat dipotong. Perkecil gambar atau ringkas isi baris.');table.querySelector('tbody').append(piece[0]);remaining=piece[1];next();table=shell();area.append(table);}
     }else{if(!table.querySelector('tbody').children.length)table.remove();next();table=shell();area.append(table);table.querySelector('tbody').append(...group);if(!fits(area))throw new Error(`Kelompok ${group.length} baris (${group[0].textContent.slice(0,80)}) melebihi tinggi halaman. Ringkas isi baris sebelum mengekspor.`);}
    }
    const total=node.querySelector('tfoot');if(total){table.append(total);if(!fits(area)){total.remove();next();table=shell();table.append(total);area.append(table);}}return;
   }
   if(['P','DIV','UL','OL','BLOCKQUOTE'].includes(node.nodeName) && !node.classList?.contains('signature')){
    const split=splitParagraph(node,area);if(split){area.append(split[0]);next();append(split[1]);return;}
    if(area.childNodes.length){next();append(node);return;}
   }
   if(area.childNodes.length)next();area.append(node);
   if(!fits(area))throw new Error(`Elemen ${node.nodeName} (${(node.textContent||'').slice(0,80)}) melebihi tinggi halaman. Perkecil gambar atau ringkas isi sebelum mengekspor.`);
  }
  for(const node of [...article.childNodes])append(node.cloneNode(true));
 }
 // Reserve TOC space first, then replace its page numbers without changing its row heights.
 for(const article of source.children)renderArticle(article);
 const anchors=new Map();output.querySelectorAll('[data-anchor]').forEach(el=>{if(!anchors.has(el.dataset.anchor))anchors.set(el.dataset.anchor,el.closest('.paper').dataset.number);});
 output.querySelectorAll('[data-page-ref]').forEach(el=>el.textContent=anchors.get(el.dataset.pageRef)||'');
 source.remove();document.body.classList.add('ready');window.documentReady=true;
}
if(typeof window!=='undefined'){
 window.repaginateDocument=async()=>{document.querySelector('#source')?.remove();document.body.append(window.editorSource.cloneNode(true));document.querySelector('#pages').replaceChildren();document.body.classList.remove('ready');window.documentReady=false;window.documentError=null;await paginate();};
 paginate().catch(error=>{window.documentError=error.message;document.querySelector('#error').textContent=error.message;});
}
