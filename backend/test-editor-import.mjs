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
let submits=0,checks=0;const errors=[];
try{
 const page=await browser.newPage();await page.setViewport({width:1366,height:768});page.on('pageerror',e=>errors.push(e.message));
 await page.evaluateOnNewDocument(({token,user})=>{localStorage.setItem('sipanda_token',token);localStorage.setItem('sipanda_user',JSON.stringify(user));},{token:login.token,user});
 await page.setRequestInterception(true);page.on('request',request=>{
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
 fs.mkdirSync('../artifacts/editor-upgrade',{recursive:true});
 const directory=fs.realpathSync('../artifacts/editor-upgrade');const wordPath=directory+'/stage-8-word.docx';
 const word=new Document({sections:[{children:[new Paragraph({heading:'Heading1',text:'BAB I PENDAHULUAN'}),new Paragraph({heading:'Heading2',text:first.title}),new Paragraph({children:[new TextRun({text:'Narasi impor Word huruf miring.',italics:true,color:'FF0000',font:'Arial'})]}),new Paragraph({bullet:{level:0},text:'Daftar dari Word'})]}]});fs.writeFileSync(wordPath,await Packer.toBuffer(word));
 async function upload(path,label){await click(label);await page.waitForSelector('input[aria-label="Berkas impor"]');await(await page.$('input[aria-label="Berkas impor"]')).uploadFile(path);await page.waitForFunction(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Terapkan impor')?.disabled===false);}
 await upload(wordPath,'Impor Word ke BAB ini');await click('Terapkan impor');await page.waitForFunction(()=>!document.querySelector('[aria-label="Impor dokumen"]'));
 const root=`.ProseMirror[data-sub-id="${first.id}"]`;assert.match(await page.$eval(root,r=>r.innerHTML),/<em>Narasi impor Word/);assert.match(await page.$eval(root,r=>r.innerHTML),/<ul>/);assert.doesNotMatch(await page.$eval(root,r=>r.innerHTML),/Arial|FF0000/);
 const csvPath=directory+'/stage-8-table.csv';fs.writeFileSync(csvPath,'Kode;Uraian;Dana\n001;Pelayanan masyarakat;2.579.714.380');await upload(csvPath,'Impor tabel Excel/CSV');await page.$eval('[aria-label="Impor dokumen"] input[maxlength="300"]',input=>{input.value='Rancangan Renja hasil impor';input.dispatchEvent(new Event('input',{bubbles:true}));});await click('Terapkan impor');await page.waitForFunction(()=>!document.querySelector('[aria-label="Impor dokumen"]'));
 assert.match(await page.$eval(root,r=>r.innerHTML),/001/);assert.match(await page.$eval(root,r=>r.innerHTML),/2\.579\.714\.380/);assert.match(await page.$eval(root,r=>r.innerText),/Rancangan Renja hasil impor/);assert.deepEqual(errors,[]);await page.screenshot({path:'../artifacts/editor-upgrade/stage-8-import.png'});console.log('PASS stage 8 browser: Word per BAB, italics/lists/standard formatting, CSV code/numeric strings, required caption; actual converter, document writes intercepted');
}finally{await browser.close();}
