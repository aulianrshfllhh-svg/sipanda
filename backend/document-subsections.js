export function appendSubsection(sections, babId, rawTitle, id) {
  const title = String(rawTitle || '').trim();
  if (!title) throw new Error('Judul sub-bab wajib diisi');
  if (title.length > 160) throw new Error('Judul sub-bab maksimal 160 karakter');

  const babIndex = sections.findIndex(section => section.id === babId);
  if (babIndex === -1) throw new Error('Bab dokumen tidak ditemukan');

  const updatedSections = structuredClone(sections);
  const bab = updatedSections[babIndex];
  if (!Array.isArray(bab.subsections)) throw new Error('Struktur sub-bab tidak valid');

  const subsection = {
    id,
    code: `${bab.order || babIndex + 1}.${bab.subsections.length + 1}`,
    title,
    locked: true,
    content: '<p></p>',
    orientation: 'portrait',
    pageBreakBefore: false
  };
  bab.subsections.push(subsection);
  return { sections: updatedSections, subsection };
}
