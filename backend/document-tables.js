import ExcelJS from 'exceljs';
import multer from 'multer';
import {Readable} from 'node:stream';
import {normalizeTable,tableDefinitions} from '../shared/document-tables.js';
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024}}).single('file');
export function registerTableRoutes(app,auth){
 app.post('/api/document-tables/import',auth,(req,res)=>{
  upload(req,res,async err=>{
   if(err)return res.status(400).json({error:'Berkas tidak valid atau lebih dari 10 MB'});
   try{
    const type=req.body.type,def=tableDefinitions[type];
    if(!def || !req.file)throw new Error('Pilih jenis tabel dan berkas');
    const workbook=new ExcelJS.Workbook(); let sheet;
    if(/\.xlsx$/i.test(req.file.originalname)){
     await workbook.xlsx.load(req.file.buffer);sheet=workbook.worksheets[0];
    }else if(/\.csv$/i.test(req.file.originalname)){
     const text=req.file.buffer.toString('utf8').replace(/^\uFEFF/,'');
     const first=text.split(/\r?\n/)[0];
     sheet=await workbook.csv.read(Readable.from([text]),{parserOptions:{delimiter:first.includes(';')?';':',',ignoreEmpty:true}});
    }else throw new Error('Gunakan .xlsx atau .csv');
    if(!sheet || sheet.rowCount>10001)throw new Error('Berkas kosong atau lebih dari 10.000 baris');
    const header=sheet.getRow(1).values.slice(1).map(v=>String(v||'').trim());
    const withLevel=type==='renja' && /^tingkat$/i.test(header[0]);
    if(header.length!==def.columns.length+(withLevel?1:0))throw new Error(`Berkas harus mengikuti ${def.columns.length} kolom format CSV${type==='renja'?' dan kolom Tingkat (opsional)':''}`);
    const rows=[];
    sheet.eachRow((row,index)=>{
     if(index===1)return;
     const values=Array.from({length:header.length},(_,i)=>{
      const cell=row.getCell(i+1);const v=cell.value;
      if(v && typeof v==='object' && 'formula' in v && v.result===undefined)throw new Error(`Baris ${index}: simpan hasil rumus Excel terlebih dahulu`);
      return v && typeof v==='object' && 'result' in v ? v.result : cell.text;
     });
     rows.push({level:withLevel?String(values.shift()).toLowerCase().replace(/\s+/g,''):'subkegiatan',cells:values});
    });
    res.json(normalizeTable({id:'import',type,rows}));
   }catch(e){res.status(400).json({error:e.message});}
  });
 });
}
