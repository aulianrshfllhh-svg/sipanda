import 'dotenv/config';
import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
const p=new PrismaClient(),base=process.env.TEST_API || 'http://localhost:3001/api';
const createdDocs=[],createdTemplates=[];
async function login(username,password){const r=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const d=await r.json();assert.equal(r.status,200,d.error);return d.token;}
const admin=await login('admin','admin123');
async function call(path,method='GET',body,token=admin,status=200){const r=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d;}
try{
 const templates=await call('/templates');for (const jenis of ['Renja Murni','Renja Perubahan','RKPD Murni','RKPD Perubahan','RPJMD']) assert.ok(templates.some(t=>t.tahun==='2027' && t.jenis===jenis && t.isActive));
 const copy=await call('/templates/tpl-renja-murni-2027-v1/duplicate','POST',{tahun:'2098',nama:'Integration test'},admin,201);createdTemplates.push(copy.id);
 copy.sections[0].subsections[0].title='Test snapshot original';await call(`/templates/${copy.id}`,'PUT',copy);await call(`/templates/${copy.id}/activate`,'POST');
 const doc=await call('/documents','POST',{jenis:'Renja Murni',tahun:'2098',opdId:'kec-mundu',cara:'template',judul:'Integration test'},admin,201);createdDocs.push(doc.id);assert.equal(doc.sections.length,6);assert.equal(doc.templateId,copy.id);
 const second=await call(`/templates/${copy.id}/duplicate`,'POST',{tahun:'2098'},admin,201);createdTemplates.push(second.id);second.sections[0].subsections[0].title='Test snapshot revised';await call(`/templates/${second.id}`,'PUT',second);await call(`/templates/${second.id}/activate`,'POST');
 const stable=await call(`/documents/${doc.id}`);assert.equal(stable.sections[0].subsections[0].title,'Test snapshot original');
 await call(`/templates/${copy.id}`,'PUT',copy,admin,409);
 await call(`/documents/${doc.id}`,'PUT',{sections:stable.sections,frontMatter:null});
 const bad=structuredClone(stable.sections[0]);bad.title='Forbidden structure edit';await call(`/documents/${doc.id}`,'PUT',{sections:[bad]},admin,400);
 const chapter=stable.sections[1];chapter.subsections[0].content='<p>Partial chapter synchronization test.</p>';await call(`/documents/${doc.id}`,'PUT',{sections:[chapter]});
 const child=await p.document.findFirst({where:{parentId:doc.id},include:{sections:{orderBy:{babOrder:'asc'}}}});assert.equal(child.sections.length,6);assert.equal(child.sections[1].subsections[0].content,chapter.subsections[0].content);
 const csv='Tingkat;Kode;Uraian;Indikator;Lokasi;Target;Dana;Catatan;Asal;Target Maju;Dana Maju\nsubkegiatan;1;Contoh;Dokumen;Mundu;1;100000000;Dummy;SIPD;1;110000000\n';
 const form=new FormData();form.append('type','renja');form.append('file',new Blob([csv]),'test.csv');const imported=await fetch(base+'/document-tables/import',{method:'POST',headers:{Authorization:`Bearer ${admin}`},body:form});assert.equal(imported.status,200,await imported.clone().text());assert.equal((await imported.json()).rows[0].cells[5],'100000000');
 const opd=await login('opd.dinkes','opd123');await call(`/templates/${copy.id}/duplicate`,'POST',{tahun:'2098'},opd,403);await call('/document-settings/kec-mundu','PUT',{opd:{}},opd,403);
 const staffList=await call('/staf');const staff=staffList.find(s=>s.username==='agus.bapperida');
 if(staff){
  const internal=await call('/documents','POST',{jenis:'Renja Murni',tahun:'2027',opdId:'bapperida',cara:'template',judul:'Integration multiwriter'},admin,201);createdDocs.push(internal.id);
  await call(`/documents/${internal.id}/assignments/chapters`,'POST',{userId:staff.id,babId:'bab-2'},admin,201);
  const staffToken=await login('agus.bapperida','staf123');const assigned=await call(`/documents/${internal.id}`,'GET',undefined,staffToken);assert.deepEqual(assigned.permissions.editableBabIds,['bab-2']);await call(`/documents/${internal.id}`,'PUT',{sections:[assigned.sections[0]]},staffToken,403);await call(`/documents/${internal.id}`,'PUT',{sections:[assigned.sections[1]]},staffToken);
 }
 const submission=await call('/documents','POST',{jenis:'Renja Murni',tahun:'2027',opdId:'dinkes',cara:'template',judul:'Integration verification'},admin,201);createdDocs.push(submission.id);
 await call(`/documents/${submission.id}/submit`,'POST',{},opd,400);
 for(const bab of submission.sections)for(const sub of bab.subsections)sub.content='<p>Narasi lengkap untuk pengujian alur verifikasi dokumen.</p>';
 await call(`/documents/${submission.id}`,'PUT',{sections:submission.sections},opd);
 await call(`/documents/${submission.id}/submit`,'POST',{},opd);
 await call(`/documents/${submission.id}/verify`,'POST',{status:'Disetujui'});
 const verifiedChild=await p.document.findFirst({where:{parentId:submission.id}});assert.equal(verifiedChild.status,'Disetujui Bapperida');
 console.log('PASS: template versions, immutable snapshots, structure lock, full lampiran sync after partial save, CSV import, admin-only management, per-chapter Renja Bapperida access');
}finally{
 for(const id of createdDocs){await p.verification.deleteMany({where:{documentId:id}});await p.activityLog.deleteMany({where:{documentId:id}});await p.penugasanLog.deleteMany({where:{target:{startsWith:id+':'}}});const children=await p.document.findMany({where:{parentId:id},select:{id:true}});for(const child of children)await p.document.delete({where:{id:child.id}});await p.document.delete({where:{id}});}
 for(const id of createdTemplates)await p.template.delete({where:{id}});
 await p.$disconnect();
}

