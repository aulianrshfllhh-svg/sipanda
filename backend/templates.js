import { randomUUID } from 'node:crypto';

export const canonicalType = jenis => jenis === 'RKPD' ? 'RKPD Murni' : jenis;
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const guidance = text => `<p>Petunjuk: ${text}</p>`;
const outline = chapters => chapters.map(([title, subsections], i) => ({
  id:`bab-${i+1}`, order:i+1, title:`BAB ${['I','II','III','IV','V','VI','VII','VIII','IX'][i]} ${title}`, locked:true,
  subsections:subsections.map(([title, prompt], j) => ({id:`sub-${i+1}-${j+1}`,code:`${i+1}.${j+1}`,title,locked:true,content:guidance(prompt || `Uraikan ${title.toLowerCase()} dengan data, indikator, dan sumber yang dapat dipertanggungjawabkan.`)}))
}));

const intro = [
  ['Latar Belakang','Jelaskan latar belakang penyusunan dokumen, keterkaitannya dengan dokumen perencanaan lain, serta proses dan kebutuhan yang mendasarinya.'],
  ['Landasan Hukum','Cantumkan peraturan perundang-undangan yang menjadi dasar kewenangan dan penyusunan dokumen ini beserta relevansinya.'],
  ['Maksud dan Tujuan','Jelaskan maksud penyusunan dokumen dan tujuan yang hendak dicapai.'],
  ['Sistematika Penulisan','Jelaskan susunan bab dan pokok bahasan setiap bab dalam dokumen.'],
];
const introWithRelations = [
  intro[0], intro[1],
  ['Hubungan Antar Dokumen','Jelaskan hubungan dokumen ini dengan RPJPD/RPJMD, RTRW, RKPD, Renstra/Renja perangkat daerah, serta dokumen perencanaan terkait lainnya.'],
  intro[2], intro[3],
];

function renjaSections(changed, year) {
  const legacy = year === '2026';
  const chapters = [
    ['PENDAHULUAN', intro],
    [changed
      ? legacy ? 'EVALUASI PERUBAHAN RENJA SAMPAI DENGAN TRIWULAN II TAHUN BERKENAAN' : 'EVALUASI RENJA SAMPAI DENGAN TRIWULAN II TAHUN BERKENAAN'
      : legacy ? 'EVALUASI PELAKSANAAN RENJA TAHUN {evaluasi}' : 'HASIL EVALUASI RENJA {opd} TAHUN {evaluasi}', [
      [changed ? `Evaluasi Pelaksanaan Renja {opd} sampai dengan Triwulan II Tahun {tahun} dan Capaian Renstra` : `Evaluasi Pelaksanaan Renja {opd} Tahun {evaluasi} dan Capaian Renstra`,'Sajikan realisasi program dan kegiatan tahun lalu (atau sampai dengan triwulan II untuk perubahan), bandingkan dengan target, jelaskan faktor penyebab, serta kaitkan dengan capaian Renstra.'],
      ['Analisis Kinerja Pelayanan Perangkat Daerah','Analisis capaian indikator pelayanan perangkat daerah sesuai tugas dan fungsi, termasuk standar pelayanan minimal apabila relevan.'],
      ['Isu-Isu Penting Penyelenggaraan Tugas dan Fungsi Perangkat Daerah','Uraikan tingkat kinerja pelayanan, permasalahan, dampak terhadap masyarakat, tantangan, peluang, dan isu strategis perangkat daerah.'],
      ['Review terhadap Rancangan Awal RKPD','Bandingkan rancangan awal RKPD dengan hasil analisis kebutuhan perangkat daerah dan jelaskan usulan penyempurnaannya.'],
      ['Penelaahan Usulan Program dan Kegiatan Masyarakat','Telaah usulan masyarakat hasil Musrenbang dan pokok-pokok pikiran DPRD serta jelaskan hasil penyaringan dan tindak lanjutnya.'],
    ]],
    ['TUJUAN DAN SASARAN PERANGKAT DAERAH', [
      ['Telaahan terhadap Kebijakan Nasional','Jelaskan kebijakan nasional yang terkait dengan tugas dan fungsi perangkat daerah serta implikasinya pada rencana kerja.'],
      ['Tujuan dan Sasaran Renja Perangkat Daerah','Rumuskan tujuan dan sasaran tahunan yang selaras dengan Renstra perangkat daerah serta indikator dan targetnya.'],
      ['Program dan Kegiatan','Uraikan program dan kegiatan yang mendukung tujuan dan sasaran, termasuk indikator keluaran dan hasil.'],
      ...(!changed ? [
        ['Kinerja Penyelenggaraan Bidang Urusan','Sajikan kinerja penyelenggaraan bidang urusan yang menjadi kewenangan perangkat daerah.'],
        ['Indikator Kinerja Utama','Sajikan indikator kinerja utama perangkat daerah beserta target dan capaian yang relevan.'],
        ['Indikator Kinerja Kunci','Sajikan indikator kinerja kunci perangkat daerah beserta target dan capaian yang relevan.'],
      ] : []),
    ]],
    ...(changed ? [['KINERJA PENYELENGGARAAN BIDANG URUSAN', [
      ['Indikator Kinerja Utama','Sajikan indikator kinerja utama perangkat daerah beserta target dan capaian yang relevan.'],
      ['Indikator Kinerja Kunci','Sajikan indikator kinerja kunci perangkat daerah beserta target dan capaian yang relevan.'],
    ]]] : []),
    ['RENCANA KERJA DAN PENDANAAN PERANGKAT DAERAH', [
      ['Rencana Kerja dan Pendanaan','Sajikan program, kegiatan dan subkegiatan, indikator, target, lokasi/kelompok sasaran, serta pagu indikatif dan sumber pendanaan.'],
    ]],
    ['PENUTUP', [
      ['Catatan Penting','Sampaikan catatan penting yang perlu diperhatikan dalam pelaksanaan Renja.'],
      ['Kaidah-Kaidah Pelaksanaan','Jelaskan kaidah penyelarasan, pengendalian, dan evaluasi pelaksanaan Renja.'],
      ['Rencana Tindak Lanjut','Uraikan tindak lanjut agar Renja menjadi pedoman penyusunan dan pelaksanaan anggaran perangkat daerah.'],
    ]],
  ];
  const result = outline(chapters);
  result[1].subsections[2].tables = [{id:'standard-permasalahan',type:'permasalahan',rows:[]}];
  result[1].subsections[4].tables = [{id:'standard-usulan',type:'usulan',rows:[]}];
  result[2].subsections[1].tables = [{id:'standard-sasaran',type:'sasaran',rows:[]}];
  result[changed ? 4 : 3].subsections[0].tables = [{id:'standard-renja',type:'renja',rows:[]}];
  return result;
}

