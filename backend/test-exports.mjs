import assert from 'node:assert/strict';
import fs from 'node:fs';
import ExcelJS from 'exceljs';
const base='http://localhost:3001/api';
const response=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'admin123'})});const {token}=await response.json();const headers={Authorization:`Bearer ${token}`};
const docs=await (await fetch(base+'/documents?includeLampiran=true',{headers})).json();const doc=docs.find(d=>d.kodeDoc==='DEMO-RENJA-MUNDU-2027'),child=docs.find(d=>d.parentId===doc.id);
for(const [item,label] of [[doc,'mundu-2027'],[child,'lampiran-mundu-2027']]){
 for(const format of ['pdf','docx','docx-editable']){
 const r=await fetch(`${base}/export/${format}/${item.id}`,{headers});assert.equal(r.status,200,await r.clone().text().then(x=>x.slice(0,200)));const bytes=Buffer.from(await r.arrayBuffer());assert.ok(bytes.length>1000);assert.equal(bytes.subarray(0,format==='pdf'?4:2).toString(),format==='pdf'?'%PDF':'PK');fs.mkdirSync('../artifacts',{recursive:true});fs.writeFileSync(`../artifacts/${label}${format==='docx-editable'?'-editable':''}.${format==='pdf'?'pdf':'docx'}`,bytes);console.log('PASS export',label,format,bytes.length);
 }
}
const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet('SIPD');sheet.addRow(['Tingkat','Kode','Uraian','Indikator','Lokasi','Target','Dana','Catatan','Asal','Target Maju','Dana Maju']);sheet.addRow(['subkegiatan','1','Contoh Excel','Dokumen','Mundu','1',120000000,'Data dummy','SIPD','1',130000000]);const buffer=await wb.xlsx.writeBuffer();const f=new FormData();f.append('type','renja');f.append('file',new Blob([buffer]),'import-test.xlsx');const imported=await fetch(base+'/document-tables/import',{method:'POST',headers,body:f});assert.equal(imported.status,200);assert.equal((await imported.json()).rows[0].cells[5],'120000000');console.log('PASS Excel import numeric cells');
