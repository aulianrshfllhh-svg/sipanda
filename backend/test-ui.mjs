import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='http://localhost:5173';
const response=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'admin123'})});const login=await response.json();assert.ok(login.token);
const docs=await (await fetch(base+'/api/documents?includeLampiran=true',{headers:{Authorization:`Bearer ${login.token}`}})).json();const doc=docs.find(d=>d.kodeDoc==='DEMO-RENJA-MUNDU-2027');
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:1000});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('BROWSER ERROR',e.message);});page.on('response',async r=>{if(r.status()>=400 && r.url().includes('/api/'))console.log('API ERROR',r.url(),r.status(),(await r.text()).slice(0,200));});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE ERROR',m.text());});
 await page.evaluateOnNewDocument(({token,user})=>{localStorage.setItem('sipanda_token',token);localStorage.setItem('sipanda_user',JSON.stringify(user));},login);
 await page.goto(base+'/template',{waitUntil:'networkidle2'});await page.waitForFunction(()=>document.body.innerText.includes('Renja 2027'));await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Renja 2027')).click());await page.waitForSelector('fieldset');console.log('PASS template manager UI');
 await page.goto(base+'/pengaturan',{waitUntil:'networkidle2'});await page.waitForSelector('form input');console.log('PASS settings UI');
 await page.goto(base+'/editor/'+doc.id,{waitUntil:'networkidle2'});await page.waitForFunction(()=>document.body.innerText.includes('KINERJA PENYELENGGARAAN BIDANG URUSAN'));assert.equal(await page.$$eval('.ProseMirror',els=>els.length),21);console.log('PASS six-chapter editor UI');
 fs.mkdirSync('../artifacts',{recursive:true});await page.screenshot({path:'../artifacts/editor-mundu.png'});
 await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Pratinjau Halaman').click());
 await page.waitForSelector('iframe',{timeout:10000}).catch(async e=>{console.log((await page.$eval('body',el=>el.innerText)).slice(-1200));throw e;});const frame=await (await page.$('iframe')).contentFrame();await frame.waitForFunction(()=>window.documentReady || window.documentError);const result=await frame.evaluate(()=>({error:window.documentError,pages:document.querySelectorAll('.paper').length,landscape:document.querySelectorAll('.landscape').length,overflow:[...document.querySelectorAll('.page-body')].filter(el=>el.scrollHeight>el.clientHeight+1).length}));assert.equal(result.error,undefined);assert.equal(result.overflow,0);assert.ok(result.landscape>0);console.log('PASS authenticated preview UI',result);
 const table=await frame.$('.landscape');await table.evaluate(el=>el.scrollIntoView());await page.screenshot({path:'../artifacts/preview-ui.png'});assert.deepEqual(errors,[]);console.log('PASS no browser runtime errors');
}finally{await browser.close();}
