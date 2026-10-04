import { randomUUID } from 'node:crypto';

export const canonicalType = jenis => jenis === 'RKPD' ? 'RKPD Murni' : jenis;
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roman = ['I','II','III','IV','V','VI','VII'];
const intro = ['Latar Belakang','Landasan Hukum','Maksud dan Tujuan','Sistematika Penulisan'];
const end = ['Catatan Penting','Kaidah-Kaidah Pelaksanaan','Rencana Tindak Lanjut'];
function outline(chapters) {
  return chapters.map(([title, titles], i) => ({id:`bab-${i+1}`,order:i+1,title:`BAB ${roman[i]} ${title}`,locked:true,
    subsections: titles.map((item,j) => ({id:`sub-${i+1}-${j+1}`,code:`${i+1}.${j+1}`,title:item,locked:true,content:`<p>Petunjuk: uraikan ${item.toLowerCase()} berdasarkan data yang dapat dipertanggungjawabkan.</p>`}))}));
}
export function seedSections(jenis, tahun) {
  if(jenis === 'RPJMD') return [];
  const changed = jenis.includes('Perubahan');
  if(jenis.includes('RKPD')) return outline([
    ['PENDAHULUAN',['Latar Belakang','Dasar Hukum','Maksud dan Tujuan','Sistematika Penulisan']],
    [changed ? 'EVALUASI HASIL TRIWULAN II TAHUN BERKENAAN' : 'GAMBARAN UMUM KONDISI DAERAH',changed ? ['Evaluasi Hasil Triwulan II Tahun Berkenaan'] : ['Gambaran Umum Kondisi Daerah']],
    ['KERANGKA EKONOMI DAN KEUANGAN DAERAH',['Kerangka Ekonomi dan Keuangan Daerah']],
    ['SASARAN DAN PRIORITAS PEMBANGUNAN DAERAH',['Sasaran dan Prioritas Pembangunan Daerah']],
    ['RENCANA KERJA DAN PENDANAAN',['Rencana Kerja dan Pendanaan']],
    ['KINERJA PENYELENGGARAAN PEMERINTAH DAERAH',['Kinerja Penyelenggaraan Pemerintah Daerah']],
    ['PENUTUP',end],
  ]);
  const legacy = String(tahun) === '2026';
  let chapters = [
    ['PENDAHULUAN',intro],
    [changed ? 'EVALUASI RENJA SAMPAI DENGAN TRIWULAN II TAHUN BERKENAAN' : legacy ? 'EVALUASI PELAKSANAAN RENJA TAHUN {evaluasi}' : 'HASIL EVALUASI RENJA {opd} TAHUN {evaluasi}',[
      changed ? 'Evaluasi Pelaksanaan Renja {opd} sampai dengan Triwulan II Tahun {tahun} dan Capaian Renstra' : 'Evaluasi Pelaksanaan Renja {opd} Tahun {evaluasi} dan Capaian Renstra',
      'Analisis Kinerja Pelayanan {opd}', 'Isu-Isu Penting Penyelenggaraan Tugas dan Fungsi {opd}',
      'Review terhadap Rancangan Awal RKPD','Penelaahan Usulan Program dan Kegiatan Masyarakat']],
    [legacy ? 'TUJUAN, SASARAN, PROGRAM, KEGIATAN DAN SUB KEGIATAN' : 'TUJUAN DAN SASARAN PERANGKAT DAERAH',[
      'Telaahan terhadap Kebijakan Nasional','Tujuan dan Sasaran Renja {opd}','Program dan Kegiatan']],
    ['RENCANA KERJA DAN PENDANAAN PERANGKAT DAERAH',legacy ? ['Rencana Kerja dan Pendanaan'] : ['Pohon Kinerja dan Cross Cutting','Cascading Kinerja Renja PD dan Crosscutting sesuai Pagu','Program dan Kegiatan Prioritas berdasarkan Cascading Kinerja']],
    ...(!legacy ? [['KINERJA PENYELENGGARAAN BIDANG URUSAN',['Indikator Kinerja Utama','Indikator Kinerja Kunci']]] : []),
    ['PENUTUP',end],
  ];
  let result=outline(chapters);
  result[1].subsections[0].content=changed ? '<p>Petunjuk: evaluasi capaian IKU dan IKK tahun {tahun} sampai dengan triwulan II.</p>' : '<p>Petunjuk: evaluasi capaian IKU dan IKK tahun {evaluasi}, capaian Renstra, serta capaian SPM bila terkait.</p>';
  result[1].subsections[2].content='<p>Petunjuk: rumuskan permasalahan pelayanan dan isu strategis perangkat daerah.</p>';
  result[1].subsections[4].content='<p>Petunjuk: telaah usulan masyarakat, pokok-pokok pikiran DPRD, dan inovasi bidang urusan.</p>';
  result[2].subsections[1].content='<p>Petunjuk: tujuan dan sasaran Renja wajib sama dengan Renstra.</p>';
  for (const [chapter,sub,type] of [[1,2,'permasalahan'],[1,4,'usulan'],[2,1,'sasaran'],[3,legacy?0:2,'renja']]) {
    result[chapter].subsections[sub].tables=[{id:`standard-${type}`,type,rows:[]}];
  }
  if(changed) {
    const rename = text => text.replace(/\brenja\b/gi, word => word === 'RENJA' ? 'PERUBAHAN RENJA' : 'Perubahan Renja').replace(/\brkpd\b/gi, 'Perubahan RKPD');
    result = result.map(bab => ({ ...bab, title: rename(bab.title), subsections: bab.subsections.map(sub => ({ ...sub, title: rename(sub.title), content: rename(sub.content) })) }));
    if(jenis === 'Renja Perubahan' && String(tahun) === '2027') {
      result[1].title = 'BAB II EVALUASI RENJA SAMPAI DENGAN TRIWULAN II TAHUN BERKENAAN';
    }
  }
  return result;
}
export const SEED_TEMPLATES = [
  ['Renja Murni','2027','Renja 2027'],['Renja Perubahan','2027','Perubahan Renja 2027'],
  ['RKPD Murni','2027','RKPD 2027'],['RKPD Perubahan','2027','Perubahan RKPD 2027'],
  ['Renja Murni','2026','Renja 2026 (lama)'],['Renja Perubahan','2026','Perubahan Renja 2026'],['RPJMD','2027','RPJMD 2027'],
].map(([jenis,tahun,nama])=>({id:`tpl-${jenis.toLowerCase().replaceAll(' ','-')}-${tahun}-v1`,nama,jenis,tahun,versi:1,isActive:true,isDefault:false,
  deskripsi:'Struktur sesuai spesifikasi revisi SIPANDA. Rujukan yang diberikan: Permendagri 14/2026 dan 86/2017.',sections:seedSections(jenis,tahun)}));
