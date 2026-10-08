import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function signInAndOpenEditor(page:any){
  await page.goto('/login');
  await page.getByLabel('Username / NIP').fill('test-opd');
  await page.getByLabel('Password', { exact:true }).fill('sipanda-test-password');
  await page.getByRole('button', { name:/Sign In \/ Masuk Sistem/ }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto('/editor/document-test');
  await expect(page.locator('.ProseMirror[data-sub-id="sub-1"]')).toBeVisible();
}

async function addSubsection(page:any,title:string,code:string){
  await page.getByRole('button',{name:'Tambah sub-bab'}).first().click();
  await page.getByLabel('Judul sub-bab baru untuk BAB I PENDAHULUAN').fill(title);
  await page.getByRole('button',{name:'Simpan sub-bab'}).click();
  await expect(page.getByRole('link').filter({hasText:title})).toBeVisible();
}

async function chooseOrientation(page:any,subTitle:string,orientation:'Portrait'|'Landscape'){
  await page.getByRole('link',{name:new RegExp(subTitle)}).click();
  const menu=page.locator('details').filter({has:page.locator('summary',{hasText:'Orientasi'})});
  if(!(await menu.evaluate((element:any)=>element.open)))await menu.locator('summary').click();
  await menu.locator('select').selectOption('current');
  await menu.getByRole('button',{name:orientation,exact:true}).click();
}

test('kanvas orientasi sub-bab bertumpuk, stabil saat undo/zoom, dan tabel panjang terpaginasikan',{timeout:120000},async({page})=>{
  await page.setViewportSize({width:1760,height:1050});
  await signInAndOpenEditor(page);
  await addSubsection(page,'Bagian Landscape','1.2');
  await addSubsection(page,'Bagian Lanjutan','1.3');

  await chooseOrientation(page,'Kinerja Penyelenggaraan Bidang Urusan','Landscape');
  await expect(page.locator('#bab-3 .editor-sub-card-landscape')).toHaveCount(1);
  await expect(page.locator('#bab-1 .editor-sub-card-landscape,#bab-2 .editor-sub-card-landscape')).toHaveCount(0);

  // The generated IDs are intentionally obtained from the live BAB I editor.
  const subIds=await page.locator('#bab-1 .editor-subsection').evaluateAll(nodes=>nodes.map(node=>node.id));
  expect(subIds).toHaveLength(3);
  const landscapeId=subIds[1];
  await page.locator(`.editor-subsection[id="${landscapeId}"] .ProseMirror`).fill('Isi tunggal sub-bab landscape untuk tes.');
  const saved=page.waitForResponse(response=>response.url().includes('/api/documents/document-test')&&response.request().method()==='PUT');
  await page.locator(`.editor-subsection[id="${landscapeId}"] .ProseMirror`).dispatchEvent('input');
  await saved;

  await chooseOrientation(page,'Bagian Landscape','Landscape');
  await expect(page.locator('#bab-1 .editor-sub-card')).toHaveCount(3);
  await expect(page.locator('#bab-1 .editor-sub-card-landscape')).toHaveCount(1);
  const geometry=await page.evaluate(()=>{
    const main=document.querySelector<HTMLElement>('#printable-canvas')!,cards=[...document.querySelectorAll<HTMLElement>('#bab-1 .editor-sub-card')];
    return {column:(()=>{const r=main.getBoundingClientRect();return {x:r.x,right:r.right,center:r.x+r.width/2};})(),cards:cards.map(card=>{const r=card.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,orientation:card.classList.contains('editor-sub-card-landscape')?'landscape':'portrait'};})};
  });
  expect(geometry.cards.map(card=>card.orientation)).toEqual(['portrait','landscape','portrait']);
  expect(geometry.cards[1].width).toBe(1247);
  expect(geometry.cards[1].height).toBe(812);
  expect(Math.abs((geometry.cards[1].x+geometry.cards[1].width/2)-geometry.column.center)).toBeLessThanOrEqual(2);
  for(const card of geometry.cards)expect(card.x).toBeGreaterThanOrEqual(geometry.column.x);
  for(let i=0;i<geometry.cards.length;i++)for(let j=i+1;j<geometry.cards.length;j++){
    const a=geometry.cards[i],b=geometry.cards[j];
    expect(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y,`cards ${i+1} and ${j+1} overlap`).toBe(false);
  }
  const output=path.resolve('tests/output');fs.mkdirSync(output,{recursive:true});
  await page.locator('#bab-1.editor-chapter-stack').screenshot({path:path.join(output,'editor-orientation-portrait-landscape-portrait.png')});
  await page.getByRole('button',{name:'Pratinjau',exact:true}).click();
  const initialPreview=page.frameLocator('iframe[title="Pratinjau halaman dokumen"]');
  await expect.poll(()=>initialPreview.locator('.paper[data-part="body"]').count(),{timeout:30000}).toBeGreaterThanOrEqual(3);
  const initialOrientations=await initialPreview.locator('.paper[data-part="body"]').evaluateAll(papers=>papers.map(paper=>paper.classList.contains('landscape')?'landscape':'portrait'));
  expect(initialOrientations.slice(0,3)).toEqual(['portrait','landscape','portrait']);
  await initialPreview.locator('#pages').screenshot({path:path.join(output,'preview-orientation-portrait-landscape-portrait.png')});
  await page.getByRole('button',{name:'Kembali ke editor'}).click();

  await page.locator(`.editor-subsection[id="${landscapeId}"] .ProseMirror`).evaluate((root:any)=>{
    root.innerHTML='<p>Awal paragraf landscape.</p><table><thead><tr><th>No</th><th>Uraian</th></tr></thead><tbody>'+Array.from({length:120},(_,i)=>`<tr><td>${i+1}</td><td>Isi tabel baris ${i+1} untuk uji pagination.</td></tr>`).join('')+'</tbody></table><p>Akhir paragraf landscape.</p>';
    root.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));
  });
  await expect(page.locator(`.ProseMirror[data-sub-id="${landscapeId}"]`)).toContainText('Isi tabel baris 120');
  await page.getByRole('button',{name:'Pratinjau',exact:true}).click();
  const preview=page.frameLocator('iframe[title="Pratinjau halaman dokumen"]');
  await expect.poll(()=>preview.locator('.paper.landscape').count(),{timeout:30000}).toBeGreaterThan(1);
  const tablePages=await preview.locator('.paper.landscape').evaluateAll(papers=>papers.filter(paper=>paper.textContent?.includes('Isi tabel baris')).map(paper=>({text:paper.textContent?.slice(0,120),last120:paper.textContent?.includes('Isi tabel baris 120')})));
  expect(tablePages.length).toBeGreaterThan(1);
  const previewOrientations=await preview.locator('.paper[data-part="body"]').evaluateAll(papers=>papers.map(paper=>paper.classList.contains('landscape')?'landscape':'portrait'));
  expect(previewOrientations[0]).toBe('portrait');expect(previewOrientations).toContain('landscape');
  await preview.locator('#pages').screenshot({path:path.join(output,'preview-orientation-long-table.png')});
  await page.getByRole('button',{name:'Kembali ke editor'}).click();
  await expect(page.locator(`.editor-sub-card[data-sub-ids="${landscapeId}"] .editor-page-guide`).first()).toBeVisible({timeout:30000});

  const edited=page.locator(`.editor-subsection[id="${landscapeId}"] .ProseMirror`);
  for(let i=0;i<5;i++){await chooseOrientation(page,'Bagian Landscape','Portrait');await chooseOrientation(page,'Bagian Landscape','Landscape');}
  expect(await edited.innerText()).toContain('Isi tabel baris 120');
  for(let i=0;i<5;i++)await page.keyboard.press('Control+z');
  expect(await edited.innerText()).toContain('Isi tabel baris 120');
  expect(await edited.locator('table tbody tr').count()).toBe(120);

  const zoom=page.getByLabel('Zoom kanvas');
  for(const value of ['50','75','100','150']){
    await zoom.selectOption(value);
    const boxes=await page.locator('.editor-sub-card').evaluateAll(cards=>cards.map(card=>{const r=card.getBoundingClientRect();return {top:r.top,bottom:r.bottom};}));
    for(let i=1;i<boxes.length;i++)expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i-1].bottom-1);
  }
  await page.screenshot({path:path.join(output,'editor-orientation-zoom-150.png'),fullPage:true});
});
