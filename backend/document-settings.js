export const EMPTY_PROFILE={nama:'',alamat:'',jabatan:'',pimpinan:'',pangkat:'',nip:'',tempat:'Sumber',bulan:''};
export function validateCoverLogo(value){
  if(typeof value!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))return 'Logo harus berupa PNG transparan.';
  const encoded=value.slice('data:image/png;base64,'.length);
  if(encoded.length>14_000_000)return 'Ukuran logo maksimal 10 MB.';
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.length<33||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'Berkas logo PNG tidak valid.';
  if(bytes.toString('ascii',12,16)!=='IHDR')return 'Struktur PNG logo tidak valid.';
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),colorType=bytes[25];
  if(width<200||height<472)return 'Resolusi logo harus minimal 300 dpi pada tinggi cetak 4 cm (minimal 472 piksel).';
  if(![4,6].includes(colorType))return 'Logo PNG harus mendukung latar transparan.';
  return '';
}
export async function documentSettings(prisma,opdId) {
  const [global,profile,opd]=await Promise.all([
    prisma.documentSettings.findUnique({where:{id:'global'}}),
    prisma.documentSettings.findUnique({where:{id:`opd:${opdId}`}}),
    prisma.opd.findUnique({where:{id:opdId}}),
  ]);
  return {
    global:{bupati:'IMRON',sekretarisDaerah:'',logoData:'',...(global?.data||{})},
    opd:{...EMPTY_PROFILE,...(profile?.data||{})},
    opdRecord:opd?{id:opd.id,nama:opd.nama,nomorLampiran:opd.nomorLampiran}:{id:opdId,nama:'',nomorLampiran:''}
  };
}
export function registerSettingsRoutes(app,prisma,auth,isSuperAdmin) {
  app.get('/api/document-settings/:opdId',auth,async(req,res)=>{
    try {res.json(await documentSettings(prisma,req.params.opdId));} catch(e){res.status(500).json({error:'Gagal membaca pengaturan'});}
  });
  app.put('/api/document-settings/:opdId',auth,async(req,res)=>{
    const admin=isSuperAdmin(req.currentUser);
    if(!admin && !(req.currentUser.role==='opd' && req.currentUser.opdId===req.params.opdId)) return res.status(403).json({error:'Anda tidak dapat mengubah pengaturan OPD ini'});
    try {
      if(!await prisma.opd.findUnique({where:{id:req.params.opdId}})) return res.status(404).json({error:'OPD tidak ditemukan'});
      const profile={};
      for(const key of Object.keys(EMPTY_PROFILE).filter(key=>key!=='nama')) profile[key]=String(req.body.opd?.[key]||'').slice(0,500);
      const operations=[prisma.documentSettings.upsert({where:{id:`opd:${req.params.opdId}`},create:{id:`opd:${req.params.opdId}`,data:profile},update:{data:profile}})];
      if(admin && req.body.opdRecord) {
        const nama=String(req.body.opdRecord.nama||'').trim();
        const nomorLampiran=String(req.body.opdRecord.nomorLampiran||'').trim().toUpperCase();
        if(!nama || nama.length>200) return res.status(400).json({error:'Nama resmi OPD wajib diisi (maksimal 200 karakter)'});
        if(!/^[IVXLCDM]{1,20}$/.test(nomorLampiran)) return res.status(400).json({error:'Nomor lampiran harus berupa angka Romawi'});
        const duplicate=await prisma.opd.findFirst({where:{nomorLampiran,id:{not:req.params.opdId}}});
        if(duplicate) return res.status(409).json({error:`Nomor lampiran ${nomorLampiran} sudah digunakan oleh ${duplicate.nama}`});
        operations.push(prisma.opd.update({where:{id:req.params.opdId},data:{nama,nomorLampiran}}));
      }
      if(admin && req.body.global) {
        const logoData=String(req.body.global.logoData||'');
        const logoError=logoData?validateCoverLogo(logoData):'';
        if(logoError)return res.status(400).json({error:logoError});
        const global={bupati:String(req.body.global.bupati||'').slice(0,200),sekretarisDaerah:String(req.body.global.sekretarisDaerah||'').slice(0,200),logoData};
        operations.push(prisma.documentSettings.upsert({where:{id:'global'},create:{id:'global',data:global},update:{data:global}}));
      }
      await prisma.$transaction(operations);
      res.json(await documentSettings(prisma,req.params.opdId));
    } catch(e){console.error(e);res.status(500).json({error:'Gagal menyimpan pengaturan'});}
  });
}
