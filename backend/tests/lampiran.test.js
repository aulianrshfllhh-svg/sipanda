import test from 'node:test';
import assert from 'node:assert/strict';
import { syncLampiran } from '../lampiran.js';

function fixture() {
 const parent={
  id:'parent-1',kodeDoc:'RENJA-LOSARI-2027',jenis:'Renja Murni',tahun:'2027',judul:'Renja',
  opdId:'opd-losari',opd:{id:'opd-losari',nama:'Kecamatan Losari'},status:'Draft',createdById:'user-1',
  sections:[{babId:'bab-1',babTitle:'BAB I PENDAHULUAN',babOrder:1,subsections:[{id:'sub-1',content:'Versi awal'}]}]
 };
 let child=null;
 const tx={
  document:{
   findUnique:async({where})=>where?.id===parent.id?parent:child,
   upsert:async({create,update})=>{
    child=child?{...child,...update}:{...create,id:'annex-1'};
    return child;
   }
  },
  documentSection:{
   deleteMany:async()=>{if(child)child.sections=[];},
   createMany:async({data})=>{child.sections=structuredClone(data);}
  }
 };
 const prisma={
  document:{findUnique:async()=>parent},
  $transaction:async callback=>callback(tx)
 };
 return {parent,prisma,get child(){return child;}};
}

test('automatic annex mirrors its parent until approved, then rebuilds only on explicit request',async()=>{
 const state=fixture();
 const first=await syncLampiran(state.prisma,state.parent);
 assert.equal(first.jenis,'Lampiran Perbup Renja');
 assert.equal(first.regulation.tahunPenetapan,'2026');
 assert.equal(state.child.sections[0].subsections[0].content,'Versi awal');

 state.parent.sections[0].subsections[0].content='Versi terbaru';
 await syncLampiran(state.prisma,state.parent);
 assert.equal(state.child.sections[0].subsections[0].content,'Versi terbaru');

 state.child.status='Disetujui';
 state.child.regulation.nomorPeraturan='17';
 state.parent.sections[0].subsections[0].content='Perubahan setelah persetujuan';
 await syncLampiran(state.prisma,state.parent);
 assert.equal(state.child.sections[0].subsections[0].content,'Versi terbaru');

 await syncLampiran(state.prisma,state.parent,true);
 assert.equal(state.child.sections[0].subsections[0].content,'Perubahan setelah persetujuan');
 assert.equal(state.child.regulation.nomorPeraturan,'17');
});

test('Renja Perubahan creates a Kepbup annex',async()=>{
 const state=fixture();
 state.parent.jenis='Renja Perubahan';
 const annex=await syncLampiran(state.prisma,state.parent);
 assert.equal(annex.jenis,'Lampiran Kepbup Perubahan Renja');
 assert.equal(annex.regulation.tahunPenetapan,'2027');
});

test('Renstra Murni and Renstra Perubahan create a Perbup annex',async()=>{
 const state=fixture();
 state.parent.jenis='Renstra Murni';
 const annex=await syncLampiran(state.prisma,state.parent);
 assert.equal(annex.jenis,'Lampiran Perbup Renstra');

 state.parent.jenis='Renstra Perubahan';
 const changedAnnex=await syncLampiran(state.prisma,state.parent);
 assert.equal(changedAnnex.jenis,'Lampiran Perbup Renstra');
});

test('submitting Renja or Renstra automatically submits the same annex and follows verification',async()=>{
 for (const jenis of ['Renja Murni', 'Renstra', 'Renstra Murni']) {
  const state=fixture();
  state.parent.jenis=jenis;
  const initial=await syncLampiran(state.prisma,state.parent);
  assert.equal(initial.status,'Draft');
  for (const status of ['Menunggu Verifikasi', 'Perlu Revisi', 'Menunggu Verifikasi', 'Disetujui']) {
   state.parent.status=status;
   const annex=await syncLampiran(state.prisma,state.parent);
   assert.equal(annex.id,initial.id);
   assert.equal(annex.kodeDoc,initial.kodeDoc);
   assert.equal(annex.parentId,state.parent.id);
   assert.equal(annex.status,status);
  }
 }
});
