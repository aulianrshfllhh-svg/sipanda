// The Lampiran module lists the signed-in account's own perangkat daerah.
export function annexOwnerOpdId(user) {
  return user?.opdId || null;
}