function renstraSections() {
  const result = outline([
    ['PENDAHULUAN', intro],
    ['GAMBARAN PELAYANAN PERANGKAT DAERAH', [
      ['Tugas, Fungsi, dan Struktur Organisasi Perangkat Daerah','Jelaskan dasar pembentukan, susunan organisasi, tugas, dan fungsi perangkat daerah.'],
      ['Sumber Daya Perangkat Daerah','Uraikan sumber daya manusia, aset/sarana prasarana, dan sumber daya lain yang mendukung pelayanan.'],
      ['Kinerja Pelayanan Perangkat Daerah','Sajikan capaian kinerja pelayanan dan indikator sesuai tugas dan fungsi, termasuk capaian periode sebelumnya dan faktor penghambat.'],
      ['Tantangan dan Peluang Pengembangan Pelayanan Perangkat Daerah','Identifikasi tantangan dan peluang internal maupun eksternal dalam pengembangan pelayanan.'],
    ]],
    ['PERMASALAHAN DAN ISU-ISU STRATEGIS PERANGKAT DAERAH', [
      ['Identifikasi Permasalahan Berdasarkan Tugas dan Fungsi Pelayanan Perangkat Daerah','Rumuskan permasalahan pelayanan berdasarkan data kinerja dan faktor penyebabnya.'],
      ['Telaahan Visi, Misi, dan Program Kepala Daerah dan Wakil Kepala Daerah','Jelaskan keterkaitan tugas perangkat daerah dengan visi, misi, dan program kepala daerah serta faktor pendorong dan penghambat.'],
      ['Telaahan Renstra Kementerian/Lembaga dan Renstra Perangkat Daerah Terkait','Telaah sasaran dokumen kementerian/lembaga dan perangkat daerah terkait serta implikasinya terhadap pelayanan.'],
      ['Telaahan Rencana Tata Ruang Wilayah dan Kajian Lingkungan Hidup Strategis','Jelaskan implikasi RTRW dan KLHS terhadap pelayanan dan pencapaian tujuan perangkat daerah.'],
      ['Penentuan Isu-Isu Strategis','Tentukan isu strategis berdasarkan permasalahan dan hasil telaahan dengan mempertimbangkan dampak jangka menengah.'],
    ]],
    ['TUJUAN DAN SASARAN', [
      ['Tujuan dan Sasaran Jangka Menengah Perangkat Daerah','Rumuskan tujuan, sasaran, indikator, dan target jangka menengah yang selaras dengan RPJMD.'],
    ]],
    ['STRATEGI DAN ARAH KEBIJAKAN', [
      ['Strategi dan Arah Kebijakan Perangkat Daerah','Jabarkan strategi dan arah kebijakan untuk mencapai tujuan dan sasaran Renstra.'],
    ]],
    ['RENCANA PROGRAM DAN KEGIATAN SERTA PENDANAAN', [
      ['Rencana Program dan Kegiatan, Indikator Kinerja, Kelompok Sasaran, dan Pendanaan Indikatif','Sajikan rencana program/kegiatan, indikator dan target tahunan, kelompok sasaran, lokasi bila diperlukan, serta pendanaan indikatif selama periode Renstra.'],
    ]],
    ['KINERJA PENYELENGGARAAN BIDANG URUSAN', [
      ['Indikator Kinerja Perangkat Daerah yang Mengacu pada Tujuan dan Sasaran RPJMD','Sajikan indikator perangkat daerah yang mengacu pada tujuan dan sasaran RPJMD beserta kondisi awal dan target akhir periode.'],
    ]],
    ['PENUTUP', [
      ['Pedoman Transisi dan Kaidah Pelaksanaan','Uraikan pedoman transisi, kaidah pelaksanaan, serta pengendalian dan evaluasi Renstra.'],
    ]],
  ]);
  result[3].subsections[0].tables = [{id:'standard-sasaran',type:'sasaran',rows:[]}];
  return result;
}

