import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTemplates, seedSections } from '../templates.js';

test('ensureTemplates versions an active legacy 2027 Renja Murni template', async () => {
  const base = {
    id: 'tpl-renja-murni-2027-v1',
    jenis: 'Renja Murni',
    tahun: '2027',
    versi: 1,
    isActive: true,
    sections: [
      ...seedSections('Renja Murni', '2027').slice(0, 4),
      { id: 'bab-5', title: 'BAB V KINERJA PENYELENGGARAAN BIDANG URUSAN', subsections: [] },
      { id: 'bab-6', title: 'BAB VI PENUTUP', subsections: [] }
    ]
  };
  const records = new Map([[base.id, structuredClone(base)]]);
  records.set('custom-renja-active', {
    id: 'custom-renja-active',
    jenis: 'Renja Murni',
    tahun: '2027',
    versi: 2,
    isActive: true
  });

  const prisma = {
    template: {
      async upsert({ where, create }) {
        if (!records.has(where.id)) records.set(where.id, structuredClone(create));
      },
      async findUnique({ where }) {
        return records.get(where.id) || null;
      },
      async findFirst({ where }) {
        return [...records.values()]
          .filter(record => record.jenis === where.jenis && record.tahun === where.tahun)
          .sort((a, b) => b.versi - a.versi)[0] || null;
      }
    },
    async $transaction(callback) {
      return callback({
        template: {
          async updateMany({ where, data }) {
            for (const record of records.values()) {
              if (record.id === where.id && record.isActive) {
                Object.assign(record, data);
              }
            }
          },
          async create({ data }) {
            records.set(data.id, structuredClone(data));
          }
        }
      });
    }
  };

  await ensureTemplates(prisma);

  const migrated = records.get('tpl-renja-murni-2027-permendagri-86');
  assert.equal(records.get(base.id).isActive, false);
  assert.equal(records.get('custom-renja-active').isActive, true);
  assert.equal(migrated.isActive, true);
  assert.equal(migrated.versi, 3);
  assert.equal(migrated.sections.length, 5);
  assert.match(migrated.sections[4].title, /BAB V PENUTUP/);

  await ensureTemplates(prisma);
  assert.equal([...records.keys()].filter(id => id === 'tpl-renja-murni-2027-permendagri-86').length, 1);
});
