export interface EditorDraft {
  key:string;userId:string;documentId:string;sessionId:string;savedAt:number;pending:boolean;archived?:boolean;
  document:any;revisions:Record<string,string>;baseline:Record<string,string>;
}
let database:Promise<IDBDatabase>|null=null;
function open(){return database ||= new Promise((resolve,reject)=>{
  const request=indexedDB.open('sipanda-editor-drafts',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('drafts',{keyPath:'key'});
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>{database=null;reject(request.error);};
});}
export async function putEditorDraft(draft:EditorDraft){
  const db=await open();
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(draft);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}
export async function editorDrafts(userId:string,documentId:string):Promise<EditorDraft[]>{
  const db=await open();return new Promise((resolve,reject)=>{const request=db.transaction('drafts').objectStore('drafts').getAll();request.onsuccess=()=>resolve(request.result.filter((d:EditorDraft)=>d.userId===userId&&d.documentId===documentId&&!d.archived).sort((a:EditorDraft,b:EditorDraft)=>b.savedAt-a.savedAt));request.onerror=()=>reject(request.error);});
}
export function chapterContent(bab:any,frontMatter:any,first:boolean){return JSON.stringify({subsections:bab.subsections,frontMatter:first?frontMatter:null});}
