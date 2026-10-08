import {documentFormatReport} from './submission-validation.js';
import {openRenderedDocument} from './document-export.js';
import {renderDocument} from './document-render.js';
import {documentSettings} from './document-settings.js';

export async function completeFormatReport(doc,settings,open=openRenderedDocument){
  const report=documentFormatReport(doc);
  if(doc.cara!=='template')return report;
  if(!doc.isLampiranOtomatis){
    if(!settings.global?.logoData)report.issues.push({id:'cover-logo',code:'cover-logo',level:'required',message:'Logo Kabupaten Cirebon belum diunggah pada Pengaturan Dokumen.',babId:'',subId:'',target:{type:'cover'}});
    if(!String(settings.opd?.alamat||'').trim())report.issues.push({id:'cover-address',code:'cover-address',level:'required',message:'Alamat OPD wajib diisi melalui Profil OPD sebelum pengajuan.',babId:'',subId:'',target:{type:'cover'}});
    if(/\[Alamat OPD belum diisi\]|Petunjuk:/i.test(String(doc.frontMatter?.cover||'')))report.issues.push({id:'cover-placeholder',code:'cover-placeholder',level:'required',message:'Hapus atau ganti teks panduan/placeholder pada sampul sebelum ekspor atau pengajuan.',babId:'',subId:'',target:{type:'cover'}});
    report.canSubmit=!report.issues.some(issue=>issue.level==='required');
  }
  const {browser,page}=await open(renderDocument(doc,settings));
  try{
    const printed=await page.evaluate(()=>[...document.querySelectorAll('.paper[data-part="body"]')].flatMap(paper=>{
      const area=paper.querySelector('.page-body'),bounds=area.getBoundingClientRect(),number=paper.dataset.number;
      const findings=[];
      let previous=paper.previousElementSibling;
      let anchor=area.querySelector('h3[data-anchor]')?.getAttribute('data-anchor')||'';
      while(!anchor&&previous){anchor=[...previous.querySelectorAll('h3[data-anchor]')].at(-1)?.getAttribute('data-anchor')||'';previous=previous.previousElementSibling;}
      if(area.textContent.trim().length<100&&!area.querySelector('table,img'))findings.push({code:'sparse-page',level:'suggestion',message:`Halaman ${number} hampir kosong. Periksa pemisah halaman dan jarak paragraf.`,anchor,number});
      for(const table of area.querySelectorAll('table'))if(table.getBoundingClientRect().right>bounds.right+2||table.scrollWidth>bounds.width+2)findings.push({code:'wide',level:'required',message:`Tabel pada halaman ${number} melebar keluar area cetak.`,anchor,number,objectId:table.getAttribute('data-object-id')||table.id});
      for(const image of area.querySelectorAll('img')){
        const width=image.getBoundingClientRect().width;
        if(width>0&&image.naturalWidth>0&&image.naturalWidth/(width/96)<150)findings.push({code:'resolution',level:'suggestion',message:`Resolusi gambar pada halaman ${number} rendah untuk ukuran cetaknya.`,anchor,number,objectId:image.getAttribute('data-object-id')||image.id});
      }
      return findings;
    }));
    for(const finding of printed){
      let bab=doc.sections.find(b=>(b.subsections||[]).some(s=>s.id===finding.anchor));
      let sub=bab?.subsections?.find(s=>s.id===finding.anchor);
      if(finding.objectId)for(const b of doc.sections)for(const s of b.subsections||[])if(s.content?.includes(finding.objectId)||(s.tables||[]).some(t=>t.id===finding.objectId)){bab=b;sub=s;}
      report.issues.push({...finding,id:`print-${report.issues.length}`,babId:bab?.babId||bab?.id||'',subId:sub?.id||'',target:{type:'page',number:finding.number,objectId:finding.objectId}});
    }
    report.canSubmit=!report.issues.some(i=>i.level==='required');
    for(const chapter of report.chapters)chapter.required=report.issues.filter(i=>i.babId===chapter.id&&i.level==='required').length;
    return report;
  }finally{await browser.close();}
}

export function registerDocumentFormatRoutes(app,prisma,auth,permissions,check=completeFormatReport){
  app.get('/api/documents/:id/format-check',auth,async(req,res)=>{
    try{
      const doc=await prisma.document.findUnique({where:{id:req.params.id},include:{sections:{orderBy:{babOrder:'asc'}}}});
      if(!doc)return res.status(404).json({error:'Dokumen tidak ditemukan'});
      if(!(await permissions(req.currentUser,doc)).canView)return res.status(403).json({error:'Dokumen tidak termasuk penugasan Anda'});
      res.json(await check(doc,await documentSettings(prisma,doc.opdId)));
    }catch(error){console.error('Format check failed:',error);res.status(500).json({error:'Pemeriksaan halaman cetak belum berhasil. Coba kembali sebelum mengajukan.'});}
  });
}
