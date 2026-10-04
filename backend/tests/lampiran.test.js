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
   findUnique:async()=>child,
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
