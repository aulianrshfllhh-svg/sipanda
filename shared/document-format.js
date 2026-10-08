import {indexCaptions, captionTitle} from './document-captions.js';

// Shared, non-mutating checks; both clients supply their own DOM parser.
export function checkDocumentFormat(doc, rootForSub) {
  const issues=[],chapters=[];
  const add=(code,message,bab={},sub={},target={type:'subsection'},level='required')=>issues.push({id:`${code}-${issues.length}`,code,message,level,babId:bab?.babId||bab?.id||'',subId:sub?.id||'',target});
  const finish=(score=issues.length?0:100)=>({score,canSubmit:!issues.some(i=>i.level==='required'),issues,chapters});
  if(doc.cara==='upload'){if(!doc.fileName||!doc.filePath)add('file','Berkas dokumen belum diunggah');return finish();}
  if(doc.cara!=='template')add('method','Metode penyusunan dokumen tidak valid');
  const sections=doc.sections||[];
  if(!sections.length)add('structure','Struktur bab dokumen belum tersedia');
  const indexed=indexCaptions(sections,rootForSub);
  const ids=new Set(indexed.entries.filter(e=>!e.orphan).map(e=>e.id));
  let orientation='portrait',filled=0,total=0,renjaFilled=false;
  for(const bab of sections){
    const start=issues.length;let complete=0;
    if(!bab.subsections?.length)add('chapter',`${bab.babTitle||bab.title||'Bab'} belum memiliki isi`,bab);
    for(const sub of bab.subsections||[]){
      total++;
      const root=indexed.roots.find(r=>r.sub===sub)?.root||rootForSub(sub);
      const text=(root.textContent||'').replace(/\u00a0|\s+/g,' ').trim();
      const tables=sub.tables||[];
      const hasData=tables.some(t=>t.rows?.some(r=>r.cells?.some(c=>String(c||'').trim())));
      if((text.length<10&&!hasData)||/^Petunjuk:/i.test(text))add('empty',`${sub.code||''} ${sub.title||'Subbab'} belum diisi`.trim(),bab,sub);
      else {filled++;complete++;}
      for(const t of tables)if(t.type==='renja'&&t.rows?.some(r=>r.cells?.some(c=>String(c||'').trim())))renjaFilled=true;
      const nodes=[...root.querySelectorAll('*')];
      for(const node of nodes){
        if(node.classList.contains('doc-section-landscape'))orientation='landscape';
        if(node.classList.contains('doc-section-portrait'))orientation='portrait';
        if(node.localName==='table'||node.localName==='img'){
          const kind=node.localName==='table'?'table':'image';
          const target={type:kind,index:[...root.querySelectorAll(node.localName)].indexOf(node)};
          const entry=indexed.entries.find(e=>e.object===node);
          if(!entry||!captionTitle(entry.caption))add('caption',`${kind==='table'?'Tabel':'Gambar'} belum memiliki judul caption`,bab,sub,target);
          const widthMm=orientation==='landscape'?290:175;
          if(kind==='table'){
            const declared=(node.getAttribute('style')||'').match(/(?:^|;)\s*width\s*:\s*([\d.]+)(mm|cm|px|%)/i);
            const factor={mm:1,cm:10,px:25.4/96,'%':widthMm/100};
            const width=declared?Number(declared[1])*factor[declared[2].toLowerCase()]:0;
            const rect=node.getBoundingClientRect?.(),area=node.closest('.ProseMirror')?.getBoundingClientRect?.();
            if(width>widthMm+.5||(rect?.width>0&&area?.width>0&&rect.right>area.right+2))add('wide','Tabel lebih lebar dari area cetak. Gunakan landscape atau rapikan lebar kolom.',bab,sub,target);
            if(/rancangan renja/i.test(entry?.title||'')&&[...node.querySelectorAll('tbody td')].some(c=>c.textContent.trim()))renjaFilled=true;
          }else{
            const pixels=Number(node.getAttribute('data-image-width')||node.getAttribute('width'));
            const pct=Number((node.closest('.doc-figure')?.getAttribute('style')||'').match(/width\s*:\s*([\d.]+)%/i)?.[1]||100);
            if(pixels>0&&pixels/(widthMm*pct/100/25.4)<150)add('resolution','Resolusi gambar rendah untuk ukuran cetaknya; gunakan gambar lebih tajam.',bab,sub,target,'suggestion');
          }
        }
        const style=node.getAttribute('style')||'';
        const family=node.getAttribute('face')||style.match(/font-family\s*:\s*([^;]+)/i)?.[1];
        const size=style.match(/font-size\s*:\s*([\d.]+)(pt|px)/i);
        const expected=node.closest('table')?10:node.closest('.doc-caption')?10.5:12;
        if((family&&!/bookman old style/i.test(family))||node.hasAttribute('size')||(size&&Math.abs(Number(size[1])*(size[2].toLowerCase()==='px'?.75:1)-expected)>.05))add('font','Font atau ukuran teks tidak sesuai format baku.',bab,sub,{type:'element',index:nodes.indexOf(node)});
      }
      [...root.querySelectorAll('.doc-reference')].forEach((ref,index)=>{if(!ids.has(ref.getAttribute('data-reference-id')))add('reference','Rujukan silang tidak ditemukan. Pilih ulang objek tujuan.',bab,sub,{type:'reference',index});});
      const empty=[...root.querySelectorAll('p')].filter(p=>!p.textContent.trim()&&!p.querySelector('img,table,.doc-page-break')).length;
      if(empty>3)add('spacing',`${empty} paragraf kosong. Gunakan pemisah halaman untuk mengatur halaman.`,bab,sub,{type:'subsection'},'suggestion');
    }
    chapters.push({id:bab.babId||bab.id||'',title:bab.babTitle||bab.title||'Bab',complete,total:bab.subsections?.length||0,required:issues.slice(start).filter(i=>i.level==='required').length});
  }
  if(/^Renja(?:\s|$)/i.test(doc.jenis||'')&&!doc.isLampiranOtomatis&&!renjaFilled){
    const bab=sections.find(b=>/BAB IV|rencana kerja/i.test(b.babTitle||b.title||''))||sections[3]||sections[0];
    add('renja','Rancangan Renja belum berisi data.',bab,bab?.subsections?.find(s=>(s.tables||[]).some(t=>t.type==='renja'))||bab?.subsections?.[0]);
  }
  return finish(total?Math.round(filled/total*100):0);
}
