const RENSTRA_TYPES = ['Renstra', 'Renstra Murni', 'Renstra Perubahan'];
const SUBMITTED_STATUSES = ['Menunggu Verifikasi', 'Perlu Revisi', 'Disetujui Bapperida', 'Final'];
const LAMPIRAN_TYPES = [
  'Lampiran Perbup Renja',
  'Lampiran Kepbup Perubahan Renja',
  'Lampiran Perbup Renstra'
];

function newest(documents) {
  return [...documents].sort((left, right) =>
    new Date(right.updatedAt || right.createdAt || 0).getTime()
      - new Date(left.updatedAt || left.createdAt || 0).getTime()
  )[0] || null;
}

function isRenstraActiveInYear(document, year) {
  const start = Number(document.regulation?.periodeMulai || document.tahun);
  const end = Number(document.regulation?.periodeAkhir || document.tahun);
  return Number.isInteger(start) && Number.isInteger(end) && start <= end && start <= year && year <= end;
}

function approvedItem(key, label, year, document) {
  const lastVerification=document?.verifications?.[0];
  const submittedLog=document?.statusLogs?.[0];
  return {
    key,
    label,
    year: String(year),
    documentId: document?.id || null,
    documentType: document?.jenis || null,
    status: document?.status || 'Belum Ada',
    verifierName:lastVerification?.verifier?.nama||null,
    lastUpdatedAt:document?.updatedAt||null,
    submittedAt:submittedLog?.waktu||null,
    tteNumber: document?.tteNumber || null,
    approved: ['Disetujui Bapperida','Final'].includes(document?.status)
  };
}

function annexItem(key, label, year, parent, annexes, expectedType) {
  const annex = parent
    ? newest(annexes.filter(document =>
      document.parentId === parent.id
      && document.jenis === expectedType
      && document.isLampiranOtomatis
    ))
    : null;
  const approved = ['Disetujui Bapperida','Final'].includes(parent?.status) && ['Disetujui Bapperida','Final'].includes(annex?.status);
  const status = !parent ? 'Belum Ada'
    : !annex ? 'Belum Terbit'
    : ['Disetujui Bapperida','Final'].includes(annex.status) && !['Disetujui Bapperida','Final'].includes(parent.status) ? 'Tidak Sinkron'
    : annex.status;
  return {
    key,
    label,
    year: String(year),
    documentId: annex?.id || null,
    documentType: expectedType,
    status,
    parentStatus: parent?.status || 'Belum Ada',
    tteNumber: annex?.tteNumber || null,
    approved
  };
}