function rkpdSections(changed) {
  return outline([
    ['PENDAHULUAN', introWithRelations],
    [changed ? 'EVALUASI HASIL TRIWULAN II TAHUN BERKENAAN' : 'GAMBARAN UMUM KONDISI DAERAH', changed ? [
      ['Evaluasi Hasil RKPD sampai dengan Triwulan II','Evaluasi capaian target dan pelaksanaan program sampai triwulan II, identifikasi kendala, serta jelaskan kebutuhan perubahan.'],
    ] : [
      ['Kondisi Geografi dan Demografi','Uraikan kondisi geografis, wilayah, kependudukan, dan implikasinya terhadap pembangunan daerah.'],
      ['Kesejahteraan Masyarakat','Analisis indikator kesejahteraan dan pemerataan ekonomi serta kondisi sosial masyarakat.'],
      ['Pelayanan Umum','Uraikan capaian dan kondisi pelayanan dasar maupun urusan pemerintahan lainnya.'],
      ['Daya Saing Daerah','Analisis kemampuan ekonomi, sumber daya manusia, infrastruktur, dan iklim investasi daerah.'],
    ]],
    ['KERANGKA EKONOMI DAERAH DAN KEUANGAN DAERAH', [
      ['Arah Kebijakan Ekonomi Daerah','Jelaskan kondisi dan prospek ekonomi daerah serta arah kebijakan ekonomi tahun rencana.'],
      ['Arah Kebijakan Keuangan Daerah','Uraikan proyeksi dan kebijakan pendapatan, belanja, pembiayaan, serta kapasitas fiskal daerah.'],
    ]],
    ['SASARAN DAN PRIORITAS PEMBANGUNAN DAERAH', [
      ['Tujuan dan Sasaran Pembangunan','Jelaskan tujuan dan sasaran pembangunan tahunan yang mengacu pada RPJMD.'],
      ['Prioritas dan Sasaran Pembangunan Tahun Rencana','Uraikan prioritas pembangunan daerah, sasaran, indikator, dan keterkaitannya dengan prioritas provinsi/nasional.'],
    ]],
    ['RENCANA KERJA DAN PENDANAAN DAERAH', [
      ['Rencana Program dan Kegiatan Prioritas Daerah','Sajikan program/kegiatan prioritas, indikator, target, perangkat daerah pelaksana, lokasi, dan pendanaan indikatif.'],
    ]],
    ['KINERJA PENYELENGGARAAN PEMERINTAHAN DAERAH', [
      ['Indikator Kinerja Penyelenggaraan Pemerintahan Daerah','Sajikan target indikator kinerja utama dan indikator kinerja penyelenggaraan pemerintahan daerah untuk tahun rencana.'],
    ]],
    ['PENUTUP', [
      ['Pedoman Pelaksanaan','Jelaskan kaidah pelaksanaan, pengendalian, evaluasi, dan tindak lanjut RKPD.'],
    ]],
  ]);
}

