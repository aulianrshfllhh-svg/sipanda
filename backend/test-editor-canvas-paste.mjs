import puppeteer from 'puppeteer-core';
import {renderDocument} from './document-render.js';
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
first.content='<p>'+Array.from({length:700},(_,i)=>`narasi${i}`).join(' ')+'</p><div class="doc-section doc-section-landscape"><p class="doc-caption">Tabel 1.1 Uraian pelayanan</p><table data-object-id="table-canvas"><thead><tr><th>Nomor</th><th>Uraian</th><th>Pagu</th></tr></thead><tbody>'+Array.from({length:60},(_,i)=>`<tr><td>${i}</td><td>Program kecamatan ${i}</td><td>2.579.714.380</td></tr>`).join('')+'</tbody></table></div><div class="doc-section doc-section-portrait"><p>Narasi sesudah tabel.</p></div>';
first.tables=[{id:'renja-fixture',type:'renja',rows:[{level:'subkegiatan',cells:['1','Program pelayanan','Indikator','Mundu','100','1000','','OPD','100','1000']}]}];
const user={...login.user,role:'opd',isSuperAdmin:false,roleKodes:[],opdId:fixture.opdId};
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let submits=0,checks=0;const errors=[];
try{
 const page=await browser.newPage();await page.setViewport({width:1366,height:768});page.on('pageerror',e=>errors.push(e.message));
 await page.evaluateOnNewDocument(({token,user})=>{localStorage.setItem('sipanda_token',token);localStorage.setItem('sipanda_user',JSON.stringify(user));},{token:login.token,user});
 await page.setRequestInterception(true);page.on('request',request=>{
  if(request.url().includes(`/api/documents/${source.id}/preview`))return request.respond({contentType:'text/html',body:renderDocument(fixture,{opd:{nama:fixture.opdName},global:{}},{editing:true})});
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
 await click('Kanvas cetak / sunting');await page.waitForSelector('[aria-label="Toolbar kanvas cetak"]');
 const iframe=await page.$('iframe[title="Pratinjau halaman dokumen"]');const frame=await iframe.contentFrame();
 await frame.waitForSelector('[data-editor-block][contenteditable="true"]');
 const selector='[data-editor-block][contenteditable="true"]';
 const original=await frame.$eval(selector,n=>n.textContent);await frame.$eval(selector,n=>{n.focus();const range=document.createRange();range.selectNodeContents(n);range.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(range);});
 await frame.type(selector,' Tambahan langsung di kanvas cetak.');await click('Tata ulang halaman');
 await frame.waitForFunction(()=>window.documentReady===true);await page.waitForFunction(()=>document.querySelector('[aria-label="Toolbar kanvas cetak"]')?.textContent.includes('Tersimpan'),{timeout:15000});

 assert.match(fixture.sections[0].subsections[0].content,/Tambahan langsung di kanvas cetak/);assert.doesNotMatch(fixture.sections[0].subsections[0].content,/data-editor-|spellcheck/);
 assert.equal(await frame.$$eval('.page-body',nodes=>nodes.filter(n=>n.scrollHeight>n.clientHeight+1).length),0);
 assert.equal(await frame.$eval('.cover',n=>n.isContentEditable),false);assert.equal(await frame.$eval('h2[data-anchor]',n=>n.isContentEditable),false);
 assert.ok(await page.$('[aria-label="Thumbnail halaman"] iframe'));await page.$eval('[aria-label="Toolbar kanvas cetak"]',n=>[...n.querySelectorAll('button')].find(b=>b.textContent==='Urungkan').click());await frame.waitForFunction(()=>!document.querySelector('[data-editor-block][contenteditable="true"]').textContent.includes('Tambahan langsung'));
 await page.$eval('[aria-label="Toolbar kanvas cetak"]',n=>[...n.querySelectorAll('button')].find(b=>b.textContent==='Ulangi').click());await frame.waitForFunction(()=>document.querySelector('[data-editor-block][contenteditable="true"]').textContent.includes('Tambahan langsung'));
 await frame.evaluate(()=>{const row=[...document.querySelectorAll('[data-editor-block] tbody tr')].find(r=>r.firstElementChild.textContent==='57');const cell=row.children[1];cell.focus();const range=document.createRange();range.selectNodeContents(cell);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);document.execCommand('insertText',false,' telah direvisi');cell.dispatchEvent(new InputEvent('input',{bubbles:true}));});
 await page.waitForFunction(()=>[...document.querySelectorAll('.ProseMirror[data-sub-id]')].some(n=>n.innerHTML.includes('Program kecamatan 57 telah direvisi')));
 await click('Tata ulang halaman');await frame.waitForFunction(()=>window.documentReady);
 const saved=fixture.sections[0].subsections[0].content;await page.waitForFunction(()=>document.querySelector('[aria-label="Toolbar kanvas cetak"]')?.textContent.includes('Tersimpan'));
 assert.match(fixture.sections[0].subsections[0].content,/Program kecamatan 57 telah direvisi/);const tableState=await page.$eval(`.ProseMirror[data-sub-id="${first.id}"] table`,n=>({rows:n.querySelectorAll('tbody tr').length,headers:n.querySelectorAll('thead').length}));assert.deepEqual(tableState,{rows:60,headers:1});assert.match(fixture.sections[0].subsections[0].content,/doc-section-landscape/);assert.match(fixture.sections[0].subsections[0].content,/narasi699/);
 await frame.evaluate(()=>{const root=document.querySelector('[data-editor-block][contenteditable="true"]');root.focus();const range=document.createRange();range.selectNodeContents(root);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);document.execCommand('insertParagraph');document.execCommand('insertText',false,'Paragraf baru dari kanvas.');root.dispatchEvent(new InputEvent('input',{bubbles:true}));});
 await click('Tata ulang halaman');await frame.waitForFunction(()=>window.documentReady);
 await page.waitForFunction(()=>document.querySelector('[aria-label="Toolbar kanvas cetak"]')?.textContent.includes('Tersimpan'));
 assert.match(fixture.sections[0].subsections[0].content,/Paragraf baru dari kanvas/);assert.match(fixture.sections[0].subsections[0].content,/Program kecamatan 57 telah direvisi/);assert.match(fixture.sections[0].subsections[0].content,/Narasi sesudah tabel/);assert.equal(await page.$$eval(`.ProseMirror[data-sub-id="${first.id}"] table tbody tr`,n=>n.length),60);
 const pasteState=await frame.evaluate(()=>{
  const root=document.querySelector('[data-editor-block][contenteditable="true"]');root.focus();const range=document.createRange();range.selectNodeContents(root);range.collapse(true);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
  const data=new DataTransfer();data.setData('text/html',Array.from({length:1200},(_,i)=>`<span style="font-family:Arial;color:red"><b>PASTE-AUDIT-${i} </b></span>`).join('')+'<script>window.canvasPasteUnsafe=true</script>');data.setData('text/plain','PASTE-AUDIT');root.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));
  const guarded=new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText',data:'BLOCKED'});root.dispatchEvent(guarded);
  const busy=!!document.querySelector('#editor-paste-progress'),readonly=!root.isContentEditable,blocked=guarded.defaultPrevented;
  [...window.parent.document.querySelectorAll('[aria-label="Toolbar kanvas cetak"] button')].find(b=>b.textContent==='Tata ulang halaman').click();
  [...window.parent.document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Kembali ke editor').click();const retained=!!window.parent.document.querySelector('iframe[title="Pratinjau halaman dokumen"]');const unload=new Event('beforeunload',{cancelable:true});window.parent.dispatchEvent(unload);return {busy,readonly,blocked,retained,warn:unload.defaultPrevented};
 });assert.deepEqual(pasteState,{busy:true,readonly:true,blocked:true,retained:true,warn:true});
 await frame.waitForFunction(()=>!document.querySelector('#editor-paste-progress')&&window.documentReady&&document.querySelector('#pages').textContent.includes('PASTE-AUDIT-1199'),{timeout:30000});
 assert.equal(await frame.evaluate(()=>window.canvasPasteUnsafe),undefined);assert.equal(await frame.$$eval('#pages [data-editor-block] [style]',nodes=>nodes.some(n=>/Arial|color:\s*red/.test(n.getAttribute('style')))),false);
 await page.waitForFunction(()=>document.querySelector('[aria-label="Toolbar kanvas cetak"]')?.textContent.includes('Tersimpan'));
 assert.match(fixture.sections[0].subsections[0].content,/PASTE-AUDIT-1199/);assert.match(fixture.sections[0].subsections[0].content,/Program kecamatan 57 telah direvisi/);
 await page.$eval('[aria-label="Toolbar kanvas cetak"]',n=>[...n.querySelectorAll('button')].find(b=>b.textContent==='Urungkan').click());await frame.waitForFunction(()=>window.documentReady&&!document.querySelector('#pages').textContent.includes('PASTE-AUDIT-1199'));
 const beforeBranch=await frame.evaluate(()=>window.editorSource.textContent);
 await frame.evaluate(()=>{const root=document.querySelector('[data-editor-block][contenteditable="true"]');root.focus();const range=document.createRange();range.selectNodeContents(root);range.collapse(true);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);document.execCommand('insertText',false,'BRANCH-AUDIT ');});
 await page.$eval('[aria-label="Toolbar kanvas cetak"]',n=>[...n.querySelectorAll('button')].find(b=>b.textContent==='Urungkan').click());await frame.waitForFunction(()=>window.documentReady&&!document.querySelector('#pages').textContent.includes('BRANCH-AUDIT'));
 assert.equal(await frame.evaluate(()=>window.editorSource.textContent),beforeBranch);
 await click('Kembali ke editor');await page.waitForFunction(()=>!document.querySelector('iframe[title="Pratinjau halaman dokumen"]'));
 assert.match(await page.$eval(`.ProseMirror[data-sub-id="${first.id}"]`,n=>n.textContent),/Tambahan langsung/);
 const boundedUndo=await page.evaluate(async()=>{
  const {pagedCanvas}=await import('/src/components/editor/paged-canvas.ts');const host=document.createElement('iframe');document.body.append(host);const doc=host.contentDocument,win=host.contentWindow;
  doc.body.innerHTML='<div id="error"></div><main id="pages"><p data-editor-block="1" data-editor-bab="b" data-editor-sub="s" data-editor-index="0">Version 0</p></main>';
  win.editorSource=doc.createElement('div');win.editorSource.innerHTML='<!--'+ 'X'.repeat(2*1024*1024)+'-->'+doc.querySelector('#pages').innerHTML;
  win.repaginateDocument=async()=>{doc.querySelector('#pages').innerHTML=win.editorSource.innerHTML;};const bridge=pagedCanvas(doc,()=>true,()=>{});
  try{for(let i=1;i<=3;i++){await new Promise(resolve=>setTimeout(resolve,520));const root=doc.querySelector('[data-editor-block]');root.textContent=`Version ${i}`;root.dispatchEvent(new win.InputEvent('input',{bubbles:true}));}await bridge.command('undo');const first=doc.querySelector('[data-editor-block]').textContent;await bridge.command('undo');return {first,second:doc.querySelector('[data-editor-block]').textContent};}finally{bridge.dispose();host.remove();}
 });assert.deepEqual(boundedUndo,{first:'Version 2',second:'Version 2'});
 assert.deepEqual(errors,[]);fs.mkdirSync('../artifacts/editor-upgrade',{recursive:true});await page.screenshot({path:'../artifacts/editor-upgrade/canvas-paste-audit.png'});console.log('PASS canvas paste/reflow, input guard, sanitization and undo branch audit; canonical editable F4 canvas: direct edit, pagination, protected cover/headings, synchronized autosave, real thumbnails, undo/redo and source reconstruction; writes intercepted');
}finally{await browser.close();}
