import {sanitizePasteAsync} from '../../../../shared/editor-paste.js';

type Change={babId:string;subId:string;index:number;html:string};
// Page fragments remain a view. Only their edited content is stitched back into the source.
export function pagedCanvas(doc:Document,canEdit:(id:string)=>boolean,onChange:(changes:Change[])=>void,allowBold=false,onLayout=()=>{}){
 const win=doc.defaultView as any;
 let reflowing=false,disposed=false,plainPaste=false,pasting=false,reflowAfterPaste=false,timer:ReturnType<typeof setTimeout>|undefined;
 const history:string[]=[win.editorSource.innerHTML];let cursor=0,lastRecord=0;
 const dirtyBlocks=new Set<string>();
 function clean(node:HTMLElement){const copy=node.cloneNode(true) as HTMLElement;for(const el of [copy,...copy.querySelectorAll<HTMLElement>('*')]){el.removeAttribute('contenteditable');el.removeAttribute('data-layout-balanced');for(const a of [...el.attributes])if(a.name.startsWith('data-editor-'))el.removeAttribute(a.name);el.classList.remove('list-continuation');}return copy.outerHTML;}
 function stitch(nodes:HTMLElement[]){
  const first=nodes[0].cloneNode(true) as HTMLElement;
  if(first.tagName==='TABLE'){
   const body=first.querySelector('tbody');if(!body)return first;
   body.replaceChildren();const rows=new Map<string,HTMLElement>();
   for(const table of nodes)for(const row of table.querySelectorAll<HTMLElement>('tbody > tr')){const key=row.dataset.editorRow;const previous=key?rows.get(key):null;if(previous){[...row.children].forEach((cell,i)=>{if(previous.children[i])previous.children[i].innerHTML+=cell.innerHTML;});}else{const copy=row.cloneNode(true) as HTMLElement;body.append(copy);if(key)rows.set(key,copy);}}
   first.querySelector('tfoot')?.remove();const foot=nodes.map(n=>n.querySelector('tfoot')).find(Boolean);if(foot)first.append(foot.cloneNode(true));
  }else if(['OL','UL'].includes(first.tagName)){
   first.replaceChildren();for(const piece of nodes)for(const item of piece.children){if(item.classList.contains('list-continuation')&&first.lastElementChild)first.lastElementChild.innerHTML+=item.innerHTML;else first.append(item.cloneNode(true));}
  }else first.innerHTML=nodes.map(n=>n.innerHTML).join('');
  // Native Enter can create divs inside an editable paragraph. Store valid block HTML,
  // so parsing it again cannot move later tables outside their subsection.
  if(first.tagName==='P'&&first.querySelector(':scope > div,:scope > p')){
   const group=doc.createElement('div');for(const attr of [...first.attributes])group.setAttribute(attr.name,attr.value);group.classList.add('doc-paragraph-group');
   let paragraph:HTMLParagraphElement|null=null;
   for(const child of [...first.childNodes]){if(child.nodeType===1&&['DIV','P'].includes((child as Element).tagName)){paragraph=doc.createElement('p');paragraph.append(...child.childNodes);group.append(paragraph);}else{if(!paragraph){paragraph=doc.createElement('p');group.append(paragraph);}paragraph.append(child);}}
   return group;
  }
  return first;
 }
 function changes(){const result:Change[]=[];for(const block of win.editorSource.querySelectorAll('[data-editor-block]'))result.push({babId:block.dataset.editorBab,subId:block.dataset.editorSub,index:Number(block.dataset.editorIndex),html:clean(block)});return result;}
 function commit(){
  if(reflowing||disposed||!dirtyBlocks.size)return;
  const groups=new Map<string,HTMLElement[]>();doc.querySelectorAll<HTMLElement>('#pages [data-editor-block]').forEach(node=>{const key=node.dataset.editorBlock!;if(dirtyBlocks.has(key)&&canEdit(node.dataset.editorBab!)){if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(node);}});
  for(const [id,nodes] of groups){const source=win.editorSource.querySelector(`[data-editor-block="${id}"]`);if(source){const replacement=stitch(nodes);replacement.removeAttribute('contenteditable');replacement.removeAttribute('spellcheck');source.replaceWith(replacement);}}
  dirtyBlocks.clear();
  const value=win.editorSource.innerHTML;
  if(value!==history[cursor]){history.splice(cursor+1);if(Date.now()-lastRecord<500&&cursor>0)history[cursor]=value;else{history.push(value);cursor++;}let bytes=history.reduce((sum,item)=>sum+item.length*2,0);while(history.length>2&&(history.length>30||bytes>8*1024*1024)){bytes-=history.shift()!.length*2;cursor--;}lastRecord=Date.now();onChange(changes());}
 }
 function attach(){
  doc.querySelectorAll<HTMLElement>('#pages [data-editor-block]').forEach(node=>{const editable=!pasting&&canEdit(node.dataset.editorBab!)&&!node.classList.contains('doc-caption')&&!node.querySelector('img')&&node.tagName!=='IMG';node.contentEditable=String(editable);node.setAttribute('spellcheck','true');});
  doc.querySelectorAll<HTMLElement>('.doc-reference,.doc-caption-number').forEach(node=>node.contentEditable='false');
 }
 function caret(){
  const selection=doc.getSelection();if(!doc.hasFocus()||!selection?.isCollapsed||!selection.anchorNode)return;
  const node=selection.anchorNode,element=node.nodeType===1?node as Element:node.parentElement;
  const root=element?.closest<HTMLElement>('[data-editor-block][contenteditable="true"]');if(!root||element?.closest('[contenteditable="false"]'))return;
  const cell=element?.closest<HTMLElement>('td,th'),row=cell?.parentElement;
  const id=root.dataset.editorBlock!,rowId=row?.dataset.editorRow,column=cell?Array.from(row!.children).indexOf(cell):-1;
  if(cell&&!rowId)return;
  const pieces=()=>Array.from(doc.querySelectorAll<HTMLElement>('#pages [data-editor-block]')).filter(block=>block.dataset.editorBlock===id).flatMap(block=>cell?Array.from(block.querySelectorAll<HTMLElement>('tbody > tr')).filter(tr=>tr.dataset.editorRow===rowId).map(tr=>tr.children[column] as HTMLElement).filter(Boolean):[block]);
  const target=cell||root,range=doc.createRange();range.selectNodeContents(target);range.setEnd(node,selection.anchorOffset);
  let offset=range.toString().length;for(const piece of pieces()){if(piece===target)break;offset+=piece.textContent?.length||0;}
  return ()=>{
   if(disposed||!doc.hasFocus())return;
   const targets=pieces();let target=targets[targets.length-1];if(!target)return;
   for(const piece of targets){target=piece;const length=piece.textContent?.length||0;if(offset<=length)break;offset-=length;}
   const root=target.closest<HTMLElement>('[data-editor-block]');if(root?.contentEditable!=='true'||!canEdit(root.dataset.editorBab!))return;
   offset=Math.min(offset,target.textContent?.length||0);const walker=doc.createTreeWalker(target,4);let text=walker.nextNode();
   while(text&&offset>(text.textContent?.length||0)){offset-=text.textContent?.length||0;text=walker.nextNode();}
   const restored=doc.createRange();if(text)restored.setStart(text,offset);else{restored.selectNodeContents(target);restored.collapse(false);}restored.collapse(true);
   root.focus({preventScroll:true});const selection=doc.getSelection();selection?.removeAllRanges();selection?.addRange(restored);
  };
 }
 async function reflow(collect=true){
  if(pasting){reflowAfterPaste=true;return;}
  clearTimeout(timer);if(collect)commit();if(disposed||reflowing)return;
  const restoreCaret=caret(),position=doc.scrollingElement?.scrollTop||0;reflowing=true;
  try{await win.repaginateDocument();if(disposed)return;attach();restoreCaret?.();if(doc.scrollingElement)doc.scrollingElement.scrollTop=position;onLayout();}catch(error){doc.querySelector('#error')!.textContent=error instanceof Error?error.message:'Tidak berhasil menata halaman.';}finally{reflowing=false;}
 }
 const input=(event:Event)=>{const root=(event.target as HTMLElement).closest<HTMLElement>('[data-editor-block]');if(root?.dataset.editorBlock)dirtyBlocks.add(root.dataset.editorBlock);commit();};
 const beforeInput=(event:Event)=>{const target=event.target as HTMLElement,root=target.closest<HTMLElement>('[data-editor-block]');if(pasting)event.preventDefault();if(!allowBold&&(event as InputEvent).inputType==='formatBold')event.preventDefault();if(root&&!canEdit(root.dataset.editorBab!)){event.preventDefault();root.contentEditable='false';}};
 const blur=()=>{clearTimeout(timer);timer=setTimeout(()=>void reflow(),150);};
 async function paste(event:ClipboardEvent){
  if(pasting){event.preventDefault();return;}
  const node=win.getSelection()?.anchorNode,element=node?.nodeType===1?node:node?.parentElement,root=element?.closest('[data-editor-block][contenteditable="true"]');if(!root)return;
  event.preventDefault();const html=event.clipboardData?.getData('text/html');const text=event.clipboardData?.getData('text/plain')||'';
  if([...event.clipboardData?.items||[]].some(item=>item.type.startsWith('image/'))){doc.querySelector('#error')!.textContent='Untuk menyisipkan gambar dengan caption, kembali ke editor lalu tempel gambar.';return;}
  const range=win.getSelection().getRangeAt(0).cloneRange(),plain=plainPaste;plainPaste=false;clearTimeout(timer);
  const status=doc.createElement('div');status.id='editor-paste-progress';status.setAttribute('role','status');status.textContent='Membersihkan format sumber: 0%';status.style.cssText='position:fixed;top:12px;left:12px;z-index:10;background:#eff6ff;color:#172554;padding:8px;border:1px solid #93c5fd';doc.body.append(status);
  pasting=true;lastRecord=0;attach();doc.querySelector('#pages')?.setAttribute('aria-busy','true');
  try{
   let cleaned='';if(html&&!plain){const holder=doc.createElement('div');holder.innerHTML=html;cleaned=await sanitizePasteAsync(holder,{allowBold},progress=>{status.textContent=`Membersihkan format sumber: ${progress}%`;});}
   if(disposed)return;
   if(!root.isConnected||!canEdit(root.dataset.editorBab))throw new Error('Lokasi paste tidak dapat disunting lagi. Salinan clipboard tetap tersedia; tempel ulang di bagian yang dapat disunting.');
   pasting=false;attach();root.focus();const selection=win.getSelection();selection.removeAllRanges();selection.addRange(range);
   doc.execCommand(html&&!plain?'insertHTML':'insertText',false,html&&!plain?cleaned:text);dirtyBlocks.add(root.dataset.editorBlock);commit();lastRecord=0;
  }catch(error){if(!disposed)doc.querySelector('#error')!.textContent=error instanceof Error?error.message:'Paste belum berhasil. Tempel ulang isi clipboard.';}
  finally{pasting=false;status.remove();doc.querySelector('#pages')?.removeAttribute('aria-busy');if(!disposed){attach();if(reflowAfterPaste){reflowAfterPaste=false;void reflow();}}}
 }
 const key=(event:KeyboardEvent)=>{if(event.ctrlKey||event.metaKey){if(event.key.toLowerCase()==='b'&&!allowBold){event.preventDefault();return;}if(event.key.toLowerCase()==='v')plainPaste=event.shiftKey;if(['z','y','s'].includes(event.key.toLowerCase())){event.preventDefault();if(event.key.toLowerCase()==='s'){commit();void reflow();}else void command(event.key.toLowerCase()==='z'&&!event.shiftKey?'undo':'redo');}}};
 async function command(name:string){
  if(pasting)return;
  clearTimeout(timer);lastRecord=0;
  if(name==='undo'||name==='redo'){commit();const next=cursor+(name==='undo'?-1:1);if(next>=0&&next<history.length){cursor=next;win.editorSource.innerHTML=history[cursor];onChange(changes());await reflow(false);}return;}
  doc.execCommand(name,false);commit();
 }
 attach();doc.addEventListener('beforeinput',beforeInput);doc.addEventListener('input',input);doc.addEventListener('focusout',blur);doc.addEventListener('paste',paste);doc.addEventListener('keydown',key);
 return {command,reflow,get pendingPaste(){return pasting;},dispose(){commit();disposed=true;clearTimeout(timer);doc.removeEventListener('beforeinput',beforeInput);doc.removeEventListener('input',input);doc.removeEventListener('focusout',blur);doc.removeEventListener('paste',paste);doc.removeEventListener('keydown',key);}};
}
