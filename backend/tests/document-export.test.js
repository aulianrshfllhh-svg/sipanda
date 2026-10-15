import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { registerExportRoutes } from '../document-export.js';

const uploadsDir = fileURLToPath(new URL('../uploads/', import.meta.url));

function routesFor(doc, canView = true) {
  const routes = new Map();
  const app = {
    get: (route, ...handlers) => routes.set(route, handlers.at(-1)),
    post: (route, ...handlers) => routes.set(`POST ${route}`, handlers.at(-1))
  };
  const prisma = { document: { findUnique: async () => doc } };
  registerExportRoutes(app, prisma, () => {}, async () => ({ canView }));
  return routes;
}

test('uploaded source endpoint returns the exact original bytes', async () => {
  const fileName = `${randomUUID()}.docx`;
  const filePath = path.join(uploadsDir, fileName);
  const originalBytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0xff, 0x0a, 0x0d]);
  const doc = {
    id: 'source-exact-test',
    cara: 'upload',
    filePath: `/uploads/${fileName}`,
    fileName: 'Renja Depok (Asli).docx'
  };

  await fs.writeFile(filePath, originalBytes);
  try {
    const handler = routesFor(doc).get('/api/documents/:id/source');
    const response = {
      statusCode: 200,
      headers: {},
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
      set(headers) { Object.assign(this.headers, headers); return this; },
      send(body) { this.body = body; return this; }
    };

    await handler({ params: { id: doc.id }, currentUser: {} }, response);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, originalBytes);
    assert.equal(response.headers['Content-Type'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    assert.match(response.headers['Content-Disposition'], /Renja%20Depok%20%28Asli%29\.docx/);
  } finally {
    await fs.unlink(filePath);
  }
});

test('uploaded source endpoint denies users without document access', async () => {
  const doc = { id: 'source-forbidden-test', cara: 'upload', filePath: '/uploads/not-read.docx', fileName: 'not-read.docx' };
  const handler = routesFor(doc, false).get('/api/documents/:id/source');
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };

  await handler({ params: { id: doc.id }, currentUser: {} }, response);

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.error, 'Dokumen tidak termasuk penugasan Anda');
});

function responseMock(){return {statusCode:200,headers:{},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;},set(headers){Object.assign(this.headers,headers);return this;},send(body){this.body=body;return this;}};}
test('review PDF preserves complete original bytes, including cover and TOC',async()=>{
 const name=`${randomUUID()}.pdf`,filePath=path.join(uploadsDir,name);
 const {PDFDocument,StandardFonts}=await import('pdf-lib');
 const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
 for(const text of ['COVER ASLI','DAFTAR ISI','BAB I','TABEL PANJANG ASLI'])pdf.addPage().drawText(text,{font,size:12,x:50,y:700});
 const bytes=Buffer.from(await pdf.save());await fs.writeFile(filePath,bytes);
 try{
  const doc={id:'review-source',cara:'upload',filePath:`/uploads/${name}`,sections:[{babTitle:'SHOULD NOT RENDER'}]};
  const response=responseMock();await routesFor(doc).get('/api/documents/:id/source-preview')({params:{id:doc.id},currentUser:{}},response);
  assert.equal(response.statusCode,200);assert.deepEqual(response.body,bytes);
  assert.equal(response.headers['Content-Type'],'application/pdf');assert.equal(response.headers['Cache-Control'],'private, no-store');
 }finally{await fs.unlink(filePath);}
});
test('review refuses missing source and denies unassigned users without template fallback',async()=>{
 for(const [doc,canView,status] of [
  [{id:'missing',cara:'upload',sections:[{babTitle:'TEMPLATE'}]},true,404],
  [{id:'denied',cara:'upload',filePath:'/uploads/not-read.pdf'},false,403],
  [{id:'annex',cara:'upload',isLampiranOtomatis:true,filePath:'/uploads/not-read.pdf'},true,404]
 ]){
  const response=responseMock();await routesFor(doc,canView).get('/api/documents/:id/source-preview')({params:{id:doc.id},currentUser:{}},response);assert.equal(response.statusCode,status);
 }
});

test('archive preview and export do not expose documents outside Final status', async () => {
  const doc = { id: 'archive-non-final', status: 'Disetujui Bapperida' };
  const routes = routesFor(doc);
  const response = responseMock();
  await routes.get('/api/archives/:id/preview')({
    params: { id: doc.id },
    currentUser: { roleKodes: ['super_admin'] }
  }, response);
  assert.equal(response.statusCode, 404);
  assert.equal(response.body.error, 'Arsip Final tidak ditemukan');

  const exportResponse = responseMock();
  await routes.get('/api/archives/:id/export/:format')({
    params: { id: doc.id, format: 'pdf' },
    currentUser: { roleKodes: ['super_admin'] }
  }, exportResponse);
  assert.equal(exportResponse.statusCode, 404);
  assert.equal(exportResponse.body.error, 'Arsip Final tidak ditemukan');
});
