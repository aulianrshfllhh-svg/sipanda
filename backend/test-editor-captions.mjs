import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='http://localhost:5173';
const login=await (await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'admin123'})})).json();
assert.ok(login.token);
const headers={Authorization:`Bearer ${login.token}`};
const docs=await (await fetch(`${base}/api/documents?includeLampiran=true`,{headers})).json();
const source=docs.find(doc=>doc.kodeDoc==='DEMO-RENJA-MUNDU-2027');assert.ok(source);
const fixture=await (await fetch(`${base}/api/documents/${source.id}`,{headers})).json();
fixture.permissions={...fixture.permissions,canEdit:true,editableBabIds:fixture.sections.map(bab=>bab.id)};
const first=fixture.sections[0].subsections[0];
first.content=['Satu','Dua','Tiga'].map((title,i)=>`<p class="doc-caption" data-caption-id="table-${i+1}" data-caption-for="table-${i+1}">Tabel 9.9 ${title}</p><table data-object-id="table-${i+1}"><thead><tr><th>Nama</th></tr></thead><tbody><tr><td>${title}</td></tr></tbody></table>`).join('')+'<p>Rujukan: <span class="doc-reference" data-reference-id="table-3">lihat Tabel 9.9</span></p><p class="insertion-point">Teks sebelum gambar. </p>';
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const writes=[],errors=[];
try{
 const page=await browser.newPage();await page.setViewport({width:1366,height:768});page.on('pageerror',error=>errors.push(error.message));
 await page.evaluateOnNewDocument(login=>{localStorage.setItem('sipanda_token',login.token);localStorage.setItem('sipanda_user',JSON.stringify(login.user));},login);
 await page.setRequestInterception(true);page.on('request',request=>{
    if(request.url().endsWith(`/api/documents/${source.id}/editor-session`))return request.respond({contentType:'application/json',body:JSON.stringify({leases:fixture.sections.map(b=>({babId:b.id,owned:true})),revisions:fixture.editorRevisions||{},permissions:fixture.permissions,sections:fixture.sections,frontMatter:fixture.frontMatter})});
  if(request.url().endsWith(`/api/documents/${source.id}`)&&request.method()==='GET')return request.respond({contentType:'application/json',body:JSON.stringify(fixture)});
  if(['PUT','POST','DELETE','PATCH'].includes(request.method())&&request.url().includes('/api/')){writes.push(request.postData());return request.respond({contentType:'application/json',body:JSON.stringify(fixture)});}
  request.continue();
 });
 await page.goto(`${base}/editor/${source.id}`,{waitUntil:'networkidle2'});
 const root=`.ProseMirror[data-sub-id="${first.id}"]`;
 await page.waitForFunction(()=>document.querySelector('[data-reference-id="table-3"]')?.textContent==='lihat Tabel 1.3');
 async function button(label,scope=''){await page.evaluate(({label,scope})=>[...document.querySelectorAll(`${scope} button`)].find(button=>button.textContent.trim()===label)?.click(),{label,scope});}
 async function selectNode(selector,contents=true){await page.evaluate(({selector,contents})=>{const node=document.querySelector(selector);const range=document.createRange();if(contents)range.selectNodeContents(node);else range.selectNode(node);range.collapse(false);node.closest('.ProseMirror').focus();const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);},{selector,contents});}
 async function setInput(selector,value){await page.$eval(selector,(input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));},String(value));}
 // Delete the middle object using the actual table toolbar.
 await selectNode(`${root} [data-object-id="table-2"] td`);await page.waitForSelector('.editor-table-toolbar');await button('Hapus tabel','.editor-table-toolbar');
 await page.waitForFunction(()=>document.querySelector('[data-reference-id="table-3"]')?.textContent==='lihat Tabel 1.2');
 assert.equal(await page.$$eval(`${root} table`,tables=>tables.length),2);
 assert.equal(await page.$$eval(`${root} .doc-caption:not(.doc-caption-orphan)`,captions=>captions.length),2);
 await page.keyboard.down('Control');await page.keyboard.press('z');await page.keyboard.up('Control');
 await page.waitForFunction(()=>document.querySelector('[data-reference-id="table-3"]')?.textContent==='lihat Tabel 1.3');
 assert.equal(await page.$$eval(`${root} table`,tables=>tables.length),3);
 // Caption edits retain ID and update the front list.
 await selectNode(`${root} [data-object-id="table-3"] td`);await page.waitForSelector('.editor-table-toolbar');await button('Tambah / ubah caption','.editor-table-toolbar');
 await page.waitForSelector('input[aria-label="Judul caption"]');await setInput('input[aria-label="Judul caption"]','Tiga diperbarui');await button('Simpan caption');
 await page.waitForFunction(()=>document.querySelector('[data-caption-id="table-3"]')?.textContent==='Tabel 1.3 Tiga diperbarui');
 assert.match(await page.$eval('#printable-canvas',canvas=>canvas.innerText),/Tabel 1\.3 Tiga diperbarui/);
 // New table is only inserted once the required caption is supplied.
 await selectNode(`${root} .insertion-point`);await button('Sisipkan Tabel');await page.waitForSelector('input[aria-label="Judul caption"]');
 assert.equal(await page.$$eval(`${root} table`,tables=>tables.length),3);
 await setInput('input[aria-label="Judul caption"]','Tabel baru');await button('Simpan caption');await page.waitForFunction(()=>document.querySelectorAll('.ProseMirror[data-sub-id] table').length>=4);
 assert.equal(await page.$$eval(`${root} table[data-object-id]`,tables=>tables.length),4);
 // Insert a reference through the picker and delete its target; never silently rebind.
 await selectNode(`${root} .insertion-point`);await button('Rujukan silang');await page.waitForSelector('select[aria-label="Target rujukan silang"]');await page.select('select[aria-label="Target rujukan silang"]','table-2');await button('Sisipkan rujukan');
 await page.waitForSelector(`${root} [data-reference-id="table-2"]`);
 await selectNode(`${root} [data-object-id="table-2"] td`);await page.waitForSelector('.editor-table-toolbar');await button('Hapus tabel','.editor-table-toolbar');
 await page.waitForSelector(`${root} [data-reference-id="table-2"].doc-reference-broken`);
 // Clipboard image gets a mandatory-caption dialog. Paste a 3000x1500 image.
 await selectNode(`${root} .insertion-point`);
 await page.evaluate(async selector=>{
  const canvas=document.createElement('canvas');canvas.width=3000;canvas.height=1500;const context=canvas.getContext('2d');context.fillStyle='#204080';context.fillRect(0,0,3000,1500);context.fillStyle='#f0a020';context.fillRect(0,0,1500,1500);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  const data=new DataTransfer();data.items.add(new File([blob],'clipboard.png',{type:'image/png'}));
  document.querySelector(selector).dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
 },root);
 await page.waitForSelector('input[aria-label="Caption gambar"]');await page.waitForSelector('canvas[aria-label="Pratinjau hasil pangkas"]');
 assert.equal(await page.$eval('[role="dialog"] button[type="submit"], [role="dialog"] button:not([type])',button=>button.disabled).catch(()=>true),true);
 assert.equal(await page.$$eval(`${root} img`,images=>images.length),0);
 await setInput('input[aria-label="Caption gambar"]','Bagan kecamatan');await setInput('input[aria-label="Lebar gambar"]',50);await setInput('input[aria-label="Pangkas kiri"]',25);await page.select('select[aria-label="Perataan gambar"]','right');await button('Sisipkan gambar');
 await page.waitForSelector(`${root} .doc-figure img`);await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
 const image=await page.$eval(`${root} .doc-figure img`,async image=>{await image.decode();return {width:image.naturalWidth,height:image.naturalHeight,drawWidth:image.width,drawHeight:image.height,caption:image.nextElementSibling.textContent,id:image.getAttribute('data-object-id'),figureWidth:image.parentElement.style.width,align:image.parentElement.className,bytes:image.src.length*3/4,inside:image.getBoundingClientRect().right<=image.closest('.ProseMirror').getBoundingClientRect().right+1};});
 assert.equal(image.width,2250);assert.equal(image.height,1500);assert.equal(image.figureWidth,'50%');assert.match(image.align,/doc-image-right/);assert.equal(image.caption,'Gambar 1.1 Bagan kecamatan');assert.ok(image.bytes<=1536*1024);assert.ok(image.inside);assert.ok(Math.abs(image.drawWidth/image.drawHeight-1.5)<0.02);
 // Edit with inline placement; stable image/caption identity and aspect remain intact.
 await page.$eval(`${root} .doc-figure img`,image=>image.click());await button('Atur gambar / pangkas / caption');await page.waitForSelector('input[aria-label="Caption gambar"]');await page.select('select[aria-label="Penempatan gambar"]','inline');await setInput('input[aria-label="Lebar gambar"]',40);await button('Simpan gambar');await page.waitForSelector(`${root} span.doc-figure.doc-image-inline`);
 assert.equal(await page.$eval(`${root} .doc-figure img`,image=>image.getAttribute('data-object-id')),image.id);
 // Oversized and malformed images/crop errors are surfaced instead of silent insertion.
 const processing=await page.evaluate(async()=>{const {imageBlobData,processImage}=await import('/src/components/editor/image-processing.ts');const results=[];for(const fn of [()=>imageBlobData(new Blob([new Uint8Array(10*1024*1024+1)],{type:'image/png'})),()=>processImage('data:image/png;base64,AAAA',{left:0,top:0,right:0,bottom:0})]){try{await fn();results.push(null);}catch(e){results.push(e.message);}}return results;});
 assert.match(processing[0],/10 MB/);assert.match(processing[1],/rusak|terbaca/);
 await page.keyboard.down('Control');await page.keyboard.press('s');await page.keyboard.up('Control');await page.waitForFunction(()=>document.body.innerText.includes('Draf tersimpan otomatis'));
 assert.ok(writes.some(body=>body?.includes('data-reference-id')&&body.includes('data-caption-id')&&body.includes('doc-figure')));
 fs.mkdirSync('../artifacts/editor-upgrade',{recursive:true});await page.screenshot({path:'../artifacts/editor-upgrade/stage-5-captions.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS stage 5: table caption required, edit caption, delete/undo/renumber, stable cross-reference/broken target, clipboard image caption, crop/compression/proportions/alignment/inline, validation, autosave (all writes intercepted)');
}finally{await browser.close();}
