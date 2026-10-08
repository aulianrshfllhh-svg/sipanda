import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {registerDocumentReview,submissionSnapshot} from '../document-review.js';
import {compareDocumentVersions} from '../../shared/document-history.js';
test('immutable submission snapshot preserves document content/profile without changing source or template snapshot',async()=>{
 const doc={id:'doc',cara:'template',createdAt:new Date(),templateSnapshot:{versi:3},frontMatter:{preface:'Pengantar'},sections:[{babId:'bab-1',babTitle:'BAB I',subsections:[{id:'s',content:'<p>Awal</p>'}]}]};const snap=await submissionSnapshot(doc);doc.sections[0].subsections[0].content='Berubah';assert.equal(snap.sections[0].subsections[0].content,'<p>Awal</p>');assert.equal(snap.templateSnapshot.versi,3);assert.equal(typeof snap.createdAt,'string');
});
test('comparison highlights changed, new and removed subchapters, front matter, and stable unchanged sections',()=>{
 const a={sections:[{id:'bab',subsections:[{id:'s',title:'Isi',content:'Awal'},{id:'gone',title:'Lama',content:'Lama'}]}],frontMatter:{preface:'Awal'}};const b={sections:[{id:'bab',subsections:[{id:'s',title:'Isi',content:'Baru'},{id:'added',title:'Baru',content:'Baru'}]}],frontMatter:{preface:'Baru'}};const diff=compareDocumentVersions(a,b);assert.equal(diff.find(d=>d.id==='s').status,'changed');assert.equal(diff.find(d=>d.id==='gone').status,'removed');assert.equal(diff.find(d=>d.id==='added').status,'added');assert.equal(diff[0].id,'front-matter');assert.equal(compareDocumentVersions(b,b).every(d=>d.status==='unchanged'),true);
});
test('comments and versions deny unassigned users before reading records; comment target belongs to the document',async()=>{
 let allowed=false,writes=0;const doc={id:'doc',sections:[{babId:'bab',subsections:[{id:'sub'}]}]};const prisma={document:{findUnique:async()=>doc},$executeRawUnsafe:async()=>{},$executeRaw:async()=>{writes++;return 1;},$queryRaw:async()=>[],documentVersion:{findMany:async()=>[]}};
 const app=express();app.use(express.json());registerDocumentReview(app,prisma,(req,_res,next)=>{req.currentUser={id:'u',name:'Penyusun'};next();},async()=>({canView:allowed}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url=`http://127.0.0.1:${server.address().port}/api/documents/doc`;
 try{for(const endpoint of ['/comments','/versions','/versions/private','/versions/private/preview','/versions/private/source'])assert.equal((await fetch(url+endpoint)).status,403);assert.equal((await fetch(url+'/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:'Catatan'})})).status,403);assert.equal(writes,0);allowed=true;let response=await fetch(url+'/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:'Catatan',target:{babId:'other',subId:'sub',kind:'paragraph'}})});assert.equal(response.status,400);assert.equal(writes,0);response=await fetch(url+'/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:'Catatan',target:{babId:'bab',subId:'sub',kind:'paragraph',quote:'Uraian'}})});assert.equal(response.status,201);assert.equal(writes,1);}finally{await new Promise(r=>server.close(r));}
});

test('comment reads recover after a transient initialization failure without restarting the server',async()=>{
 let attempts=0;
 const prisma={document:{findUnique:async()=>({id:'doc',sections:[]})},$executeRawUnsafe:async()=>{if(++attempts===1)throw new Error('Database temporarily unavailable');},$queryRaw:async()=>[]};
 const app=express();registerDocumentReview(app,prisma,(req,_res,next)=>{req.currentUser={id:'u'};next();},async()=>({canView:true}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const url=`http://127.0.0.1:${server.address().port}/api/documents/doc/comments`;
 try{assert.equal((await fetch(url)).status,500);const response=await fetch(url);assert.equal(response.status,200);assert.deepEqual(await response.json(),[]);assert.equal((await fetch(url)).status,200);assert.equal(attempts,2);}finally{await new Promise(resolve=>server.close(resolve));}
});
