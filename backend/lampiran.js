const ANNEX_TYPES = {
  'Renja Murni': 'Lampiran Perbup Renja',
  'Renja Perubahan': 'Lampiran Kepbup Perubahan Renja',
  Renstra: 'Lampiran Perbup Renstra',
  'Renstra Murni': 'Lampiran Perbup Renstra',
  'Renstra Perubahan': 'Lampiran Perbup Renstra'
};

export const ANNEX_DOCUMENT_TYPES = [...new Set(Object.values(ANNEX_TYPES))];

export async function syncLampiranInTransaction(tx, parentDoc, force = false) {
  const parent = await tx.document.findUnique({
    where: { id: parentDoc.id },
    include: { sections: { orderBy: { babOrder: 'asc' } }, opd: true }
  });
  if (!parent || !ANNEX_TYPES[parent.jenis]) return null;

  const jenis = ANNEX_TYPES[parent.jenis];
  const title = `Lampiran ${jenis.replace('Lampiran ', '')} ${parent.opd.nama} Tahun ${parent.tahun}`;
  const kodeDoc = `LMP-${parent.kodeDoc}`;
  const defaults = {
    nomorPeraturan: '',
    tahunPenetapan: String(Number(parent.tahun) - (jenis === 'Lampiran Kepbup Perubahan Renja' ? 0 : 1)),
    nomorKepbup: '',
    tanggalKepbup: '',
    periodeMulai: parent.regulation?.periodeMulai || parent.tahun,
    periodeAkhir: parent.regulation?.periodeAkhir || parent.tahun
  };

  const existing = await tx.document.findUnique({ where: { kodeDoc } });
  if (existing?.status === 'Disetujui' && !force) return existing;

  const data = {
      jenis,
      tahun: parent.tahun,
      judul: title,
      subJudul: `Lampiran otomatis dari ${parent.jenis}`,
      opdId: parent.opdId,
      opdName: parent.opd.nama,
      cara: 'template',
      status: parent.status,
      parentId: parent.id,
      isLampiranOtomatis: true,
      createdById: parent.createdById,
      templateId: parent.templateId,
      regulation: { ...defaults, ...(existing?.regulation || {}) },
      updatedAt: new Date()
  };
  const child = await tx.document.upsert({
      where: { kodeDoc },
      create: {
        ...data,
        kodeDoc,
        nomorSurat: '',
        nomerRegistrasiArsip: `ARS-${kodeDoc}`
      },
      update: data
  });
  await tx.documentSection.deleteMany({ where: { documentId: child.id } });
  if (parent.sections.length) {
    await tx.documentSection.createMany({
        data: parent.sections.map(section => ({
          documentId: child.id,
          babId: section.babId,
          babTitle: section.babTitle,
          babOrder: section.babOrder,
          isLocked: true,
          subsections: section.subsections
        }))
    });
  }
  return child;
}

export async function syncLampiran(prisma, parentDoc, force = false) {
  return prisma.$transaction(tx => syncLampiranInTransaction(tx, parentDoc, force));
}
