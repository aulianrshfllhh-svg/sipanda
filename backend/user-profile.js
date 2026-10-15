export function buildUserProfile(user) {
  const roleKodes = user.roles?.map(item => item.role.kode) || [];
  const isLegacyBapperidaAdmin = user.username === 'admin' && user.opdId === 'bapperida';
  if (isLegacyBapperidaAdmin && !roleKodes.includes('super_admin')) {
    roleKodes.push('super_admin');
  }

  const isSuperAdmin = roleKodes.includes('super_admin');
  const primaryRole = isSuperAdmin ? 'admin'
    : roleKodes.includes('staf_bapperida') || roleKodes.includes('penyusun_rkpd') ? 'staf'
    : 'opd';
  const roleLabel = isSuperAdmin ? 'BAPPERIDA (SUPER ADMIN)'
    : roleKodes.includes('penyusun_rkpd') ? 'PENYUSUN RKPD'
    : roleKodes.includes('staf_bapperida') ? 'STAF BAPPERIDA'
    : 'PERANGKAT DAERAH (OPD)';

  return {
    id: user.id,
    username: user.username,
    name: user.nama,
    nama: user.nama,
    nip: user.nip,
    jabatan: user.jabatan,
    singkatan: user.singkatan,
    avatar: user.avatar,
    opdId: user.opdId,
    opdName: user.opd?.nama || user.nama,
    role: primaryRole,
    roleLabel,
    roleKodes,
    isSuperAdmin,
  };
}