const DEFAULT_REQUIRED_KEYS = ['renjaMurni', 'lampiranRenjaMurni', 'renjaPerubahan', 'lampiranRenjaPerubahan'];
export function buildPlanningCompliance(opds, parentDocuments, annexDocuments, targetYear, requiredKeys = DEFAULT_REQUIRED_KEYS) {
  const year = Number(targetYear);
  const nextYear = year + 1;

  const items = opds.map(opd => {
    const documents = parentDocuments.filter(document => document.opdId === opd.id);
    const renjaMurni = newest(documents.filter(document =>
      document.jenis === 'Renja Murni' && document.tahun === String(nextYear)
    ));
    const renjaPerubahan = newest(documents.filter(document =>
      document.jenis === 'Renja Perubahan' && document.tahun === String(year)
    ));
    const renstra = newest(documents.filter(document =>
      ['Renstra', 'Renstra Murni'].includes(document.jenis) && isRenstraActiveInYear(document, year)
    ));

    // Kewajiban tahunan terdiri dari dua Renja dan masing-masing lampirannya.
    // Renstra berada pada siklus lima tahunan sehingga tidak masuk denominator tahunan.
    const availableItems = [
      approvedItem('renjaMurni', 'Renja Murni', nextYear, renjaMurni),
      annexItem('lampiranRenjaMurni', 'Lampiran Renja Murni', nextYear, renjaMurni, annexDocuments, 'Lampiran Perbup Renja'),
      approvedItem('renjaPerubahan', 'Renja Perubahan', year, renjaPerubahan),
      annexItem('lampiranRenjaPerubahan', 'Lampiran Renja Perubahan', year, renjaPerubahan, annexDocuments, 'Lampiran Kepbup Perubahan Renja')
    ];
    const requiredItems = availableItems.filter(item => requiredKeys.includes(item.key));
    const completedCount = requiredItems.filter(item => item.approved).length;
    const createdCount = requiredItems.filter(item => item.documentId).length;
    const submittedCount = requiredItems.filter(item => item.documentId &&
      SUBMITTED_STATUSES.includes(item.status) &&
      (!item.parentStatus || SUBMITTED_STATUSES.includes(item.parentStatus))).length;
    const renstraPerubahan = newest(documents.filter(document =>
      document.jenis === 'Renstra Perubahan' && isRenstraActiveInYear(document, year)
    ));
    const optionalItems = [
      ...(renstra ? [approvedItem('renstra', `Renstra periode ${renstra.regulation?.periodeMulai || renstra.tahun}-${renstra.regulation?.periodeAkhir || renstra.tahun} (siklus 5 tahunan)`, year, renstra)] : []),
      ...(renstraPerubahan ? [approvedItem('renstraPerubahan', 'Perubahan Renstra (di luar kewajiban tahunan)', year, renstraPerubahan)] : [])
    ];

    return {
      id: opd.id,
      kode: opd.kode,
      nama: opd.nama,
      kategori: opd.kategori,
      completedCount,
      createdCount,
      submittedCount,
      optionalItems,
      createdRatio: `${createdCount}/${requiredItems.length}`,
      requiredCount: requiredItems.length,
      ratio: `${completedCount}/${requiredItems.length}`,
      isComplete: completedCount === requiredItems.length,
      items: requiredItems
    };
  });

  const approvedDocuments = items.reduce((total, opd) => total + opd.completedCount, 0);
  const totalDocuments = items.reduce((total, opd) => total + opd.requiredCount, 0);
  const completedOpd = items.filter(opd => opd.isComplete).length;

  return {
    tahun: String(year),
    totalOpd: items.length,
    completedOpd,
    approvedDocuments,
    submittedDocuments: items.reduce((total, opd) => total + opd.submittedCount, 0),
    optionalSubmittedDocuments: items.reduce((total, opd) => total + opd.optionalItems.filter(item => SUBMITTED_STATUSES.includes(item.status)).length, 0),
    totalDocuments,
    completionRate: totalDocuments ? Math.round((approvedDocuments / totalDocuments) * 100) : 0,
    opds: items
  };
}

