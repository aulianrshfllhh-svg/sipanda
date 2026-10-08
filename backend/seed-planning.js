import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import {ensureTemplates} from './templates.js';

// Seed planning data only creates the standard templates; it never inserts demo documents.
export async function seedPlanning(prisma){
  await ensureTemplates(prisma);
  console.log('Template Renja, Renstra, RKPD, dan RPJMD siap. Tidak ada dokumen dummy yang dibuat.');
}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/seed-planning.js')){
  const prisma=new PrismaClient();
  try{await seedPlanning(prisma);}catch(e){console.error(e);process.exitCode=1;}finally{await prisma.$disconnect();}
}
