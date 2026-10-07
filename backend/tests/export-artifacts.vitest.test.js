import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { editableDocx } from '../document-word.js';
import { openRenderedDocument } from '../document-export.js';
import { renderDocument } from '../document-render.js';

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.resolve(backendDirectory, '..', 'tests', 'output');

describe('contoh berkas ekspor aplikasi', () => {
  it('membuat dan memeriksa DOCX serta PDF di tests/output', async () => {
    await fs.mkdir(outputDirectory, { recursive: true });
    const doc = {
      judul: 'Dokumen Uji SIPANDA',
      jenis: 'Renja Murni',
      tahun: '2027',
      sections: [{
        id: 'bab-1',
        title: 'BAB I PENDAHULUAN',
        subsections: [{
          id: 'sub-1-1',
          code: '1.1',
          title: 'Latar Belakang',
          content: '<p>Contoh ekspor otomatis dari renderer dokumen SIPANDA.</p>'
        }]
      }]
    };
    const settings = { opd: { nama: 'Perangkat Daerah Uji' }, global: {} };
    const { browser, page } = await openRenderedDocument(renderDocument(doc, settings));
    try {
      const pdfBytes = await page.pdf({ printBackground: true, preferCSSPageSize: true });
      const docxBytes = await editableDocx(page, doc.judul);
      const pdfPath = path.join(outputDirectory, 'sipanda-sample.pdf');
      const docxPath = path.join(outputDirectory, 'sipanda-sample.docx');
      await Promise.all([
        fs.writeFile(pdfPath, pdfBytes),
        fs.writeFile(docxPath, docxBytes)
      ]);

      const archive = await JSZip.loadAsync(docxBytes);
      const wordXml = await archive.file('word/document.xml').async('string');
      expect(wordXml).toContain('BAB I PENDAHULUAN');
      expect(wordXml).toContain('Contoh ekspor otomatis');

      const pdf = await getDocument({ data: new Uint8Array(pdfBytes), disableWorker: true }).promise;
      expect(pdf.numPages).toBeGreaterThan(0);
      const pdfText = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const text = await page.getTextContent();
        pdfText.push(...text.items.map(item => item.str));
      }
      expect(pdfText.join(' ')).toContain('PERANGKAT DAERAH UJI');
      expect(pdfText.join(' ')).toContain('Contoh ekspor otomatis');
      expect((await fs.stat(pdfPath)).size).toBeGreaterThan(1000);
      expect((await fs.stat(docxPath)).size).toBeGreaterThan(1000);
    } finally {
      await browser.close();
    }
  }, 90000);
});