function rpjmdSections() {
  return outline([
    ['PENDAHULUAN', introWithRelations],
    ['GAMBARAN UMUM KONDISI DAERAH', [
      ['Aspek Geografi dan Demografi','Uraikan karakteristik geografis, wilayah, dan demografi daerah.'],
      ['Aspek Kesejahteraan Masyarakat','Analisis kondisi kesejahteraan dan pemerataan ekonomi serta kesejahteraan sosial.'],
      ['Aspek Pelayanan Umum','Analisis capaian pelayanan urusan pemerintahan wajib dan pilihan.'],
      ['Aspek Daya Saing Daerah','Uraikan daya saing ekonomi, sumber daya manusia, fasilitas/infrastruktur, dan iklim investasi.'],
    ]],
    ['GAMBARAN KEUANGAN DAERAH', [
      ['Kinerja Keuangan Masa Lalu','Analisis kinerja pendapatan, belanja, dan pembiayaan daerah selama periode sebelumnya.'],
      ['Kebijakan Pengelolaan Keuangan Masa Lalu','Jelaskan proporsi penggunaan anggaran dan analisis pembiayaan.'],
      ['Kerangka Pendanaan','Sajikan proyeksi pendapatan, belanja, pembiayaan, dan kapasitas riil keuangan untuk pendanaan pembangunan.'],
    ]],
    ['PERMASALAHAN DAN ISU-ISU STRATEGIS DAERAH', [
      ['Permasalahan Pembangunan','Identifikasi permasalahan berdasarkan gambaran umum dan capaian pembangunan daerah.'],
      ['Isu Strategis','Rumuskan isu strategis dengan memperhatikan kebijakan nasional/provinsi dan dinamika lingkungan.'],
    ]],
    ['VISI, MISI, TUJUAN, DAN SASARAN', [
      ['Visi dan Misi','Cantumkan visi dan misi kepala daerah terpilih serta penjelasan pokoknya.'],
      ['Tujuan dan Sasaran','Rumuskan tujuan, sasaran, indikator, dan target pembangunan jangka menengah.'],
    ]],
    ['STRATEGI, ARAH KEBIJAKAN, DAN PROGRAM PEMBANGUNAN DAERAH', [
      ['Strategi dan Arah Kebijakan','Jabarkan strategi dan arah kebijakan untuk mencapai tujuan dan sasaran RPJMD.'],
      ['Program Pembangunan Daerah','Sajikan program pembangunan daerah beserta indikator dan target kinerja.'],
    ]],
    ['KERANGKA PENDANAAN PEMBANGUNAN DAN PROGRAM PERANGKAT DAERAH', [
      ['Kerangka Pendanaan Pembangunan','Uraikan kerangka pendanaan dan program perangkat daerah untuk mencapai target pembangunan.'],
    ]],
    ['KINERJA PENYELENGGARAAN PEMERINTAHAN DAERAH', [
      ['Penetapan Indikator Kinerja Daerah','Sajikan indikator kinerja utama dan indikator kinerja penyelenggaraan pemerintahan daerah beserta target tahunan.'],
    ]],
    ['PENUTUP', [
      ['Pedoman Transisi dan Kaidah Pelaksanaan','Uraikan pedoman transisi, pelaksanaan, pengendalian, evaluasi, dan pelaporan RPJMD.'],
    ]],
  ]);
}

export function seedSections(jenis, tahun = '2027') {
  if (jenis === 'RPJMD') return [];
  if (jenis.startsWith('Renstra')) return renstraSections();
  if (jenis.startsWith('Renja')) return renjaSections(jenis.includes('Perubahan'), String(tahun));
  if (jenis.startsWith('RKPD')) return rkpdSections(jenis.includes('Perubahan'));
  return [];
}

const templateTypes = [
  ['Renja Murni','2027','Renja 2027'],
  ['Renja Perubahan','2027','Perubahan Renja 2027'],
  ['RKPD Murni','2027','RKPD 2027'],
  ['RKPD Perubahan','2027','Perubahan RKPD 2027'],
  ['Renja Murni','2026','Renja 2026 (lama)'],
  ['Renja Perubahan','2026','Perubahan Renja 2026'],
  ['RKPD Murni','2026','RKPD 2026'],
  ['RKPD Perubahan','2026','Perubahan RKPD 2026'],
  ['Renstra Murni',null,'Template Renstra Murni'],
  ['Renstra Perubahan',null,'Template Renstra Perubahan'],
  ['RPJMD','2027','RPJMD 2027'],
];
export const SEED_TEMPLATES = templateTypes.map(([jenis, tahun, nama]) => ({
  id:tahun ? `tpl-${jenis.toLowerCase().replaceAll(' ','-')}-${tahun}-v1` : `sipanda-${jenis.toLowerCase().replaceAll(' ','-')}-permendagri-86-v1`,
  nama, jenis, tahun, versi:1,
  isActive:true, isDefault:!tahun,
  deskripsi:'Struktur dan petunjuk penyusunan mengacu pada Permendagri Nomor 86 Tahun 2017. Sesuaikan substansi, data, periode, dan kebijakan daerah.',
  sections:seedSections(jenis, tahun || '2027'),
}));

