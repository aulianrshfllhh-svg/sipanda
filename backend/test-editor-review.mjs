import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Document,Packer,Paragraph,TextRun} from 'docx';
import {documentFormatReport} from './submission-validation.js';
const base='http://localhost:5173';
const login=await (await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'admin123'})})).json();assert.ok(login.token);
const headers={Authorization:`Bearer ${login.token}`};
const docs=await (await fetch(`${base}/api/documents?includeLampiran=true`,{headers})).json();
const source=docs.find(doc=>doc.kodeDoc==='DEMO-RENJA-MUNDU-2027');assert.ok(source);
const fixture=await (await fetch(`${base}/api/documents/${source.id}`,{headers})).json();
fixture.status='Draft';fixture.permissions={...fixture.permissions,canEdit:true,canVerify:false,editableBabIds:fixture.sections.map(b=>b.id)};
for(const bab of fixture.sections)for(const sub of bab.subsections){sub.content='<p>Narasi perangkat daerah sudah lengkap dan sesuai struktur template.</p>';sub.tables=[];}
const first=fixture.sections[0].subsections[0];first.content+='<table data-object-id="uncaptioned"><tbody><tr><td>Tabel pelayanan masyarakat tanpa caption</td></tr></tbody></table>';
first.tables=[{id:'renja-fixture',type:'renja',rows:[{level:'subkegiatan',cells:['1','Program pelayanan','Indikator','Mundu','100','1000','','OPD','100','1000']}]}];
const user={...login.user,role:'opd',isSuperAdmin:false,roleKodes:[],opdId:fixture.opdId};
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let submits=0,checks=0;const errors=[];const comments=[];const versions=[{id:'v1',versi:1,savedBy:'Penyusun',createdAt:new Date().toISOString()},{id:'v2',versi:2,savedBy:'Penyusun',createdAt:new Date().toISOString()}];
try{
 const page=await browser.newPage();await page.setViewport({width:1366,height:768});page.on('pageerror',e=>errors.push(e.message));
 await page.evaluateOnNewDocument(({token,user})=>{localStorage.setItem('sipanda_token',token);localStorage.setItem('sipanda_user',JSON.stringify(user));},{token:login.token,user});
 await page.setRequestInterception(true);page.on('request',request=>{
  if(request.url().includes(`/api/documents/${source.id}/comments`)){
   const body=request.postData()?JSON.parse(request.postData()):{};
   if(request.method()==='POST')comments.push({id:String(comments.length+1),parent_id:body.parentId||null,user_name:'Penyusun',body:body.body,target:body.target,resolved:false});
   if(request.method()==='PATCH')comments.find(c=>c.id===request.url().split('/').at(-1)).resolved=body.resolved;
   return request.respond({contentType:'application/json',body:JSON.stringify(request.method()==='GET'?comments:{success:true})});
  }
  if(request.url().includes(`/api/documents/${source.id}/versions`)){
   let data=versions;const id=request.url().split('/').at(-1);
   if(id!=='versions'){const snapshot=structuredClone(fixture);snapshot.sections[0].subsections[0].content=id==='v1'?'<p>Isi sebelum revisi</p>':'<p>Isi sesudah revisi</p>';data={id,sections:snapshot};}
   return request.respond({contentType:'application/json',body:JSON.stringify(data)});
  }
    if(request.url().endsWith(`/api/documents/${source.id}/editor-session`))return request.respond({contentType:'application/json',body:JSON.stringify({leases:fixture.sections.map(b=>({babId:b.id,owned:true})),revisions:fixture.editorRevisions||{},permissions:fixture.permissions,sections:fixture.sections,frontMatter:fixture.frontMatter})});
  if(request.url().endsWith('/api/editor/import'))return request.continue();
  if(request.url().endsWith('/api/auth/me'))return request.respond({contentType:'application/json',body:JSON.stringify({user})});
  if(request.url().endsWith(`/api/documents/${source.id}/format-check`)){checks++;return request.respond({contentType:'application/json',body:JSON.stringify(documentFormatReport(fixture))});}
  if(request.url().endsWith(`/api/documents/${source.id}`)&&request.method()==='GET')return request.respond({contentType:'application/json',body:JSON.stringify(fixture)});
  if(request.url().includes('/api/')&&['PUT','POST','PATCH','DELETE'].includes(request.method())){
   if(request.url().endsWith('/submit'))submits++;
   if(request.method()==='PUT'&&request.url().endsWith(`/api/documents/${source.id}`)){const data=JSON.parse(request.postData());for(const bab of data.sections||[]){const saved=fixture.sections.find(b=>b.id===bab.id);if(saved)saved.subsections=bab.subsections;}}
   return request.respond({contentType:'application/json',body:JSON.stringify(fixture)});
  }
  request.continue();
 });
 await page.goto(`${base}/editor/${source.id}`,{waitUntil:'networkidle2'});
 async function click(label){await page.evaluate(label=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===label)?.click(),label);}
 const root=`.ProseMirror[data-sub-id="${first.id}"]`;
 await page.$eval(root,node=>{const range=document.createRange();range.selectNodeContents(node.firstElementChild);const s=window.getSelection();s.removeAllRanges();s.addRange(range);});
 await click('Komentar / Riwayat');await page.waitForSelector('[aria-label="Komentar baru"]');
 await page.type('[aria-label="Komentar baru"]','Lengkapi uraian pelayanan.');await click('Kirim komentar');await page.waitForFunction(()=>document.querySelector('[aria-label="Komentar dan riwayat"]').textContent.includes('Lengkapi uraian pelayanan.'));
 await page.type('[aria-label="Balasan komentar"]','Uraian sudah diperbaiki.');await click('Balas');await page.waitForFunction(()=>document.querySelector('[aria-label="Komentar dan riwayat"]').textContent.includes('Uraian sudah diperbaiki.'));
 await click('Tandai Selesai');await page.waitForFunction(()=>document.querySelector('[aria-label="Komentar dan riwayat"]').textContent.includes('Komentar Terbuka: 0'));
 await click('Buka kembali');await page.waitForFunction(()=>document.querySelector('[aria-label="Komentar dan riwayat"]').textContent.includes('Komentar Terbuka: 1'));
 await page.select('[aria-label="Versi sebelumnya"]','v1');await page.select('[aria-label="Versi berikutnya"]','v2');await click('Bandingkan');await page.waitForFunction(()=>document.querySelector('[aria-label="Komentar dan riwayat"]').textContent.includes('Isi sesudah revisi'));
 assert.ok(await page.$('.bg-amber-50'));assert.equal(comments.length,2);assert.equal(comments[1].parent_id,comments[0].id);assert.deepEqual(errors,[]);
 fs.mkdirSync('../artifacts/editor-upgrade',{recursive:true});await page.screenshot({path:'../artifacts/editor-upgrade/stage-9-review.png'});console.log('PASS stage 9: anchored comment, reply, resolve/reopen, two-version highlighted comparison; all writes intercepted');
}finally{await browser.close();}
