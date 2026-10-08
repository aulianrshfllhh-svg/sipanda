import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base = 'http://localhost:5173';
const loginResponse = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) });
const login = await loginResponse.json();
assert.ok(login.token, 'Local test account must be available');
const headers = { Authorization: `Bearer ${login.token}` };
const documents = await (await fetch(`${base}/api/documents?includeLampiran=true`, { headers })).json();
const source = documents.find(item => item.kodeDoc === 'DEMO-RENJA-MUNDU-2027');
assert.ok(source, 'Use the existing Mundu Renja document');
const document = await (await fetch(`${base}/api/documents/${source.id}`, { headers })).json();
// All writes in this browser are intercepted; the real Renja remains unchanged.
document.permissions = { ...document.permissions, canEdit: true, editableBabIds: document.sections.map(bab => bab.id) };
let writes = [];
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluateOnNewDocument(({ token, user }) => {
    localStorage.setItem('sipanda_token', token);
    localStorage.setItem('sipanda_user', JSON.stringify(user));
  }, login);
  await page.setRequestInterception(true);
  page.on('request', request => {
    if(request.url().endsWith(`/api/documents/${source.id}/editor-session`))return request.respond({contentType:'application/json',body:JSON.stringify({leases:document.sections.map(b=>({babId:b.id,owned:true})),revisions:document.editorRevisions||{},permissions:document.permissions,sections:document.sections,frontMatter:document.frontMatter})});
    if (request.url().endsWith(`/api/documents/${source.id}`) && request.method() === 'GET') {
      return request.respond({ contentType: 'application/json', body: JSON.stringify(document) });
    }
    if (['PUT', 'POST', 'PATCH', 'DELETE'].includes(request.method()) && request.url().includes('/api/')) {
      writes.push({ url: request.url(), body: request.postData() });
      return request.respond({ contentType: 'application/json', body: JSON.stringify(document) });
    }
    request.continue();
  });
  await page.goto(`${base}/editor/${source.id}`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.ProseMirror[contenteditable="true"][data-sub-id]');
  for (const width of [1366, 768]) {
    await page.setViewport({ width, height: 768 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No outer overflow at ${width}px`);
    const clipped = await page.$$eval('header button, .sticky.top-16 button', buttons => buttons.filter(button => button.scrollWidth > button.clientWidth + 1).map(button => button.textContent));
    assert.deepEqual(clipped, [], `Readable toolbar labels at ${width}px`);
  }
  await page.setViewport({ width: 1366, height: 768 });
  await page.evaluate(() => {
    const root = document.querySelector('.ProseMirror[contenteditable="true"][data-sub-id]');
    root.innerHTML = '<p>Uji <em>format</em> dokumen dan format baku.</p>';
    root.dispatchEvent(new Event('input', { bubbles: true }));
    root.focus();
    const range = document.createRange(); range.selectNodeContents(root); range.collapse(false);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
  });
  await page.keyboard.down('Control'); await page.keyboard.press('f'); await page.keyboard.up('Control');
  await page.type('input[aria-label="Cari teks"]', 'format');
  assert.match(await page.$eval('form[aria-label="Cari dan ganti"]', element => element.innerText), /2 hasil/);
  assert.equal(await page.evaluate(() => CSS.highlights.get('editor-search').size), 2);
  await page.type('input[aria-label="Teks pengganti"]', 'naskah');
  await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Ganti hasil ini').click());
  assert.match(await page.$eval('.ProseMirror[data-sub-id]', element => element.innerHTML), /<em>naskah<\/em>/);
  await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Tutup pencarian').click());
  await page.keyboard.down('Control'); await page.keyboard.press('s'); await page.keyboard.up('Control');
  await page.waitForFunction(() => document.body.innerText.includes('Draf tersimpan otomatis'));
  assert.ok(writes.some(write => write.body?.includes('naskah')));
  assert.ok(writes.every(write => !write.body?.includes('editor-search')));
  // Two pages of Office prose: source colour/bold/font disappear and a./b./c. remains a semantic list.
  await page.evaluate(()=>{
   const root=document.querySelector('.ProseMirror[contenteditable="true"][data-sub-id]');root.focus();const range=document.createRange();range.selectNodeContents(root);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
   const prose=Array.from({length:8},(_,i)=>`<p style="font-family:Arial;font-size:16pt;color:red"><b>Paragraf Word ${i}</b> ${'Isi naskah perencanaan daerah. '.repeat(35)}</p>`).join('');
   const data=new DataTransfer();data.setData('text/html',prose+'<ol type="a"><li>Dasar hukum pertama</li><li>Dasar hukum kedua</li><li>Dasar hukum ketiga</li></ol>');data.setData('text/plain','Narasi Word');root.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));
  });
  await page.waitForFunction(()=>document.querySelector('.ProseMirror[data-sub-id] ol[type="a"]'));
  const wordHtml=await page.$eval('.ProseMirror[data-sub-id]',n=>n.innerHTML);assert.match(wordHtml,/Paragraf Word 7/);assert.doesNotMatch(wordHtml,/Arial|color:red|font-size:16|<b>/);assert.equal(await page.$$eval('.ProseMirror[data-sub-id] ol[type="a"] > li',n=>n.length),3);
  await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Pemisah halaman').click());
  // Toolbar mousedown keeps selection; programmatic click also uses the selected editor.
  assert.equal(await page.$$eval('.ProseMirror .doc-page-break', nodes => nodes.length), 1);
  await page.evaluate(() => {
    const root = document.querySelector('.ProseMirror[contenteditable="true"][data-sub-id]');
    root.focus(); const range = document.createRange(); range.selectNodeContents(root); range.collapse(false);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    const data = new DataTransfer();
    data.setData('text/html', `<table style="color:red;font-family:Arial"><tbody>${Array.from({length:30},(_,i)=>`<tr><td ${i===0?'colspan="2"':''}>${i===0?'Judul gabungan':'2579714380'}</td><td>${i===0?'Pagu':'1.250,50'}</td></tr>`).join('')}</tbody></table><script>window.pasteAttack=true</script>`);
    data.setData('text/plain', 'Judul gabungan\tPagu\n2579714380\t1.250,50');
    root.dispatchEvent(new ClipboardEvent('paste', { bubbles:true, cancelable:true, clipboardData:data }));
  });
  await page.waitForFunction(() => document.body.innerText.includes('Format sumber dibersihkan.'));
  assert.equal(await page.$$eval('.ProseMirror[data-sub-id] table tr', rows => rows.length), 30);
  assert.equal(await page.evaluate(() => window.pasteAttack), undefined);
  assert.equal(await page.$$eval('.ProseMirror[data-sub-id] table [style]', elements => elements.length), 0);
  await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim()==='Rapikan Tabel').click());
  await page.waitForFunction(() => document.querySelector('.ProseMirror[data-sub-id] table thead'));
  assert.match(await page.$eval('.ProseMirror[data-sub-id] table', table => table.textContent), /2\.579\.714\.380/);
  await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control');
  await page.waitForFunction(() => !document.querySelector('.ProseMirror[data-sub-id] table thead'));
  assert.match(await page.$eval('.ProseMirror[data-sub-id] table', table => table.textContent), /2579714380/);
  await page.evaluate(() => {
    const cell=document.querySelector('.ProseMirror[data-sub-id] table td');
    const range=document.createRange();range.selectNodeContents(cell);range.collapse(true);
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    cell.closest('.ProseMirror').focus();
  });
  await page.waitForSelector('.editor-table-toolbar');
  await page.evaluate(()=>[...document.querySelectorAll('.editor-table-toolbar button')].find(button=>button.textContent==='Tampilkan tabel ini Landscape').click());
  await page.waitForSelector('.ProseMirror .doc-section-landscape table');
  assert.equal(await page.$$eval('.ProseMirror .doc-section-portrait',elements=>elements.length),1);
  await page.keyboard.down('Control');await page.keyboard.press('s');await page.keyboard.up('Control');
  await page.waitForFunction(()=>document.body.innerText.includes('Draf tersimpan otomatis'));
  assert.ok(writes.some(write=>write.body?.includes('doc-section-landscape')));
  await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Pratinjau Halaman').click());
  await page.waitForSelector('iframe[title="Pratinjau halaman dokumen"]');
  const frame = await (await page.$('iframe')).contentFrame();
  await frame.waitForFunction(() => window.documentReady || window.documentError);
  assert.equal(await frame.evaluate(() => window.documentError), undefined);
  await page.waitForFunction(() => /Halaman 1 dari [1-9]/.test(document.body.innerText));
  await page.select('.fixed.inset-0.z-50 select', '2');
  await frame.waitForFunction(() => /[\d.]+px [\d.]+px/.test(getComputedStyle(document.querySelector('#pages')).gridTemplateColumns));
  fs.mkdirSync('../artifacts/editor-upgrade', { recursive: true });
  await page.screenshot({ path: '../artifacts/editor-upgrade/stage-1-preview.png' });
  assert.deepEqual(errors, []);
  console.log('PASS stages 1–4: laptop/tablet, search/replace/autosave, page break, Excel clipboard sanitization, tidy table with native undo, isolated landscape table, real Mundu preview, two-page view, no browser errors');
} finally { await browser.close(); }
