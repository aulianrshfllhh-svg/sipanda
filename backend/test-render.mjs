import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import {renderDocument} from './document-render.js';
import {documentSettings} from './document-settings.js';
import {openRenderedDocument} from './document-export.js';
import fs from 'node:fs';
const p=new PrismaClient();let browser;
try{
 const doc=await p.document.findUnique({where:{kodeDoc:'DEMO-RENJA-MUNDU-2027'},include:{sections:{orderBy:{babOrder:'asc'}}}});
 const html=renderDocument(doc,await documentSettings(p,doc.opdId));
 const result=await openRenderedDocument(html);browser=result.browser;
 console.log(await result.page.evaluate(()=>({pages:document.querySelectorAll('.paper').length,landscape:document.querySelectorAll('.landscape').length,overflow:[...document.querySelectorAll('.page-body')].filter(el=>el.scrollHeight>el.clientHeight+1).length,toc:[...document.querySelectorAll('[data-page-ref]')].map(el=>el.textContent)})));
 fs.mkdirSync('../artifacts',{recursive:true});await result.page.pdf({path:'../artifacts/mundu-2027-preview.pdf',printBackground:true,preferCSSPageSize:true});await result.page.screenshot({path:'../artifacts/mundu-2027-preview.png'});await (await result.page.$('.landscape')).screenshot({path:'../artifacts/landscape-export.png'});
}catch(e){console.error(e);process.exitCode=1;}finally{await browser?.close();await p.$disconnect();}
