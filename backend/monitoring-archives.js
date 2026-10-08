export const archiveCategories = ['Renja Murni', 'Renja Perubahan', 'Renstra', 'Lampiran Matriks'];
export function archiveCategory(doc) {
 if (doc.isLampiranOtomatis || /^Lampiran /.test(doc.jenis)) return 'Lampiran Matriks';
 if (doc.jenis.startsWith('Renstra')) return 'Renstra';
 return ['Renja Murni', 'Renja Perubahan'].includes(doc.jenis) ? doc.jenis : null;
}
export function archiveContext(doc, year, parent) {
 const target=Number(year);
 if(doc.jenis.startsWith('Renstra')) {
  const start=Number(doc.regulation?.periodeMulai || doc.tahun);
  const end=Number(doc.regulation?.periodeAkhir || doc.tahun);
  return Number.isInteger(start)&&Number.isInteger(end)&&start<=target&&target<=end
   ? {matrixKind:null,periodStart:String(start),periodEnd:String(end)} : null;
 }
 const kind=doc.jenis==='Lampiran Renja'?parent?.jenis:doc.jenis;
 const pure=['Renja Murni','Lampiran Perbup Renja'].includes(kind);
 const change=['Renja Perubahan','Lampiran Kepbup Perubahan Renja'].includes(kind);
 if((pure&&Number(doc.tahun)===target+1)||(change&&Number(doc.tahun)===target))
  return {matrixKind:archiveCategory(doc)==='Lampiran Matriks'?(pure?'Murni':'Perubahan'):null,periodStart:null,periodEnd:null};
 return null;
}
export function archiveFilterContext(doc, year, parent) {
 const category=archiveCategory(doc);
 if (!category) return null;
 const source=category==='Lampiran Matriks'&&parent?.jenis.startsWith('Renstra')?parent:doc;
 const renstra=source.jenis.startsWith('Renstra')||doc.jenis==='Lampiran Perbup Renstra';
 const start=String(source.regulation?.periodeMulai||source.tahun);
 const end=String(source.regulation?.periodeAkhir||source.tahun);
 if(year!=='all'&&(renstra?!(Number(start)<=Number(year)&&Number(year)<=Number(end)):String(doc.tahun)!==year))return null;
 return {matrixKind:null,periodStart:renstra?start:null,periodEnd:renstra?end:null};
}
const archiveSelect={id:true,opdId:true,judul:true,jenis:true,tahun:true,status:true,cara:true,isLampiranOtomatis:true,parentId:true,filePath:true,fileName:true,createdById:true,regulation:true,
 versions:{orderBy:{versi:'desc'},take:1,select:{versi:true}},
 verifications:{orderBy:{createdAt:'desc'},select:{status:true,createdAt:true,verifier:{select:{nama:true}}}},_count:{select:{sections:true}}};
export function archiveRecord(doc, parent) {
 const source=doc.isLampiranOtomatis?parent:doc;
 const approved=doc.status==='Disetujui'&&(!doc.isLampiranOtomatis||parent?.status==='Disetujui');
 const verification=approved?(doc.verifications?.find(v=>v.status==='Disetujui')||source?.verifications?.find(v=>v.status==='Disetujui')):null;
 return {id:doc.id,opdId:doc.opdId,judul:doc.judul,jenis:doc.jenis,category:archiveCategory(doc),tahun:doc.tahun,
  status:approved?'Disetujui':doc.isLampiranOtomatis&&parent?.status!=='Disetujui'?(parent?.status||'Draft'):doc.status,
  verifiedAt:verification?.createdAt||null,verifier:verification?.verifier?.nama||null,
  version:source?.versions?.[0]?.versi??null,
  revisionCount:(source?.verifications||[]).filter(v=>v.status==='Perlu Revisi').length,
  verificationSource:doc.isLampiranOtomatis?'Mengikuti dokumen induk':'Dokumen ini',
  cara:doc.cara,isLampiranOtomatis:doc.isLampiranOtomatis,fileName:doc.fileName,
  available:source?.cara==='upload'?!!source.filePath:(source?._count?.sections||0)>0};
}
export function registerMonitoringArchives(app,prisma,auth,isAdmin,permissions) {
 app.get('/api/monitoring/archives',auth,async(req,res)=>{
  if(!isAdmin(req.currentUser)&&req.currentUser.role!=='staf')return res.status(403).json({error:'Monitoring hanya tersedia untuk pegawai Bapperida.'});
  const tahun=String(req.query.tahun||'all');
  if(tahun!=='all'&&!/^\d{4}$/.test(tahun))return res.status(400).json({error:'Tahun anggaran tidak valid.'});
  const status='Disetujui'; // Never allow request parameters to broaden approval status.
  try{
   const assignments=isAdmin(req.currentUser)?null:await prisma.penugasanVerifikasi.findMany({where:{userId:req.currentUser.id},select:{opdId:true}});
   const opds=await prisma.opd.findMany({where:{isActive:true,...(assignments?{id:{in:assignments.map(a=>a.opdId)}}:{})},orderBy:{nomorUrut:'asc'}});
   const docs=await prisma.document.findMany({where:{opdId:{in:opds.map(o=>o.id)},status:'Disetujui',OR:[
    {jenis:{in:['Renja Murni','Renja Perubahan','Lampiran Perbup Renja','Lampiran Kepbup Perubahan Renja','Lampiran Renja']},...(tahun==='all'?{}:{tahun})},
    {jenis:{in:['Renstra','Renstra Murni','Renstra Perubahan','Lampiran Perbup Renstra']}}
   ]},select:archiveSelect,orderBy:{updatedAt:'desc'}});
   const visible=[];
   for(const doc of docs)if((await permissions(req.currentUser,doc)).canView)visible.push(doc);
   const byId=new Map(visible.map(d=>[d.id,d]));
   const parentIds=[...new Set(visible.map(d=>d.parentId).filter(id=>id&&!byId.has(id)))];
   if(parentIds.length){
    const parents=await prisma.document.findMany({where:{id:{in:parentIds},opdId:{in:opds.map(o=>o.id)},status:'Disetujui'},select:archiveSelect});
    for(const parent of parents)if((await permissions(req.currentUser,parent)).canView)byId.set(parent.id,parent);
   }
   const records=visible.flatMap(d=>{
    const parent=byId.get(d.parentId),context=archiveFilterContext(d,tahun,parent),record=archiveRecord(d,parent);
    return context&&record.status==='Disetujui'?[{...record,...context}]:[];
   });
   res.json({tahun,status,opds:opds.map(opd=>{
    const items=records.filter(d=>d.opdId===opd.id);
    const categories=Object.fromEntries(archiveCategories.map(category=>{
     const matching=items.filter(d=>d.category===category);
     return [category,{approved:matching.filter(d=>d.status==='Disetujui').length,}];
    }));
    return {...opd,categories,approvedCount:items.filter(d=>d.status==='Disetujui').length,documents:items};
   })});
  }catch(error){console.error('Monitoring archives:',error);res.status(500).json({error:'Gagal memuat arsip monitoring OPD.'});}
 });
}
