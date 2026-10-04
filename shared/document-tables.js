export const tableDefinitions = {
 renja: {title:'Rancangan Renja',landscape:true,columns:['Kode','Urusan/Bidang Urusan Pemerintah Daerah dan Program/Kegiatan/Sub Kegiatan','Indikator Kinerja Program (Outcome)/Kegiatan (Output)','Lokasi','Target Capaian Kinerja','Kebutuhan Dana/Pagu Indikatif (Rencana Tahun {tahun})','Catatan Penting','Asal Ajuan','Target Capaian Kinerja (Perkiraan Maju)','Kebutuhan Dana/Pagu Indikatif (Perkiraan Maju Tahun {maju})']},
 permasalahan:{title:'Identifikasi Permasalahan berdasarkan Tugas dan Fungsi',columns:['Aspek Kajian','Capaian Kondisi Saat Ini','Standar yang Digunakan','Faktor yang Mempengaruhi (Internal)','Faktor yang Mempengaruhi (Eksternal)','Permasalahan Pelayanan']},
 usulan:{title:'Usulan Program dan Kegiatan dari Para Pemangku Kepentingan',columns:['No','Program/Kegiatan/Sub Kegiatan','Lokasi','Indikator Kinerja','Besaran/Volume','Catatan']},
 sasaran:{title:'Tujuan dan Sasaran serta Indikator',columns:['Tujuan','Sasaran','Indikator','Kondisi Awal','Target {tahun}','Target {maju}','Target {tahun2}','Target {tahun3}','Target {tahun4}']},
};
export function tableNeedsLandscape(table, portraitWidthMm = 150) {
 if(tableDefinitions[table?.type]?.landscape)return true;
 const rows=Array.isArray(table?.rows)
  ? table.rows.map(row=>({cells:row.cells||[]}))
  : [...(table?.querySelectorAll?.('tr')||[])].map(row=>({cells:[...row.children]}));
 const columnWidths=[];
 for(const row of rows){
  let column=0;
  for(const cell of row.cells){
   const span=Number(cell?.getAttribute?.('colspan')||1);
   const text=String(cell?.textContent??cell??'').replace(/\s+/g,' ').trim();
   const longestWord=Math.max(0,...(text.match(/\S+/g)||[]).map(word=>word.length));
   const requiredWidth=Math.max(3,longestWord*1.8+4)/span;
   for(let index=0;index<span;index+=1){
    columnWidths[column+index]=Math.max(columnWidths[column+index]||0,requiredWidth);
   }
   column+=span;
  }
 }
 return columnWidths.length>6||columnWidths.reduce((total,width)=>total+width,0)>portraitWidthMm;
}
export function tableColumns(type,tahun){return (tableDefinitions[type]?.columns||[]).map(s=>s.replaceAll('{tahun}',tahun).replaceAll('{maju}',String(Number(tahun)+1)).replaceAll('{tahun2}',String(Number(tahun)+2)).replaceAll('{tahun3}',String(Number(tahun)+3)).replaceAll('{tahun4}',String(Number(tahun)+4)));}
export function money(value) {
 if(typeof value==='number'){if(!Number.isFinite(value)||value<0)throw new Error('Dana harus berupa angka nonnegatif');return value;}
 const s=String(value||'').replace(/Rp\.?\s*/gi,'').trim();
 if(!s)return 0;
 const n=Number(s.includes(',') ? s.replaceAll('.','').replace(',','.') : /^\d{1,3}(\.\d{3})+$/.test(s)?s.replaceAll('.',''):s);
 if(!Number.isFinite(n)||n<0)throw new Error(`Dana tidak valid: ${value}`);
 return n;
}
export function normalizeTable(table) {
 const def=tableDefinitions[table.type];
 if(!def || !Array.isArray(table.rows) || table.rows.length>10000) throw new Error('Tabel baku tidak valid');
 const rows=table.rows.map(row=>{
  if(!Array.isArray(row.cells)||row.cells.length!==def.columns.length)throw new Error(`Tabel ${def.title} harus mempunyai ${def.columns.length} kolom`);
  const normalized={level:table.type==='renja'?(row.level||'subkegiatan'):'baris',cells:row.cells.map(v=>String(v??'').slice(0,5000))};
  if(table.type==='renja') {
   if(!['urusan','program','kegiatan','subkegiatan'].includes(normalized.level))throw new Error('Tingkat baris tidak valid');
   normalized.cells[5]=String(money(row.cells[5])); normalized.cells[9]=String(money(row.cells[9]));
  }
  return normalized;
 });
 return {id:String(table.id||''),type:table.type,rows};
}
// Parent totals use immediate children; entered parent aggregates are never counted twice.
export function calculatedRows(table) {
 const rows=table.rows.map(row=>({...row,cells:row.cells.map(cell=>cell)}));
 if(table.type!=='renja') return {rows,total:0,totalMaju:0};
 const ranks={urusan:0,program:1,kegiatan:2,subkegiatan:3};
 const roots=[],stack=[];
 rows.forEach((row,i)=>{
  row.children=[];
  while(stack.length && ranks[rows[stack.at(-1)].level]>=ranks[row.level])stack.pop();
  if(stack.length)rows[stack.at(-1)].children.push(i);else roots.push(i);
  stack.push(i);
 });
 for(let i=rows.length-1;i>=0;i--) {
  const r=rows[i];
  r.aggregate=r.children.length>0;
  for(const col of [5,9])r.cells[col]=String(r.aggregate?r.children.reduce((sum,j)=>sum+money(rows[j].cells[col]),0):money(r.cells[col]));
 }
 return {rows,total:roots.reduce((sum,i)=>sum+money(rows[i].cells[5]),0),totalMaju:roots.reduce((sum,i)=>sum+money(rows[i].cells[9]),0)};
}
export function blankTable(type){return {id:globalThis.crypto.randomUUID(),type,rows:[]};}
