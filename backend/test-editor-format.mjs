import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
let submits=0,checks=0;const errors=[];
try{
 const page=await browser.newPage();await page.setViewport({width:1366,height:768});page.on('pageerror',e=>errors.push(e.message));
 await page.evaluateOnNewDocument(({token,user})=>{localStorage.setItem('sipanda_token',token);localStorage.setItem('sipanda_user',JSON.stringify(user));},{token:login.token,user});
 await page.setRequestInterception(true);page.on('request',request=>{
    if(request.url().endsWith(`/api/documents/${source.id}/editor-session`))return request.respond({contentType:'application/json',body:JSON.stringify({leases:fixture.sections.map(b=>({babId:b.id,owned:true})),revisions:fixture.editorRevisions||{},permissions:fixture.permissions,sections:fixture.sections,frontMatter:fixture.frontMatter})});
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
 await click('Ajukan ke Admin');await page.waitForFunction(()=>document.querySelector('aside[aria-label="Hasil Cek Format"]')?.textContent.includes('Tabel belum memiliki judul caption'));
 await page.waitForFunction(()=>document.body.textContent.includes('Perbaiki masalah wajib pada Cek Format sebelum mengajukan.'));
 assert.equal(submits,0);assert.ok(checks>0);
 await page.evaluate(()=>[...document.querySelectorAll('aside[aria-label="Hasil Cek Format"] button')].find(b=>b.textContent.includes('Tabel belum memiliki judul caption'))?.click());
 await new Promise(resolve=>setTimeout(resolve,700));
 const location=await page.$eval('[data-object-id="uncaptioned"]',t=>({top:t.getBoundingClientRect().top,bottom:t.getBoundingClientRect().bottom,height:innerHeight}));assert.ok(location.top>=0&&location.bottom<=location.height);
 await click('Tutup');
 await page.evaluate(subId=>{const root=[...document.querySelectorAll('.ProseMirror[data-sub-id]')].find(e=>e.dataset.subId===subId),table=root.querySelector('[data-object-id="uncaptioned"]');const caption=document.createElement('p');caption.className='doc-caption';caption.setAttribute('data-caption-id','uncaptioned');caption.setAttribute('data-caption-for','uncaptioned');caption.textContent='Tabel 1.1 Pelayanan masyarakat';table.before(caption);root.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));},first.id);
 await click('Cek Format');await page.waitForFunction(()=>document.querySelector('aside[aria-label="Hasil Cek Format"]')?.textContent.includes('Format wajib terpenuhi.'));assert.equal(submits,0);
 fs.mkdirSync('../artifacts/editor-upgrade',{recursive:true});await page.screenshot({path:'../artifacts/editor-upgrade/stage-6-format.png'});assert.deepEqual(errors,[]);
 console.log('PASS stage 6: Ajukan blocks an uncaptioned table without POST submit, clickable issue scrolls to table, adding caption resolves required report; all writes intercepted');
}finally{await browser.close();}