export async function ensureTemplates(prisma) {
  for (const template of SEED_TEMPLATES) {
    await prisma.template.upsert({where:{id:template.id},create:template,update:{}});
  }

  const legacyId = 'tpl-renja-murni-2027-v1';
  const migratedId = 'tpl-renja-murni-2027-permendagri-86';
  const legacy = await prisma.template.findUnique({where:{id:legacyId}});
  if (legacy?.isActive) {
    const migrated = await prisma.template.findUnique({where:{id:migratedId}});
    await prisma.$transaction(async tx => {
      await tx.template.updateMany({where:{id:legacyId},data:{isActive:false}});
      if (!migrated) {
        const latest = await prisma.template.findFirst({
          where:{jenis:'Renja Murni',tahun:'2027'},
          orderBy:{versi:'desc'}
        });
        await tx.template.create({data:{
          id:migratedId,
          nama:'Template Renja Murni 2027 – Permendagri 86/2017',
          jenis:'Renja Murni',
          tahun:'2027',
          versi:(latest?.versi || 0) + 1,
          isActive:true,
          isDefault:false,
          deskripsi:'Struktur dan petunjuk penyusunan mengacu pada Permendagri Nomor 86 Tahun 2017.',
          sections:seedSections('Renja Murni')
        }});
      }
    });
  }
}

export function instantiate(template,opd,tahun,periodeAkhir=tahun) {
  const replace = text => String(text).replaceAll('{opd}',opd).replaceAll('{tahun}',String(tahun)).replaceAll('{periodeMulai}',String(tahun)).replaceAll('{periodeAkhir}',String(periodeAkhir)).replaceAll('{evaluasi}',String(Number(tahun)-2)).replaceAll('{maju}',String(Number(tahun)+1));
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
    try {
      const jenis=req.query.jenis?canonicalType(String(req.query.jenis)):null;
      const tahun=req.query.tahun?String(req.query.tahun):null;
      const where={...(jenis?{jenis}:{})};
      if(tahun) where.OR=[{tahun},{tahun:null}];
      res.json(await prisma.template.findMany({where,orderBy:[{tahun:'desc'},{jenis:'asc'},{versi:'desc'}]}));
    }
    catch(e){console.error(e);res.status(500).json({error:'Gagal membaca template'});}
  });
  app.post('/api/templates/:id/duplicate',auth,async(req,res)=>{
    if(superOnly(req,res)) return;
    try {
      const source=await prisma.template.findUnique({where:{id:req.params.id}});
      if(!source) return res.status(404).json({error:'Template tidak ditemukan'});
      const tahun=String(req.body.tahun || source.tahun || '');
      if(!/^\d{4}$/.test(tahun)) throw new Error('Tahun harus empat digit');
      const latest=await prisma.template.findFirst({where:{jenis:source.jenis,tahun},orderBy:{versi:'desc'}});
      res.status(201).json(await prisma.template.create({data:{id:randomUUID(),nama:String(req.body.nama || `${source.nama} (${tahun})`).slice(0,150),jenis:source.jenis,tahun,versi:(latest?.versi||0)+1,sections:source.sections,isActive:false,isDefault:false,deskripsi:source.deskripsi}}));
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
  app.delete('/api/templates/:id',auth,async(req,res)=>{
    if(superOnly(req,res)) return;
    try {
      const template=await prisma.template.findUnique({where:{id:req.params.id}});
      if(!template) return res.status(404).json({error:'Template tidak ditemukan'});
      if(template.isActive) return res.status(409).json({error:'Template aktif tidak dapat dihapus. Aktifkan template lain terlebih dahulu.'});
      if(await prisma.document.count({where:{templateId:template.id}})) return res.status(409).json({error:'Template yang sudah digunakan dokumen tidak dapat dihapus.'});
      await prisma.template.delete({where:{id:template.id}});
      res.json({success:true});
    } catch(e){console.error(e);res.status(500).json({error:'Template gagal dihapus'});}
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