export function registerPlanningComplianceRoute(app, prisma, authMiddleware, isSuperAdmin) {
  const defaultMonitoringSettings = () => ({tahunAnggaranAktif:String(new Date().getFullYear()),batasWaktu:null,requiredItems:DEFAULT_REQUIRED_KEYS});
  async function getMonitoringSettings(){
    const saved=await prisma.documentSettings.findUnique({where:{id:'global'},select:{data:true}});
    return {...defaultMonitoringSettings(),...(saved?.data?.monitoring||{})};
  }
  app.get('/api/monitoring/settings',authMiddleware,async(_req,res)=>{
    try{res.json(await getMonitoringSettings());}catch(error){console.error('Failed to read monitoring settings:',error);res.status(500).json({error:'Gagal membaca pengaturan monitoring'});}
  });
  app.put('/api/monitoring/settings',authMiddleware,async(req,res)=>{
    if(!isSuperAdmin(req.currentUser))return res.status(403).json({error:'Hanya Super Admin yang dapat mengubah Pengaturan Monitoring'});
    const year=String(req.body?.tahunAnggaranAktif||'');
    const rawKeys=req.body?.requiredItems;
    if(!/^\d{4}$/.test(year)||!Array.isArray(rawKeys)||!rawKeys.length||rawKeys.some(key=>!DEFAULT_REQUIRED_KEYS.includes(key))||new Set(rawKeys).size!==rawKeys.length)return res.status(400).json({error:'Tahun aktif atau daftar dokumen wajib tidak valid'});
    const deadline=req.body?.batasWaktu?new Date(req.body.batasWaktu):null;
    if(deadline&&!Number.isFinite(deadline.getTime()))return res.status(400).json({error:'Batas waktu tidak valid'});
    try{
      const current=await prisma.documentSettings.findUnique({where:{id:'global'},select:{data:true}});
      const data={...(current?.data||{}),monitoring:{tahunAnggaranAktif:year,requiredItems:rawKeys,batasWaktu:deadline?.toISOString()||null}};
      await prisma.documentSettings.upsert({where:{id:'global'},create:{id:'global',data},update:{data}});
      res.json(data.monitoring);
    }catch(error){console.error('Failed to save monitoring settings:',error);res.status(500).json({error:'Gagal menyimpan Pengaturan Monitoring'});}
  });
  app.get('/api/stats/monitoring', authMiddleware, async (req, res) => {
    let settings;
    try{settings=await getMonitoringSettings();}catch{return res.status(500).json({error:'Gagal membaca pengaturan monitoring'});}
    const year = typeof req.query.tahun === 'string' ? req.query.tahun : settings.tahunAnggaranAktif;
    if (!/^\d{4}$/.test(year) || Number(year) < 1000 || Number(year) >= 9999) {
      return res.status(400).json({ error: 'Tahun monitoring harus berupa tahun empat digit yang valid' });
    }

    const user = req.currentUser;
    if (!isSuperAdmin(user) && user.role !== 'staf') {
      return res.status(403).json({ error: 'Monitoring kepatuhan OPD hanya tersedia untuk pegawai Bapperida' });
    }

    try {
      let assignedOpdIds;
      if (!isSuperAdmin(user)) {
        const assignments = await prisma.penugasanVerifikasi.findMany({
          where: { userId: user.id, tahun: year },
          select: { opdId: true }
        });
        assignedOpdIds = assignments.map(assignment => assignment.opdId);
      }

      const opds = await prisma.opd.findMany({
        where: {
          isActive: true,
          ...(assignedOpdIds ? { id: { in: assignedOpdIds } } : {})
        },
        orderBy: { nomorUrut: 'asc' },
        select: { id: true, kode: true, nama: true, kategori: true }
      });
      const opdIds = opds.map(opd => opd.id);
      const targetYear = Number(year);
      const parentDocuments = opdIds.length ? await prisma.document.findMany({
        where: {
          opdId: { in: opdIds },
          parentId: null,
          isLampiranOtomatis: false,
          OR: [
            { jenis: 'Renja Murni', tahun: String(targetYear + 1) },
            { jenis: 'Renja Perubahan', tahun: year },
            { jenis: { in: RENSTRA_TYPES }, tahun: { lte: year } }
          ]
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true, opdId: true, jenis: true, tahun: true, status: true,
          regulation: true, tteNumber: true, updatedAt: true, createdAt: true,
          verifications:{orderBy:{createdAt:'desc'},take:1,select:{verifier:{select:{nama:true}}}},
          statusLogs:{where:{ke:'Menunggu Verifikasi'},orderBy:{waktu:'desc'},take:1,select:{waktu:true}}
        }
      }) : [];
      const parentIds = parentDocuments.map(document => document.id);
      const annexDocuments = parentIds.length ? await prisma.document.findMany({
        where: {
          parentId: { in: parentIds },
          isLampiranOtomatis: true,
          jenis: { in: LAMPIRAN_TYPES }
        },
        select: {
          id: true, parentId: true, jenis: true, status: true, tteNumber: true,
          isLampiranOtomatis: true, updatedAt: true, createdAt: true
        }
      }) : [];

      const report=buildPlanningCompliance(opds,parentDocuments,annexDocuments,targetYear,settings.requiredItems);
      res.json({...report,batasWaktu:settings.batasWaktu});
    } catch (error) {
      console.error('Failed to load planning compliance monitoring:', error);
      res.status(500).json({ error: 'Gagal mengambil monitoring kepatuhan OPD' });
    }
  });
}
