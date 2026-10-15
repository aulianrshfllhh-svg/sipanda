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
const archiveSelect={id:true,opdId:true,judul:true,jenis:true,tahun:true,status:true,cara:true,isLampiranOtomatis:true,parentId:true,filePath:true,fileName:true,createdById:true,regulation:true,createdAt:true,nomerRegistrasiArsip:true,tteNumber:true,finalizedAt:true,
 versions:{orderBy:{versi:'desc'},take:1,select:{versi:true}},
 verifications:{orderBy:{createdAt:'desc'},select:{status:true,catatanRevisi:true,createdAt:true,verifier:{select:{nama:true}}}},statusLogs:{orderBy:{waktu:'asc'},select:{dari:true,ke:true,oleh:true,alasan:true,waktu:true}},_count:{select:{sections:true}}};
export function archiveRecord(doc, parent) {
 const source=doc.isLampiranOtomatis?parent:doc;
 const approved=['Disetujui Bapperida','Final'].includes(doc.status)&&(!doc.isLampiranOtomatis||['Disetujui Bapperida','Final'].includes(parent?.status));
 const verification=approved?(doc.verifications?.find(v=>v.status==='Disetujui Bapperida'||v.status==='Disetujui')||source?.verifications?.find(v=>v.status==='Disetujui Bapperida'||v.status==='Disetujui')):null;
 return {id:doc.id,opdId:doc.opdId,judul:doc.judul,jenis:doc.jenis,category:archiveCategory(doc),tahun:doc.tahun,
  status:approved?(doc.isLampiranOtomatis?parent.status:doc.status):doc.isLampiranOtomatis&&!['Disetujui Bapperida','Final'].includes(parent?.status)?(parent?.status||'Draft'):doc.status,
  verifiedAt:verification?.createdAt||null,verifier:verification?.verifier?.nama||null,
  version:source?.versions?.[0]?.versi??null,
  revisionCount:(source?.verifications||[]).filter(v=>v.status==='Perlu Revisi').length,
  verificationSource:doc.isLampiranOtomatis?'Mengikuti dokumen induk':'Dokumen ini',
  cara:doc.cara,isLampiranOtomatis:doc.isLampiranOtomatis,fileName:doc.fileName,
  available:source?.cara==='upload'?!!source.filePath:(source?._count?.sections||0)>0,
  createdAt:doc.createdAt,submittedAt:(doc.statusLogs||[]).filter(log=>log.ke==='Menunggu Verifikasi').at(-1)?.waktu||doc.createdAt,
  nomerRegistrasiArsip:doc.nomerRegistrasiArsip||null,tteNumber:doc.tteNumber||null,finalizedAt:doc.finalizedAt||null,
  catatanRevisi:doc.verifications?.find(v=>v.catatanRevisi)?.catatanRevisi||doc.catatanRevisi||null,
  timeline:source?.statusLogs||doc.statusLogs||[],verifications:source?.verifications||doc.verifications||[]};
}
export function registerMonitoringArchives(app,prisma,auth,isAdmin,permissions) {
 app.get('/api/monitoring/archives',auth,async(req,res)=>{
  if(!isAdmin(req.currentUser)&&req.currentUser.role!=='staf')return res.status(403).json({error:'Monitoring hanya tersedia untuk pegawai Bapperida.'});
  const tahun=String(req.query.tahun||'all');
  if(tahun!=='all'&&!/^\d{4}$/.test(tahun))return res.status(400).json({error:'Tahun anggaran tidak valid.'});
  const requestedStatus=String(req.query.status||'all');
  const requestedTab=String(req.query.tab||'final');
  if(!['history','final'].includes(requestedTab))return res.status(400).json({error:'Tab arsip tidak valid.'});
  const permittedStatuses=requestedTab==='final'?['Final']:['Menunggu Verifikasi','Perlu Revisi','Disetujui Bapperida','Final'];
  if(requestedStatus!=='all'&&!permittedStatuses.includes(requestedStatus))return res.status(400).json({error:'Filter status tidak valid atau tidak diizinkan.'});
  const statuses=requestedStatus==='all'?permittedStatuses:(permittedStatuses.includes(requestedStatus)?[requestedStatus]:[]);
  const requestedOpd=String(req.query.opdId||'all');
  const requestedType=String(req.query.jenis||'all');
  const allowedTypes=['all','Renja Murni','Renja Perubahan','Renstra','Renstra Murni','Renstra Perubahan','Lampiran Matriks','Lampiran Perbup Renja','Lampiran Kepbup Perubahan Renja','Lampiran Perbup Renstra','Lampiran Renja'];
  if(!allowedTypes.includes(requestedType))return res.status(400).json({error:'Filter jenis dokumen tidak valid.'});
  try{
   const assignments=isAdmin(req.currentUser)?null:await prisma.penugasanVerifikasi.findMany({where:{userId:req.currentUser.id,...(tahun==='all'?{}:{tahun})},select:{opdId:true}});
   const assignedIds=assignments?.map(a=>a.opdId);
   if(requestedOpd!=='all'&&assignedIds&&!assignedIds.includes(requestedOpd))return res.status(403).json({error:'OPD tidak termasuk penugasan Anda.'});
   const opds=await prisma.opd.findMany({where:{isActive:true,...(assignments?{id:{in:requestedOpd==='all'?assignedIds:[requestedOpd]}}:requestedOpd==='all'?{}:{id:requestedOpd})},orderBy:{nomorUrut:'asc'}});
   const docs=await prisma.document.findMany({where:{opdId:{in:opds.map(o=>o.id)},status:{in:statuses},OR:[
    {jenis:{in:['Renja Murni','Renja Perubahan','Lampiran Perbup Renja','Lampiran Kepbup Perubahan Renja','Lampiran Renja']},...(tahun==='all'?{}:{tahun})},
    {jenis:{in:['Renstra','Renstra Murni','Renstra Perubahan','Lampiran Perbup Renstra']}}
   ]},select:archiveSelect,orderBy:{updatedAt:'desc'}});
   const visible=[];
   for(const doc of docs)if((await permissions(req.currentUser,doc)).canView)visible.push(doc);
   const byId=new Map(visible.map(d=>[d.id,d]));
   const parentIds=[...new Set(visible.map(d=>d.parentId).filter(id=>id&&!byId.has(id)))];
   if(parentIds.length){
    const parents=await prisma.document.findMany({where:{id:{in:parentIds},opdId:{in:opds.map(o=>o.id)},status:{in:statuses}},select:archiveSelect});
    for(const parent of parents)if((await permissions(req.currentUser,parent)).canView)byId.set(parent.id,parent);
   }
   const records=visible.flatMap(d=>{
    const parent=byId.get(d.parentId),context=archiveFilterContext(d,tahun,parent),record=archiveRecord(d,parent);
    return context&&statuses.includes(record.status)&&(requestedType==='all'||record.category===requestedType||record.jenis===requestedType)?[{...record,...context}]:[];
   });
   const reminders=opds.length?await prisma.notification.findMany({where:{opdId:{in:opds.map(o=>o.id)},title:'Pengingat Monitoring OPD'},orderBy:{createdAt:'desc'},select:{opdId:true,createdAt:true,sender:{select:{nama:true}}}}):[];
   const reminderByOpd=new Map();for(const reminder of reminders)if(!reminderByOpd.has(reminder.opdId))reminderByOpd.set(reminder.opdId,{at:reminder.createdAt,by:reminder.sender?.nama||null});
   res.json({tahun,statuses,opds:opds.map(opd=>{
    const items=records.filter(d=>d.opdId===opd.id);
    const categories=Object.fromEntries(archiveCategories.map(category=>{
     const matching=items.filter(d=>d.category===category);
     return [category,{approved:matching.length,final:matching.filter(d=>d.status==='Final').length,pendingFinal:matching.filter(d=>d.status==='Disetujui Bapperida').length}];
    }));
    return {...opd,categories,approvedCount:items.length,documents:items,lastReminder:reminderByOpd.get(opd.id)||null};
   })});
  }catch(error){console.error('Monitoring archives:',error);res.status(500).json({error:'Gagal memuat arsip monitoring OPD.'});}
 });
 app.post('/api/monitoring/reminders',auth,async(req,res)=>{
  const user=req.currentUser;
  if(user.role!=='staf'&&!isAdmin(user))return res.status(403).json({error:'Monitoring hanya tersedia untuk pegawai Bapperida.'});
  const year=String(req.body?.tahun||'');
  const ids=Array.isArray(req.body?.opdIds)?[...new Set(req.body.opdIds.filter(id=>typeof id==='string'))]:[];
  const force=req.body?.force===true&&isAdmin(user);
  if(!/^\d{4}$/.test(year)||!ids.length||ids.length>71)return res.status(400).json({error:'Pilih OPD dan tahun anggaran yang valid.'});
  try{
   const assignments=isAdmin(user)?null:await prisma.penugasanVerifikasi.findMany({where:{userId:user.id,tahun:year,opdId:{in:ids}},select:{opdId:true}});
   if(assignments&&assignments.length!==ids.length)return res.status(403).json({error:'OPD lain di luar penugasan Anda tidak dapat diingatkan.'});
   const valid=await prisma.opd.findMany({where:{id:{in:ids},isActive:true},select:{id:true}});
   if(valid.length!==ids.length)return res.status(404).json({error:'Satu atau lebih OPD tidak ditemukan.'});
   const cutoff=new Date(Date.now()-24*60*60*1000);
   const recent=await prisma.notification.findMany({where:{opdId:{in:ids},title:'Pengingat Monitoring OPD',createdAt:{gte:cutoff}},select:{opdId:true}});
   const limited=new Set(recent.map(row=>row.opdId));
   const sendIds=force?ids:ids.filter(id=>!limited.has(id));
   if(sendIds.length)await prisma.notification.createMany({data:sendIds.map(opdId=>({opdId,senderId:user.id,title:'Pengingat Monitoring OPD',message:`Mohon lengkapi pengiriman dokumen perencanaan T.A. ${year} melalui SIPANDA.`}))});
   res.status(201).json({sentCount:sendIds.length,skippedCount:ids.length-sendIds.length,skippedOpdIds:ids.filter(id=>!sendIds.includes(id))});
  }catch(error){console.error('Monitoring reminders:',error);res.status(500).json({error:'Gagal mengirim pengingat monitoring.'});}
 });
}
