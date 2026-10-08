import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chapterRevisions} from './editor-sessions.js';
const base='http://localhost:5173';
const offlineDuration=Number(process.env.OFFLINE_TEST_MS||61000);
const login=await (await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'admin123'})})).json();assert.ok(login.token);
const headers={Authorization:`Bearer ${login.token}`};
const docs=await (await fetch(base+'/api/documents?includeLampiran=true',{headers})).json();const source=docs.find(d=>d.kodeDoc==='DEMO-RENJA-MUNDU-2027');assert.ok(source);
const fixture=await (await fetch(base+'/api/documents/'+source.id,{headers})).json();
fixture.permissions={...fixture.permissions,canEdit:true,canVerify:false,editableBabIds:fixture.sections.map(b=>b.id)};fixture.editorRevisions=chapterRevisions(fixture);
for(const b of fixture.sections)for(const s of b.subsections){s.content='<p>Narasi awal perangkat daerah untuk pengujian draf offline.</p>';s.tables=[];}
fixture.editorRevisions=chapterRevisions(fixture);
const first=fixture.sections[0].subsections[0],babId=fixture.sections[0].id,owners=new Map();let writes=0;
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
async function createPage(){
 const page=await browser.newPage();await page.setViewport({width:1366,height:768});
 await page.evaluateOnNewDocument(login=>{localStorage.setItem('sipanda_token',login.token);localStorage.setItem('sipanda_user',JSON.stringify(login.user));},login);
 await page.setRequestInterception(true);page.on('request',request=>{
  const respond=(body,status=200)=>request.respond({status,contentType:'application/json',body:JSON.stringify(body)});
  if(request.url().endsWith(`/api/documents/${source.id}/editor-session`)){
   const data=JSON.parse(request.postData());
   if(request.method()==='DELETE'){for(const id of data.babIds)if(owners.get(id)===data.sessionId)owners.delete(id);return respond({leases:[]});}
   const leases=data.babIds.map(id=>{const owner=owners.get(id);if(!owner||owner===data.sessionId){owners.set(id,data.sessionId);return {babId:id,owned:true};}return {babId:id,owned:false,sameAccount:true,holder:'Sesi lain'};});
   return respond({leases,revisions:chapterRevisions(fixture),permissions:fixture.permissions,sections:fixture.sections,frontMatter:fixture.frontMatter});
  }
  if(request.url().endsWith(`/api/documents/${source.id}`)){
   if(request.method()==='GET'){fixture.editorRevisions=chapterRevisions(fixture);return respond(fixture);}
   if(request.method()==='PUT'){
    const data=JSON.parse(request.postData()),versions=chapterRevisions(fixture);
    if(data.sections.some(b=>owners.get(b.id)!==data.editorSessionId))return respond({error:'BAB dikunci sesi lain'},423);
    if(data.sections.some(b=>data.editorRevisions[b.id]!==versions[b.id]))return respond({error:'Versi BAB berubah'},409);
    writes++;for(const b of data.sections){fixture.sections.find(s=>s.id===b.id).subsections=b.subsections;}if(data.frontMatter)fixture.frontMatter=data.frontMatter;fixture.editorRevisions=chapterRevisions(fixture);return respond(fixture);
   }
  }
  if(request.url().includes('/api/')&&['POST','PUT','PATCH','DELETE'].includes(request.method()))return respond(fixture);
  request.continue();
 });
 await page.goto(`${base}/editor/${source.id}`,{waitUntil:'networkidle2'});await page.waitForSelector(`.ProseMirror[data-sub-id="${first.id}"]`);return page;
}
async function type(page,text){await page.$eval(`.ProseMirror[data-sub-id="${first.id}"]`,root=>{root.focus();const r=document.createRange();r.selectNodeContents(root);r.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(r);});await page.keyboard.type(text);}
async function readDraft(page){return page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('sipanda-editor-drafts',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return new Promise((resolve,reject)=>{const r=db.transaction('drafts').objectStore('drafts').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});});}
async function click(page,text){await page.evaluate(text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text)?.click(),text);}
try{
 const page=await createPage();await page.waitForFunction(id=>document.querySelector(`.ProseMirror[data-sub-id="${id}"]`)?.contentEditable==='true',{},first.id);
 const second=await createPage();assert.equal(await second.$eval(`.ProseMirror[data-sub-id="${first.id}"]`,r=>r.contentEditable),'false');assert.match(await second.$eval('#printable-canvas',r=>r.innerText),/sesi lain di akun yang sama/);await second.close();
 await page.setOfflineMode(true);await type(page,' Perubahan selama putus koneksi satu menit.');
 const start=Date.now();await new Promise(r=>setTimeout(r,offlineDuration));
 await type(page,' Tambahan terakhir tetap utuh.');await new Promise(r=>setTimeout(r,600));
 const draft=(await readDraft(page)).find(d=>d.pending);assert.ok(draft);assert.match(draft.document.sections[0].subsections[0].content,/Tambahan terakhir tetap utuh/);assert.equal(writes,0);assert.ok(Date.now()-start>=offlineDuration);
 await page.setOfflineMode(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));try{await page.waitForFunction(()=>document.body.textContent.includes('Draf tersimpan otomatis di server SIPANDA'));}catch(error){console.log(JSON.stringify({writes,status:await page.$eval('header',e=>e.innerText),notice:await page.$$eval('[role="status"]',es=>es.map(e=>e.innerText))}));throw error;}
 assert.ok(writes>0);assert.match(fixture.sections[0].subsections[0].content,/Perubahan selama putus koneksi satu menit.*Tambahan terakhir tetap utuh/s);
 console.log(`PASS ${offlineDuration/1000}-second disconnect: local IndexedDB draft, no API writes while offline, automatic reconnect preserves all typed text; second session read-only`);
 // Close a disconnected page without saving to the server, then recover from IndexedDB.
 await page.setOfflineMode(true);await type(page,' Draf pulih setelah tab ditutup.');await new Promise(r=>setTimeout(r,600));await page.close();owners.clear();
 const recovered=await createPage();await recovered.waitForFunction(()=>document.querySelector('.ProseMirror[data-sub-id]')?.textContent.includes('Draf pulih setelah tab ditutup.'));
 await recovered.waitForFunction(()=>document.body.textContent.includes('Draf tersimpan otomatis di server SIPANDA'));
 assert.match(fixture.sections[0].subsections[0].content,/Draf pulih setelah tab ditutup/);
 console.log('PASS disconnected tab recovery: device draft restored and synchronized in new session');
 // A changed server chapter must be reviewed, never silently overwritten.
 await recovered.setOfflineMode(true);await type(recovered,' Draf konflik milik perangkat.');await new Promise(r=>setTimeout(r,600));
 fixture.sections[0].subsections[0].content='<p>Perubahan baru dari penyunting di server.</p>';fixture.sections[0].subsections.push({id:'server-added-sub',code:'1.99',title:'Sub-bab tambahan di server',content:'<p>Isi tambahan server tetap dipertahankan.</p>',locked:true});owners.set(babId,'other-session');const writesBefore=writes;
 await recovered.setOfflineMode(false);await recovered.evaluate(()=>window.dispatchEvent(new Event('online')));await recovered.waitForFunction(()=>document.body.textContent.includes('Periksa konflik BAB'));
 assert.equal(writes,writesBefore);assert.equal(await recovered.$eval(`.ProseMirror[data-sub-id="${first.id}"]`,r=>r.contentEditable),'false');assert.match(fixture.sections[0].subsections[0].content,/Perubahan baru/);
 await recovered.evaluate(()=>[...document.querySelectorAll('details summary')].find(s=>s.textContent.includes('Periksa konflik'))?.click());owners.delete(babId);await click(recovered,'Coba sinkronisasi');await recovered.waitForFunction(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Pulihkan draf sebagai perubahan baru'))?.disabled===false);
 await click(recovered,'Pulihkan draf sebagai perubahan baru');await recovered.waitForFunction(()=>document.body.textContent.includes('Draf tersimpan otomatis di server SIPANDA'));
 assert.match(fixture.sections[0].subsections[0].content,/Draf konflik milik perangkat/);assert.ok(fixture.sections[0].subsections.some(s=>s.id==='server-added-sub'&&/Isi tambahan server/.test(s.content)));assert.ok((await readDraft(recovered)).some(d=>d.archived));
 fs.mkdirSync('../artifacts/editor-upgrade',{recursive:true});await recovered.screenshot({path:'../artifacts/editor-upgrade/stage-7-offline.png'});
 console.log('PASS conflict review: server change preserved until explicit local recovery; backup retained; every API mutation intercepted');
}finally{await browser.close();}
