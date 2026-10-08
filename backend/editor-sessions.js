import {createHash} from 'node:crypto';

export const LEASE_MS=90000;
export function chapterRevisions(doc){
  return Object.fromEntries([...(doc.sections||[])].sort((a,b)=>(a.babOrder??a.order??0)-(b.babOrder??b.order??0)).map((bab,index)=>[bab.babId||bab.id,createHash('sha256').update(JSON.stringify({subsections:bab.subsections,frontMatter:index===0?doc.frontMatter:null})).digest('hex')]));
}
export class EditorConflict extends Error {
  constructor(message,status=409,details={}){super(message);this.status=status;this.details=details;}
}
export function createEditorSessions(prisma,permissions){
  let ready;
  function initialize(){return ready ||= prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS editor_chapter_leases (
    document_id VARCHAR(191) NOT NULL, bab_id VARCHAR(50) NOT NULL,
    session_id VARCHAR(64) NOT NULL, user_id VARCHAR(191) NOT NULL,
    user_name VARCHAR(255) NOT NULL, expires_at DATETIME(3) NOT NULL,
    PRIMARY KEY (document_id,bab_id), INDEX editor_lease_expiry(expires_at)
  )`);}
  const sessionValid=id=>typeof id==='string'&&/^[\w-]{16,64}$/.test(id);
  async function acquire(user,id,sessionId,babIds,release=false){
    if(!sessionValid(sessionId)||!Array.isArray(babIds)||babIds.length>100)throw new EditorConflict('Sesi penyunting tidak valid',400);
    await initialize();
    return prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM documents WHERE id=${id} FOR UPDATE`;
      const doc=await tx.document.findUnique({where:{id},include:{sections:{orderBy:{babOrder:'asc'}}}});
      if(!doc)throw new EditorConflict('Dokumen tidak ditemukan',404);
      const allowed=await permissions(user,doc);
      if(!allowed.canView)throw new EditorConflict('Dokumen tidak termasuk penugasan Anda',403);
      const leases=[];
      for(const babId of [...new Set(babIds)]){
        if(release){await tx.$executeRaw`DELETE FROM editor_chapter_leases WHERE document_id=${id} AND bab_id=${babId} AND session_id=${sessionId} AND user_id=${user.id}`;continue;}
        if(!allowed.canEdit||!allowed.editableBabIds.includes(babId))continue;
        const [existing]=await tx.$queryRaw`SELECT * FROM editor_chapter_leases WHERE document_id=${id} AND bab_id=${babId} FOR UPDATE`;
        if(existing&&new Date(existing.expires_at).getTime()>Date.now()&&(existing.session_id!==sessionId||existing.user_id!==user.id)){
          leases.push({babId,owned:false,holder:existing.user_name,sameAccount:existing.user_id===user.id,expiresAt:existing.expires_at});continue;
        }
        const expiresAt=new Date(Date.now()+LEASE_MS);
        await tx.$executeRaw`INSERT INTO editor_chapter_leases(document_id,bab_id,session_id,user_id,user_name,expires_at) VALUES(${id},${babId},${sessionId},${user.id},${user.name||user.nama||'Penyusun'},${expiresAt}) ON DUPLICATE KEY UPDATE session_id=VALUES(session_id),user_id=VALUES(user_id),user_name=VALUES(user_name),expires_at=VALUES(expires_at)`;
        leases.push({babId,owned:true,expiresAt});
      }
      return {leases,revisions:chapterRevisions(doc),permissions:allowed,sections:doc.sections,frontMatter:doc.frontMatter};
    });
  }
  async function save(user,id,sessionId,expected,babIds,write){
    if(!sessionValid(sessionId))throw new EditorConflict('Buka ulang editor untuk memperoleh sesi penyunting.',423);
    await initialize();
    return prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM documents WHERE id=${id} FOR UPDATE`;
      const doc=await tx.document.findUnique({where:{id},include:{sections:{orderBy:{babOrder:'asc'}}}});
      if(!doc)throw new EditorConflict('Dokumen tidak ditemukan',404);
      const allowed=await permissions(user,doc);
      if(!allowed.canEdit||babIds.some(id=>!allowed.editableBabIds.includes(id)))throw new EditorConflict('Hak edit atau status dokumen sudah berubah. Draf perangkat tetap disimpan.',403);
      const revisions=chapterRevisions(doc),conflicts=[];
      for(const babId of [...new Set(babIds)]){
        const [lease]=await tx.$queryRaw`SELECT * FROM editor_chapter_leases WHERE document_id=${id} AND bab_id=${babId} FOR UPDATE`;
        if(!lease||lease.session_id!==sessionId||lease.user_id!==user.id||new Date(lease.expires_at).getTime()<=Date.now())throw new EditorConflict('BAB sedang dikunci sesi lain atau sesi edit kedaluwarsa. Draf perangkat tetap disimpan.',423,{babId});
        if(expected?.[babId]!==revisions[babId])conflicts.push(babId);
      }
      if(conflicts.length)throw new EditorConflict('Isi BAB di server sudah berubah. Periksa konflik sebelum menyinkronkan draf.',409,{conflicts,revisions});
      return write(tx,doc);
    });
  }
  return {acquire,save,initialize};
}
export function registerEditorSessions(app,auth,sessions){
  for(const [method,release] of [['post',false],['delete',true]])app[method]('/api/documents/:id/editor-session',auth,async(req,res)=>{
    try{res.json(await sessions.acquire(req.currentUser,req.params.id,req.body.sessionId,req.body.babIds,release));}
    catch(error){res.status(error.status||500).json({error:error.status?error.message:'Gagal memperoleh sesi editor',...error.details});}
  });
}
