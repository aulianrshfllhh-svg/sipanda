export const OPD_DOCUMENT_TYPES = [
  'Renja Murni',
  'Renja Perubahan',
  'Renstra',
  'Renstra Murni',
  'Renstra Perubahan'
];

export async function finalArchiveListWhere(user, prisma, isSuperAdmin) {
  const where = { status: 'Final', parentId: null, isLampiranOtomatis: false };
  if (user.role === 'opd') {
    return { ...where, opdId: user.opdId, jenis: { in: OPD_DOCUMENT_TYPES } };
  }
  if (user.role !== 'staf' || isSuperAdmin(user)) return where;

  const [assignments, chapterAssignments] = await Promise.all([
    prisma.penugasanVerifikasi.findMany({
      where: { userId: user.id },
      select: { opdId: true, tahun: true }
    }),
    prisma.penugasanBabRkpd.findMany({
      where: { userId: user.id },
      select: { documentId: true }
    })
  ]);
  return {
    ...where,
    OR: [
      { opdId: 'bapperida' },
      ...assignments.map(assignment => ({
        opdId: assignment.opdId,
        tahun: assignment.tahun,
        jenis: { notIn: ['RKPD', 'RKPD Murni', 'RKPD Perubahan', 'Evaluasi RKPD Triwulan'] }
      })),
      ...(chapterAssignments.length
        ? [{ id: { in: chapterAssignments.map(assignment => assignment.documentId) } }]
        : [])
    ]
  };
}

export async function canViewFinalArchive(user, document, prisma) {
  if (document.status !== 'Final') return false;
  if (user.roleKodes?.includes('super_admin')) return true;

  if (document.isLampiranOtomatis && document.parentId) {
    const parent = await prisma.document.findUnique({ where: { id: document.parentId } });
    return parent ? canViewFinalArchive(user, parent, prisma) : false;
  }

  if (user.role === 'opd') {
    return user.opdId === document.opdId && OPD_DOCUMENT_TYPES.includes(document.jenis);
  }

  if (user.role !== 'staf') return false;
  if (document.opdId === 'bapperida') return true;

  const assignment = await prisma.penugasanVerifikasi.findUnique({
    where: {
      userId_opdId_tahun: {
        userId: user.id,
        opdId: document.opdId,
        tahun: document.tahun
      }
    }
  });
  if (assignment) return true;

  return Boolean(await prisma.penugasanBabRkpd.findFirst({
    where: { userId: user.id, documentId: document.id }
  }));
}
