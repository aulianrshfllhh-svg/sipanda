import {randomUUID,createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderDocument} from './document-render.js';
import {documentSettings} from './document-settings.js';
const archives=fileURLToPath(new URL('./.editor-review-archives/',import.meta.url));
export async function submissionSnapshot(doc){
 const snapshot={...doc,sections:doc.sections.map(b=>({id:b.babId||b.id,title:b.babTitle||b.title,order:b.babOrder||b.order,subsections:b.subsections}))};
 if(doc.cara==='upload'&&doc.filePath?.startsWith('/uploads/')){
  const data=await fs.readFile(new URL(`./uploads/${path.basename(doc.filePath)}`,import.meta.url));const sha256=createHash('sha256').update(data).digest('hex');await fs.mkdir(archives,{recursive:true});await fs.writeFile(path.join(archives,`${sha256}.bin`),data,{flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});snapshot.sourceArchive={sha256,name:doc.fileName};
 }
 delete snapshot.permissions;return JSON.parse(JSON.stringify(snapshot));
}
export function registerDocumentReview(app,prisma,auth,permissions){
 let ready;
 const initialize=()=>ready ||= prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS editor_document_comments(id VARCHAR(191) PRIMARY KEY,document_id VARCHAR(191) NOT NULL,parent_id VARCHAR(191),user_id VARCHAR(191) NOT NULL,user_name VARCHAR(255) NOT NULL,body TEXT NOT NULL,target JSON NOT NULL,resolved BOOLEAN NOT NULL DEFAULT FALSE,created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),INDEX editor_comment_doc(document_id,parent_id))`).catch(error=>{ready=undefined;throw error;});
 async function load(req){const doc=await prisma.document.findUnique({where:{id:req.params.id},include:{sections:true}});if(!doc)throw Object.assign(new Error('Dokumen tidak ditemukan'),{status:404});if(!(await permissions(req.currentUser,doc)).canView)throw Object.assign(new Error('Dokumen tidak termasuk penugasan Anda'),{status:403});return doc;}
 const route=fn=>async(req,res)=>{try{await fn(req,res);}catch(error){res.status(error.status||500).json({error:error.status?error.message:'Tidak berhasil memuat atau menyimpan telaah dokumen.'});}};
 app.get('/api/documents/:id/comments',auth,route(async(req,res)=>{await load(req);await initialize();const rows=await prisma.$queryRaw`SELECT * FROM editor_document_comments WHERE document_id=${req.params.id} ORDER BY created_at,id`;res.json(rows.map(r=>({...r,target:typeof r.target==='string'?JSON.parse(r.target):r.target})));}));
 app.post('/api/documents/:id/comments',auth,route(async(req,res)=>{
  const doc=await load(req);if(doc.isLampiranOtomatis)throw Object.assign(new Error('Tuliskan komentar pada dokumen induk.'),{status:403});await initialize();
  const body=String(req.body.body||'').trim();if(!body||body.length>10000)throw Object.assign(new Error('Isi komentar 1–10.000 karakter.'),{status:400});
  let target=req.body.target,parentId=req.body.parentId||null;
  if(parentId){const [parent]=await prisma.$queryRaw`SELECT * FROM editor_document_comments WHERE id=${parentId} AND document_id=${doc.id} AND parent_id IS NULL`;if(!parent)throw Object.assign(new Error('Rantai komentar tidak ditemukan'),{status:400});target=typeof parent.target==='string'?JSON.parse(parent.target):parent.target;}
  if(!target||!doc.sections.some(b=>(b.babId||b.id)===target.babId&&b.subsections.some(s=>s.id===target.subId))||!['paragraph','table'].includes(target.kind))throw Object.assign(new Error('Pilih paragraf atau tabel dalam dokumen.'),{status:400});
  target={babId:target.babId,subId:target.subId,kind:target.kind,objectId:String(target.objectId||'').slice(0,160),index:Math.max(0,Math.min(100000,Number(target.index)||0)),quote:String(target.quote||'').slice(0,2000)};
  const id=randomUUID(),name=req.currentUser.name||req.currentUser.nama||'Penyusun';await prisma.$executeRaw`INSERT INTO editor_document_comments(id,document_id,parent_id,user_id,user_name,body,target) VALUES(${id},${doc.id},${parentId},${req.currentUser.id},${name},${body},${JSON.stringify(target)})`;res.status(201).json({id});
 }));
 app.patch('/api/documents/:id/comments/:commentId',auth,route(async(req,res)=>{await load(req);await initialize();if(typeof req.body.resolved!=='boolean')throw Object.assign(new Error('Status komentar tidak valid'),{status:400});const count=await prisma.$executeRaw`UPDATE editor_document_comments SET resolved=${req.body.resolved},updated_at=CURRENT_TIMESTAMP(3) WHERE id=${req.params.commentId} AND document_id=${req.params.id} AND parent_id IS NULL`;if(!count)throw Object.assign(new Error('Komentar tidak ditemukan'),{status:404});res.json({success:true});}));
 app.get('/api/documents/:id/versions',auth,route(async(req,res)=>{await load(req);res.json(await prisma.documentVersion.findMany({where:{documentId:req.params.id},orderBy:{versi:'desc'},select:{id:true,versi:true,savedBy:true,keterangan:true,createdAt:true}}));}));
 app.get('/api/documents/:id/versions/:versionId',auth,route(async(req,res)=>{await load(req);const version=await prisma.documentVersion.findFirst({where:{id:req.params.versionId,documentId:req.params.id}});if(!version)throw Object.assign(new Error('Versi tidak ditemukan'),{status:404});res.json(version);}));
 app.get('/api/documents/:id/versions/:versionId/preview',auth,route(async(req,res)=>{const doc=await load(req);const version=await prisma.documentVersion.findFirst({where:{id:req.params.versionId,documentId:req.params.id}});if(!version)throw Object.assign(new Error('Versi tidak ditemukan'),{status:404});const snapshot=Array.isArray(version.sections)?{...doc,sections:version.sections}:version.sections;res.type('html').send(renderDocument(snapshot,snapshot.documentSettings||await documentSettings(prisma,doc.opdId)));}));
 app.get('/api/documents/:id/versions/:versionId/source',auth,route(async(req,res)=>{await load(req);const version=await prisma.documentVersion.findFirst({where:{id:req.params.versionId,documentId:req.params.id}});const source=version?.sections?.sourceArchive;if(!source||!/^[a-f0-9]{64}$/.test(source.sha256))throw Object.assign(new Error('Berkas versi tidak tersedia'),{status:404});res.set('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(source.name||'dokumen')}`);res.send(await fs.readFile(path.join(archives,`${source.sha256}.bin`)));}));
}
