import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveCategory,archiveContext,archiveFilterContext,archiveRecord,registerMonitoringArchives} from '../monitoring-archives.js';
test('monitoring classifies Renstra and generated annex types without RKPD',()=>{
 assert.equal(archiveCategory({jenis:'RKPD Murni'}),null);
 assert.equal(archiveCategory({jenis:'Renstra Perubahan'}),'Renstra');
 for(const jenis of ['Lampiran Renja','Lampiran Perbup Renja','Lampiran Kepbup Perubahan Renja','Lampiran Perbup Renstra'])assert.equal(archiveCategory({jenis}),'Lampiran Matriks');
});
test('annex approval and verification metadata follow approved parent, no invented versions',()=>{
 const parent={status:'Disetujui',cara:'upload',filePath:'/uploads/a.pdf',versions:[],verifications:[{status:'Disetujui',createdAt:'2026-10-01',verifier:{nama:'Verifier'}},{status:'Perlu Revisi'}]};
 const child={jenis:'Lampiran Perbup Renja',status:'Disetujui',isLampiranOtomatis:true};
 const result=archiveRecord(child,parent);assert.equal(result.verifier,'Verifier');assert.equal(result.verifiedAt,'2026-10-01');assert.equal(result.version,null);assert.equal(result.revisionCount,1);assert.equal(result.available,true);
 const pending=archiveRecord(child,{...parent,status:'Perlu Revisi'});assert.equal(pending.status,'Perlu Revisi');assert.equal(pending.verifiedAt,null);
 const missing=archiveRecord({jenis:'Renja Murni',status:'Disetujui',cara:'upload'});assert.equal(missing.verifiedAt,null);assert.equal(missing.available,false);
});
test('archive API defaults to approved, includes summaries, applies document access',async()=>{
 let handler;
 const docs=[{id:'a',opdId:'o',jenis:'Renja Murni',tahun:'2027',status:'Disetujui'}, {id:'b',opdId:'o',jenis:'Renja Perubahan',tahun:'2026',status:'Draft'}, {id:'hidden',opdId:'o',jenis:'Renstra',status:'Disetujui'}];
 const prisma={opd:{findMany:async()=>[{id:'o',nama:'OPD'}]},document:{findMany:async(query)=>{assert.equal(query.where.status,'Disetujui');assert.ok(query.where.OR);return docs;}}};
 registerMonitoringArchives({get:(_,...handlers)=>handler=handlers.at(-1)},prisma,()=>{},()=>true,async(_,doc)=>({canView:doc.id!=='hidden'}));
 const response={statusCode:200,status(s){this.statusCode=s;return this;},json(data){this.data=data;return this;}};
 await handler({query:{tahun:'2027'},currentUser:{}},response);
 assert.deepEqual(response.data.opds[0].documents.map(d=>d.id),['a']);assert.equal(response.data.opds[0].categories['Renja Perubahan'].approved,0);
 await handler({query:{tahun:'2027',status:'Semua'},currentUser:{}},response);assert.equal(response.data.opds[0].documents.length,1);
 await handler({query:{tahun:'bad'},currentUser:{}},response);assert.equal(response.statusCode,400);
});
test('archive API denies OPD accounts before reading records',async()=>{
 let handler;registerMonitoringArchives({get:(_,...handlers)=>handler=handlers.at(-1)}, {},()=>{},()=>false,()=>{});
 const response={status(s){this.statusCode=s;return this;},json(data){this.data=data;}};
 await handler({query:{},currentUser:{role:'opd'}},response);assert.equal(response.statusCode,403);
});

test('opening OPD archives without a year returns approved documents across years',async()=>{
 let handler;
 const docs=[
  {id:'old',opdId:'health',jenis:'Renja Murni',tahun:'2025',status:'Disetujui'},
  {id:'new',opdId:'health',jenis:'Renja Murni',tahun:'2027',status:'Disetujui'}
 ];
 const prisma={opd:{findMany:async()=>[{id:'health',nama:'Dinas Kesehatan'}]},document:{findMany:async({where})=>{
  assert.equal(where.status,'Disetujui');
  assert.equal(where.OR[0].tahun,undefined);
  return docs;
 }}};
 registerMonitoringArchives({get:(_,...handlers)=>handler=handlers.at(-1)},prisma,()=>{},()=>true,async()=>({canView:true}));
 const response={statusCode:200,status(code){this.statusCode=code;return this;},json(data){this.data=data;}};
 for(const query of [{},{tahun:'all'}]){
  await handler({query,currentUser:{role:'admin'}},response);
  assert.equal(response.statusCode,200);
  assert.equal(response.data.tahun,'all');
  assert.deepEqual(response.data.opds[0].documents.map(doc=>doc.id),['old','new']);
 }
});

test('budget context uses next-year pure, current-year changes and inclusive Renstra period',()=>{
 for(const jenis of ['Renja Murni','Lampiran Perbup Renja']){
  assert.ok(archiveContext({jenis,tahun:'2027'},'2026'));
  assert.equal(archiveContext({jenis,tahun:'2026'},'2026'),null);
 }
 for(const jenis of ['Renja Perubahan','Lampiran Kepbup Perubahan Renja']){
  assert.ok(archiveContext({jenis,tahun:'2026'},'2026'));
  assert.equal(archiveContext({jenis,tahun:'2027'},'2026'),null);
 }
 const renstra={jenis:'Renstra',tahun:'2025',regulation:{periodeMulai:'2025',periodeAkhir:'2029'}};
 for(const year of ['2025','2026','2029'])assert.ok(archiveContext(renstra,year));
 for(const year of ['2024','2030'])assert.equal(archiveContext(renstra,year),null);
 assert.equal(archiveContext({...renstra,regulation:{periodeMulai:'2029',periodeAkhir:'2025'}},'2026'),null);
 assert.equal(archiveContext({jenis:'Lampiran Perbup Renstra',tahun:'2026'},'2026'),null);
 assert.equal(archiveContext({jenis:'Lampiran Perbup Renja',tahun:'2027'},'2026').matrixKind,'Murni');
 assert.equal(archiveContext({jenis:'Lampiran Kepbup Perubahan Renja',tahun:'2026'},'2026').matrixKind,'Perubahan');
 assert.equal(archiveContext({jenis:'Lampiran Renja',tahun:'2027'},'2026',{jenis:'Renja Murni'}).matrixKind,'Murni');
 assert.equal(archiveContext({jenis:'Lampiran Renja',tahun:'2027'},'2026'),null);
});

test('archive dropdown year matches the actual document year and supports all years',()=>{
 const renja={jenis:'Renja Murni',tahun:'2027'};
 assert.equal(archiveFilterContext(renja,'2026'),null);
 assert.ok(archiveFilterContext(renja,'2027'));
 assert.ok(archiveFilterContext(renja,'all'));
 const renstra={jenis:'Renstra Murni',tahun:'2025',regulation:{periodeMulai:'2025',periodeAkhir:'2029'}};
 assert.ok(archiveFilterContext(renstra,'2026'));
 assert.equal(archiveFilterContext(renstra,'2030'),null);
 assert.ok(archiveFilterContext({jenis:'Lampiran Perbup Renstra',tahun:'2025'},'2026',renstra));
});