export async function ensureTemplates(prisma) {
  for(const template of SEED_TEMPLATES) await prisma.template.upsert({where:{id:template.id},create:template,update:{}});

  const changeTemplate = SEED_TEMPLATES.find(template => template.jenis === 'Renja Perubahan' && template.tahun === '2027');
  const previous = changeTemplate && await prisma.template.findUnique({where:{id:changeTemplate.id}});
  const correctedVersionId = 'tpl-renja-perubahan-2027-v2';
  const correctedVersion = await prisma.template.findUnique({where:{id:correctedVersionId}});
  if(previous?.isActive && previous?.sections?.[1]?.title === 'BAB II EVALUASI PERUBAHAN RENJA SAMPAI DENGAN TRIWULAN II TAHUN BERKENAAN' && !correctedVersion) {
    const latest = await prisma.template.findFirst({where:{jenis:'Renja Perubahan',tahun:'2027'},orderBy:{versi:'desc'}});
    await prisma.$transaction(async tx => {
      await tx.template.updateMany({where:{jenis:'Renja Perubahan',tahun:'2027',isActive:true},data:{isActive:false}});
      await tx.template.create({data:{
        ...changeTemplate,
        id:correctedVersionId,
        versi:(latest?.versi || 1)+1,
        isActive:true,
      }});
    });
  }
}
export function instantiate(template,opd,tahun) {
  const replace = text => String(text).replaceAll('{opd}',opd).replaceAll('{tahun}',String(tahun)).replaceAll('{evaluasi}',String(Number(tahun)-2)).replaceAll('{maju}',String(Number(tahun)+1));
  return structuredClone(template.sections).map((bab,i)=>({...bab,order:i+1,locked:true,title:replace(bab.title),subsections:bab.subsections.map(sub=>({...sub,locked:true,title:replace(sub.title),content:replace(sub.content)}))}));
}
export function validateStructure(sections) {
  if(!Array.isArray(sections) || sections.length>30) throw new Error('Struktur bab tidak valid');
  const ids=new Set();
  for(const bab of sections) {
    if(!bab.id || ids.has(bab.id) || !bab.title?.trim() || bab.title.length>200 || !Array.isArray(bab.subsections)) throw new Error('ID atau judul bab tidak valid (maksimum 200 karakter)');
    ids.add(bab.id);
    for(const sub of bab.subsections) {
      if(!sub.id || ids.has(sub.id) || !sub.title?.trim() || !sub.code || typeof sub.content!=='string') throw new Error('ID, kode, judul, atau isi sub-bab tidak valid');
      ids.add(sub.id);
    }
  }
}
export function registerTemplateRoutes(app,prisma,auth,superOnly) {
  app.get('/api/templates',auth,async(req,res)=>{
    try {res.json(await prisma.template.findMany({where:{...(req.query.jenis?{jenis:canonicalType(String(req.query.jenis))}:{}),...(req.query.tahun?{tahun:String(req.query.tahun)}:{})},orderBy:[{tahun:'desc'},{jenis:'asc'},{versi:'desc'}]}));}
    catch(e){console.error(e);res.status(500).json({error:'Gagal membaca template'});}
  });
  app.post('/api/templates/:id/duplicate',auth,async(req,res)=>{
    if(superOnly(req,res)) return;
    try {
      const source=await prisma.template.findUnique({where:{id:req.params.id}});
      if(!source) return res.status(404).json({error:'Template tidak ditemukan'});
      const tahun=String(req.body.tahun || source.tahun);
      if(!/^\d{4}$/.test(tahun)) throw new Error('Tahun harus empat digit');
      const latest=await prisma.template.findFirst({where:{jenis:source.jenis,tahun},orderBy:{versi:'desc'}});
      res.status(201).json(await prisma.template.create({data:{id:randomUUID(),nama:String(req.body.nama || `${source.nama} (salinan)`).slice(0,150),jenis:source.jenis,tahun,versi:(latest?.versi||0)+1,sections:source.sections,isActive:false,isDefault:false,deskripsi:source.deskripsi}}));
    } catch(e){res.status(400).json({error:e.message});}
  });
  app.put('/api/templates/:id',auth,async(req,res)=>{
    if(superOnly(req,res)) return;
    try {
      const old=await prisma.template.findUnique({where:{id:req.params.id}});
      if(!old) return res.status(404).json({error:'Template tidak ditemukan'});
      if(old.isActive || await prisma.document.count({where:{templateId:old.id}})) return res.status(409).json({error:'Template aktif atau sudah dipakai tidak dapat diubah. Duplikasikan menjadi versi baru.'});
      validateStructure(req.body.sections);
      res.json(await prisma.template.update({where:{id:old.id},data:{nama:String(req.body.nama||old.nama).slice(0,150),sections:req.body.sections}}));
    } catch(e){res.status(400).json({error:e.message});}
  });
  app.post('/api/templates/:id/activate',auth,async(req,res)=>{
    if(superOnly(req,res)) return;
    try {
      const template=await prisma.template.findUnique({where:{id:req.params.id}});
      if(!template) return res.status(404).json({error:'Template tidak ditemukan'});
      validateStructure(template.sections);
      await prisma.$transaction(async tx=>{
        await tx.template.updateMany({where:{jenis:template.jenis,tahun:template.tahun},data:{isActive:false}});
        await tx.template.update({where:{id:template.id},data:{isActive:true}});
      });
      res.json({success:true});
    } catch(e){res.status(400).json({error:e.message});}
  });
}
