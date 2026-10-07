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
     sheet=await workbook.csv.read(Readable.from([text]),{map:value=>value,parserOptions:{delimiter:first.includes(';')?';':',',ignoreEmpty:true}});
    }else throw new Error('Gunakan .xlsx atau .csv');
    if(!sheet || sheet.rowCount>10001)throw new Error('Berkas kosong atau lebih dari 10.000 baris');
    const header=sheet.getRow(1).values.slice(1).map(v=>String(v||'').trim());
    const withLevel=type==='renja' && /^tingkat$/i.test(header[0]);
    const names=header.map(h=>h.toLowerCase().replace(/[^a-z0-9]/g,''));
    const aliases=[['kode','koderekening'],['programkegiatansubkegiatan','programkegiatan','namaprogramkegiatansubkegiatan','uraiansubkegiatan','uraian'],['indikator','indikatorkinerja'],['lokasi'],['target','targetcapaian','targetkinerja'],['pagu','paguindikatif','kebutuhandana','anggaran'],['catatan','catatanpenting'],['asalajuan','sumberusulan','sumberajuan'],['targetn1','targetmaju','targettahunberikutnya'],['pagun1','pagumaju','pagutahunberikutnya']];
    const mapped=type==='renja'&&!withLevel?aliases.map(a=>names.findIndex(n=>a.includes(n))):null;
    const sipd=mapped&&mapped.slice(0,6).every(i=>i>=0);
    if(!sipd&&header.length!==def.columns.length+(withLevel?1:0))throw new Error(`Berkas harus mengikuti ${def.columns.length} kolom format CSV atau header SIPD Kode, Uraian, Indikator, Lokasi, Target, Pagu.`);
    const warnings=[];
    if(sipd)warnings.push('Kolom SIPD dipetakan berdasarkan header. Periksa tingkat hierarki serta kolom perkiraan maju.');
    if(Object.keys(sheet._merges||{}).length)warnings.push('Sel gabungan diratakan mengikuti kolom tabel baku. Periksa nilai hasil impor.');
    const rows=[];
    sheet.eachRow((row,index)=>{
     if(index===1)return;
     const values=Array.from({length:header.length},(_,i)=>{
      const cell=row.getCell(i+1);const v=cell.value;
      if(v && typeof v==='object' && 'formula' in v && v.result===undefined){warnings.push(`Baris ${index}, kolom ${i+1}: rumus belum memiliki hasil; sel kosong.`);return '';}
      return v && typeof v==='object' && 'result' in v ? v.result : cell.text;
     });
     const cells=sipd?mapped.map((i,j)=>i<0?(j===5||j===9?'0':''):values[i]):values;
     const code=String(cells[0]||'').trim();const explicit=withLevel?String(cells.shift()).toLowerCase().replace(/\s+/g,''):null;
     const level=explicit||(!sipd?'subkegiatan':/^\d+$/.test(code)?'urusan':/^\d+(?:\.\d+){1,2}$/.test(code)?'program':/^\d+(?:\.\d+){3,4}$/.test(code)?'kegiatan':'subkegiatan');
     rows.push({level,cells});
    });
    res.json({...normalizeTable({id:'import',type,rows}),warnings});
   }catch(e){res.status(400).json({error:e.message});}
  });
 });
}
