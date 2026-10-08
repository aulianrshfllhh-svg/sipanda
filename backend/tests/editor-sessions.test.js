import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditorSessions,chapterRevisions} from '../editor-sessions.js';
function setup(){
 const doc={id:'doc',frontMatter:{preface:'Pendahuluan'},sections:[{babId:'bab-1',babOrder:1,subsections:[{id:'sub-1',content:'Isi awal'}]},{babId:'bab-2',babOrder:2,subsections:[{id:'sub-2',content:'Isi lain'}]}]},leases=new Map();let allowed=true,queue=Promise.resolve();
 const tx={document:{findUnique:async()=>structuredClone(doc)},$queryRaw:async(strings,...values)=>strings.join('').includes('editor_chapter_leases')?[leases.get(values[1])].filter(Boolean):[{id:'doc'}],$executeRaw:async(strings,...v)=>{
  if(strings.join('').startsWith('INSERT'))leases.set(v[1],{session_id:v[2],user_id:v[3],user_name:v[4],expires_at:v[5]});
  else if(strings.join('').startsWith('DELETE')){const row=leases.get(v[1]);if(row?.session_id===v[2]&&row?.user_id===v[3])leases.delete(v[1]);}
 }};
 const prisma={$executeRawUnsafe:async()=>{},$transaction:fn=>{const result=queue.then(()=>fn(tx));queue=result.catch(()=>{});return result;}};
 const service=createEditorSessions(prisma,async()=>({canView:allowed,canEdit:allowed,editableBabIds:['bab-1','bab-2']}));
 return {service,doc,leases,deny:()=>{allowed=false;}};
}
const user={id:'user-1',name:'Penyusun'},one='session-one-123456',two='session-two-123456';
test('same account second session is read-only, separate chapters can have different owners, and only owner releases',async()=>{
 const {service}=setup();assert.equal((await service.acquire(user,'doc',one,['bab-1'])).leases[0].owned,true);
 const blocked=(await service.acquire(user,'doc',two,['bab-1','bab-2'])).leases;assert.equal(blocked[0].owned,false);assert.equal(blocked[0].sameAccount,true);assert.equal(blocked[1].owned,true);
 await service.acquire(user,'doc',two,['bab-1'],true);assert.equal((await service.acquire(user,'doc',two,['bab-1'])).leases[0].owned,false);
 await service.acquire(user,'doc',one,['bab-1'],true);assert.equal((await service.acquire(user,'doc',two,['bab-1'])).leases[0].owned,true);
});
test('atomic lease acquisition permits exactly one simultaneous owner',async()=>{
 const {service}=setup();const results=await Promise.all([service.acquire(user,'doc',one,['bab-1']),service.acquire(user,'doc',two,['bab-1'])]);assert.equal(results.filter(r=>r.leases[0].owned).length,1);
});
test('save rejects stale chapter revision or expired lease before writing; unrelated chapter changes do not conflict',async()=>{
 const {service,doc,leases}=setup();await service.acquire(user,'doc',one,['bab-1']);const expected=chapterRevisions(doc);let writes=0;
 doc.sections[1].subsections[0].content='Perubahan BAB lain';await service.save(user,'doc',one,expected,['bab-1'],async()=>{writes++;});assert.equal(writes,1);
 doc.sections[0].subsections[0].content='Perubahan server';await assert.rejects(()=>service.save(user,'doc',one,expected,['bab-1'],async()=>writes++),e=>e.status===409&&e.details.conflicts.includes('bab-1'));assert.equal(writes,1);
 leases.get('bab-1').expires_at=new Date(0);await assert.rejects(()=>service.save(user,'doc',one,chapterRevisions(doc),['bab-1'],async()=>writes++),e=>e.status===423);assert.equal(writes,1);
});
test('revoked editing permission and malformed sessions cannot acquire or save',async()=>{
 const {service,doc,deny}=setup();await assert.rejects(()=>service.acquire(user,'doc','bad',['bab-1']),e=>e.status===400);await service.acquire(user,'doc',one,['bab-1']);deny();await assert.rejects(()=>service.save(user,'doc',one,chapterRevisions(doc),['bab-1'],async()=>{}),e=>e.status===403);await assert.rejects(()=>service.acquire(user,'doc',two,['bab-1']),e=>e.status===403);
});
