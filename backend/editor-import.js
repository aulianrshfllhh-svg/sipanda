import mammoth from 'mammoth';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {Readable} from 'node:stream';
import {parseHTML} from 'linkedom';
import multer from 'multer';
import {sanitizePaste} from '../shared/editor-paste.js';
import {attachSourceColumnWidths} from './document-import.js';

export async function convertEditorFile(bytes,name,{allowBold=false,sheetName}={}){
 const warnings=[];
 if(!bytes?.length||bytes.length>10*1024*1024)throw new Error('Berkas kosong atau lebih dari 10 MB.');
 if(/\.docx$/i.test(name)){
  const zip=await JSZip.loadAsync(bytes);const files=Object.values(zip.files);
  if(files.length>5000||files.reduce((n,f)=>n+(f._data?.uncompressedSize||0),0)>64*1024*1024)throw new Error('Isi Word terlalu besar setelah dibuka.');
  const result=await mammoth.convertToHtml({buffer:bytes},{convertImage:mammoth.images.imgElement(async image=>{
   try{if(!/^image\/(png|jpeg|webp)$/.test(image.contentType))throw new Error('format gambar tidak didukung');const data=await image.read('base64');if(data.length>14*1024*1024)throw new Error('gambar terlalu besar');return {src:`data:${image.contentType};base64,${data}`};}
   catch(error){warnings.push(`Gambar tertanam tidak terbaca: ${error.message}.`);return {alt:'Gambar tidak berhasil dikonversi'};}
  })});
  warnings.push(...result.messages.map(m=>m.message
   .replace(/^An unrecognised element was ignored:/,'Elemen sumber tidak didukung dan dilewati:')
   .replace(/^Unrecognised paragraph style:/,'Gaya paragraf sumber tidak didukung:')
   .replace(/^Unrecognised run style:/,'Gaya teks sumber tidak didukung:')));
  if(files.some(f=>/word\/(footnotes|endnotes|comments|header|footer)/i.test(f.name)))warnings.push('Catatan kaki, komentar, header dan footer sumber tidak menjadi bagian isi BAB. Periksa naskah sumber.');
  const root=parseHTML(`<html><body>${await attachSourceColumnWidths(bytes,result.value,{headers:true})}</body></html>`).document.body;
  return {kind:'word',html:sanitizePaste(root,{allowBold}),warnings:[...new Set(warnings)]};
 }
 const workbook=new ExcelJS.Workbook();
 if(/\.xlsx$/i.test(name)){const zip=await JSZip.loadAsync(bytes);if(Object.keys(zip.files).some(name=>/^xl\/(media|charts|drawings)\//i.test(name)))warnings.push('Gambar, grafik dan objek gambar Excel tidak menjadi isi tabel; periksa lembar sumber.');if(Object.values(zip.files).reduce((n,f)=>n+(f._data?.uncompressedSize||0),0)>64*1024*1024)throw new Error('Isi Excel terlalu besar setelah dibuka.');await workbook.xlsx.load(bytes);}
 else if(/\.csv$/i.test(name)){const text=bytes.toString('utf8').replace(/^\uFEFF/,'');const first=text.split(/\r?\n/)[0];await workbook.csv.read(Readable.from([text]),{map:value=>value,parserOptions:{delimiter:first.includes(';')?';':first.includes('\t')?'\t':',',ignoreEmpty:false}});}
 else throw new Error('Gunakan DOCX, XLSX atau CSV.');
 const sheet=sheetName?workbook.getWorksheet(sheetName):workbook.worksheets[0];
 if(!sheet||!sheet.rowCount||sheet.rowCount>10001||sheet.columnCount>100)throw new Error('Pilih lembar berisi maksimal 10.000 baris dan 100 kolom.');
 if(workbook.worksheets.length>1)warnings.push(`Berkas memuat ${workbook.worksheets.length} lembar. Yang dipilih: ${sheet.name}.`);
 const rows=[];const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 for(let r=1;r<=sheet.rowCount;r++){
  const cells=[],texts=[];
  for(let c=1;c<=sheet.columnCount;c++){
   const cell=sheet.getCell(r,c);let value=cell.value;
   if(value&&typeof value==='object'&&'formula' in value){if(value.result===undefined){warnings.push(`Baris ${r}, kolom ${c}: rumus belum memiliki hasil; sel dibiarkan kosong.`);value='';}else value=value.result;}
   let text=typeof value==='number'?value.toLocaleString('id-ID',{useGrouping:/[,#]0|#,##/.test(cell.numFmt||''),maximumFractionDigits:15}):value instanceof Date?value.toISOString().slice(0,10):value&&typeof value==='object'&&'richText' in value?value.richText.map(v=>v.text).join(''):value&&typeof value==='object'&&'text' in value?value.text:String(value??'');
   texts.push(text);
   if(cell.isMerged&&cell.master.address!==cell.address)continue;
   let colspan=1,rowspan=1;
   if(cell.isMerged){while(c+colspan<=sheet.columnCount&&sheet.getCell(r,c+colspan).master.address===cell.address)colspan++;while(r+rowspan<=sheet.rowCount&&sheet.getCell(r+rowspan,c).master.address===cell.address)rowspan++;}
   cells.push(`<${r===1?'th':'td'}${colspan>1?` colspan="${colspan}"`:''}${rowspan>1?` rowspan="${rowspan}"`:''}>${esc(text)}</${r===1?'th':'td'}>`);
  }
  rows.push({html:`<tr>${cells.join('')}</tr>`,cells:texts});
 }
 return {kind:'table',html:`<table><thead>${rows[0].html}</thead><tbody>${rows.slice(1).map(r=>r.html).join('')}</tbody></table>`,rows:rows.map(r=>r.cells),sheets:workbook.worksheets.map(s=>s.name),sheet:sheet.name,warnings:[...new Set(warnings)]};
}
export function registerEditorImport(app,auth){
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024}}).single('file');
 app.post('/api/editor/import',auth,(req,res)=>upload(req,res,async error=>{
  if(error)return res.status(400).json({error:'Berkas tidak terbaca atau melebihi 10 MB.'});
  try{res.json(await convertEditorFile(req.file?.buffer,req.file?.originalname||'',{allowBold:req.body.allowBold==='true',sheetName:req.body.sheet}));}
  catch(error){res.status(400).json({error:error.message});}
 }));
}
