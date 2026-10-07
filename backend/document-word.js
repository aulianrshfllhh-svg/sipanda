import {parseHTML} from 'linkedom';
import {Document,Packer,Paragraph,TextRun,ImageRun,ExternalHyperlink,Table,TableRow,TableCell,Footer,WidthType,PageOrientation,AlignmentType,BorderStyle,TableLayoutType,VerticalAlign,LevelFormat,Bookmark,SimpleField,Tab,TabStopType,LeaderType,NumberFormat,PageNumber,HeadingLevel,HeightRule} from 'docx';
import JSZip from 'jszip';
import {DOMParser,XMLSerializer} from '@xmldom/xmldom';

// Native Word option retains editable text and tables. Fixed-layout export remains available.
export async function editableDocx(page,title,{annex=false}={}){
 const font='Bookman Old Style';
 const numbering=[];
 let tabWidth=8505;
 const svg=await page.$('.cover svg');const logo=svg?Buffer.from(await svg.screenshot({type:'png'})):null;
 const pages=await page.$$eval('.paper',nodes=>nodes.map(node=>{
  const tocRows=[...document.querySelectorAll('.toc-row[data-index-kind="toc"]')];
  tocRows[0]?.setAttribute('data-toc-start','true');
  tocRows.at(-1)?.setAttribute('data-toc-end','true');
  node.querySelectorAll('img').forEach(image=>{const bounds=image.getBoundingClientRect();image.dataset.docxWidth=String(Math.round(bounds.width)||image.width);image.dataset.docxHeight=String(Math.round(bounds.height)||image.height);if(image.src.startsWith('data:image/webp')){const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext('2d').drawImage(image,0,0);image.dataset.docxSrc=canvas.toDataURL('image/png');}});
  return {landscape:node.classList.contains('landscape'),f4:node.classList.contains('f4'),annex:node.classList.contains('annex'),part:node.dataset.part,number:node.dataset.number,html:node.querySelector('.page-body').innerHTML,footer:node.querySelector('footer').textContent,footerTitle:document.body.dataset.footer};
 }));
 const bookmarkName=anchor=>`sipanda_${String(anchor||'').replace(/[^A-Za-z0-9_]/g,'_').slice(0,32)}`;
 const pageNumberValue=item=>/^[ivxlcdm]+$/i.test(item.number||'')?item.number.toLowerCase().split('').reduce((total,char,index,array)=>{
  const values={i:1,v:5,x:10,l:50,c:100,d:500,m:1000},value=values[char],next=values[array[index+1]]||0;
  return total+(value<next?-value:value);
 },0):Number(item.number)||undefined;
 function runs(node,style={}){
  if(node.nodeType===3)return [new TextRun({text:node.textContent,font,...style})];
  const tag=node.nodeName;
  if(tag==='BR')return [new TextRun({break:1})];
  if(tag==='IMG'){
   const match=(node.dataset.docxSrc || node.getAttribute('src'))?.match(/^data:image\/(png|jpeg);base64,(.+)$/s);
   if(!match)return [new TextRun({text:node.getAttribute('alt')||'[Gambar]'})];
   return [new ImageRun({type:match[1]==='jpeg'?'jpg':'png',data:Buffer.from(match[2],'base64'),transformation:{width:Number(node.dataset.docxWidth)||240,height:Number(node.dataset.docxHeight)||180}})];
  }
  const next={...style,...(!annex&&['B','STRONG'].includes(tag)?{bold:true}:{}),...(['I','EM'].includes(tag)?{italics:true}:{}),...(tag==='U'?{underline:{}}:{}),...(tag==='SUP'?{superScript:true}:{}),...(tag==='SUB'?{subScript:true}:{})};
  if(tag==='A'&&/^https?:\/\//i.test(node.getAttribute('href')||''))return [new ExternalHyperlink({link:node.getAttribute('href'),children:[...node.childNodes].flatMap(child=>runs(child,next))})];
  return [...node.childNodes].flatMap(child=>runs(child,next));
 }
 function paragraph(node,extra={},width=8505){
  const tag=node.nodeName,center=/^H[12]$/.test(tag)||node.classList?.contains('doc-caption'),align=node.getAttribute?.('style')?.match(/text-align:\s*(left|center|right|justify)/)?.[1],openingOrClosing=!!node.parentElement?.closest('.opening-block,.closing-block');
  const figure=node.closest?.('.doc-figure'),figureAlign=figure?(figure.classList.contains('doc-image-left')?AlignmentType.LEFT:figure.classList.contains('doc-image-right')?AlignmentType.RIGHT:AlignmentType.CENTER):null;
  const options={alignment:center?AlignmentType.CENTER:align||figureAlign|| (openingOrClosing?AlignmentType.LEFT:AlignmentType.JUSTIFIED),spacing:{after:120,line:300},keepNext:/^H[123]$/.test(tag)||!figure&&node.classList?.contains('doc-caption')||!!figure&&tag==='IMG',...(annex&&tag==='P'&&!node.classList?.contains('doc-caption')&&!openingOrClosing?{indent:{firstLine:567}}:{}),...extra};
  if(node.classList?.contains('toc-row')){
   const spans=[...node.children],level=Number(node.className.match(/\blevel-(\d+)\b/)?.[1])||1,indent=level===2?425:level===3?850:0,pageRef=spans.at(-1)?.getAttribute('data-page-ref')||'';
   const children=[];
   if(node.hasAttribute('data-toc-start'))children.push(new TextRun('SIPANDA_TOC_FIELD_BEGIN'));
   children.push(new TextRun({text:spans[0]?.textContent||'',size:24}),new TextRun({children:[new Tab()]}),new SimpleField(` PAGEREF ${bookmarkName(pageRef)} \\h `,spans.at(-1)?.textContent||''));
   if(node.hasAttribute('data-toc-end'))children.push(new TextRun('SIPANDA_TOC_FIELD_END'));
   return new Paragraph({...options,alignment:AlignmentType.LEFT,spacing:{after:60,line:240},indent:indent?{left:indent}:undefined,tabStops:[{type:TabStopType.RIGHT,position:Math.max(1,tabWidth-indent),leader:LeaderType.DOT}],children});
  }
  const level=Number(node.getAttribute?.('data-toc-level'))||0,heading=({1:HeadingLevel.HEADING_1,2:HeadingLevel.HEADING_2,3:HeadingLevel.HEADING_3})[level];
  const content=runs(node,{size:annex?24:tag==='H1'?36:tag==='H2'?28:24,bold:!annex&&/^H[123]$/.test(tag),italics:!annex&&node.classList?.contains('doc-caption')});
  const anchor=node.getAttribute?.('data-anchor');
  return new Paragraph({...options,...(heading?{heading}:{}),children:anchor?[new Bookmark({id:bookmarkName(anchor),children:content})]:content});
 }
 function coverParagraphs(root,size,width){
  const result=[];
  for(const node of root.children){
   const alignment={left:AlignmentType.LEFT,right:AlignmentType.RIGHT,center:AlignmentType.CENTER,justify:AlignmentType.JUSTIFIED}[node.style?.textAlign||root.style?.textAlign]||AlignmentType.CENTER;
   if(node.nodeName==='IMG'){result.push(new Paragraph({alignment,spacing:{before:0,after:160,line:240},children:runs(node)}));continue;}
   const pointSize=Number(node.style?.fontSize?.match(/[\d.]+/)?.[0])||size;
   const lineHeight=Number(node.style?.lineHeight)||1.15;
   const weight=node.style?.fontWeight;
   result.push(new Paragraph({alignment,spacing:{before:0,after:0,line:Math.round(lineHeight*240)},children:runs(node,{size:Math.round(pointSize*2),bold:weight==='normal'?false:weight==='bold'||Number(weight)>=600||!weight})}));
  }
  return result;
 }
 function coverTable(node){
  const noBorder={style:BorderStyle.NIL,size:0,color:'FFFFFF'},borders={top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder};
  const layout=node.querySelector('.cover-layout'),zones=['.cover-top','.cover-middle','.cover-bottom'].map(selector=>layout?.querySelector(selector));
  const rowHeights=[4200,8000,4241],vertical=[VerticalAlign.TOP,VerticalAlign.CENTER,VerticalAlign.BOTTOM],sizes=[14,Number(layout?.querySelector('.cover-title')?.style.fontSize.replace('pt',''))||18,12];
  return new Table({width:{size:9921,type:WidthType.DXA},columnWidths:[9921],layout:TableLayoutType.FIXED,borders,margins:{top:0,bottom:0,left:0,right:0},rows:zones.map((zone,index)=>new TableRow({cantSplit:true,height:{value:rowHeights[index],rule:HeightRule.EXACT},children:[new TableCell({width:{size:9921,type:WidthType.DXA},verticalAlign:vertical[index],margins:{top:0,bottom:0,left:0,right:0},borders,children:zone?coverParagraphs(zone,sizes[index],9921):[new Paragraph('')]})]}))});
 }
 function blocks(root,width){
  const result=[];
  for(const node of root.childNodes){
   if(node.nodeType===3){if(node.textContent.trim())result.push(paragraph(node));continue;}
   if(annex&&node.nodeName==='P'&&node.nextElementSibling?.classList?.contains('closing-block')){result.push(paragraph(node,{keepNext:true,keepLines:true}));continue;}
   if(node.nodeName==='SVG'){if(logo)result.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:240},children:[new ImageRun({type:'png',data:logo,transformation:{width:96,height:116}})]}));continue;}
   if(node.nodeName==='TABLE'){
    const rows=[...node.querySelectorAll('tr')];
    if(!rows.length)continue;
    const count=Math.max(...rows.map(row=>[...row.children].reduce((sum,cell)=>sum+Number(cell.getAttribute('colspan')||1),0)));
    const percentages=[...node.querySelectorAll('col')].map(col=>Number(col.getAttribute('style')?.match(/[\d.]+/)?.[0]));
    const widths=Array.from({length:count},(_,i)=>Math.floor(width*(percentages[i]||100/count)/100));
    result.push(new Table({width:{size:width,type:WidthType.DXA},columnWidths:widths,layout:TableLayoutType.AUTOFIT,rows:rows.map(row=>{
     let index=0;return new TableRow({tableHeader:row.parentNode.nodeName==='THEAD'&&!node.classList.contains('table-no-repeat'),cantSplit:!node.classList.contains('table-allow-split'),children:[...row.children].map(cell=>{
      const span=Number(cell.getAttribute('colspan')||1),cellWidth=widths.slice(index,index+span).reduce((a,b)=>a+b,0);index+=span;
      const header=cell.nodeName==='TH',bold=!annex&&(header||row.classList?.contains('aggregate'));
      const align=cell.style.textAlign|| (header?AlignmentType.CENTER:AlignmentType.LEFT),vertical={top:VerticalAlign.TOP,middle:VerticalAlign.CENTER,bottom:VerticalAlign.BOTTOM}[cell.style.verticalAlign];
      return new TableCell({columnSpan:span,rowSpan:Number(cell.getAttribute('rowspan')||1),verticalAlign:vertical,width:{size:cellWidth,type:WidthType.DXA},shading:header?{fill:'EEEEEE'}:undefined,margins:{top:60,bottom:60,left:60,right:60},children:[new Paragraph({alignment:align,spacing:{after:0,line:220},children:runs(cell,{size:annex?24:20,bold})})]});
     })});
    })}));continue;
   }
   if(node.hasAttribute?.('data-cover-layout')||node.classList?.contains('cover-layout')){
    result.push(coverTable(node.parentElement||node));continue;
   }
   if(node.classList?.contains('cover')){
    const items=blocks(node,width);result.push(...items);continue;
   }
   if(['UL','OL'].includes(node.nodeName)){
    const reference=`list-${numbering.length}`,type=node.getAttribute('type')||'1';
    const format=node.nodeName==='UL'?LevelFormat.BULLET:type==='a'?LevelFormat.LOWER_LETTER:type==='i'?LevelFormat.LOWER_ROMAN:LevelFormat.DECIMAL;
    const continuation=node.firstElementChild?.classList.contains('list-continuation');
    const depth=Math.min(2,Number(node.dataset.docxListDepth)||0);
    numbering.push({reference,levels:[{level:0,format,text:node.nodeName==='UL'?'•':node.classList.contains('list-parenthesis')?'%1)':'%1.',start:Math.max(1,Number(node.getAttribute('start'))||1)+(continuation?1:0),alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:567*(depth+1),hanging:284}},run:{font}}}]});
    for(const item of node.children){const text=item.cloneNode(true);text.querySelectorAll('ol,ul').forEach(list=>list.remove());result.push(paragraph(text,item.classList.contains('list-continuation')?{indent:{left:567*(depth+1)}}:{numbering:{reference,level:0}}));for(const nested of item.children)if(['OL','UL'].includes(nested.nodeName)){nested.dataset.docxListDepth=String(depth+1);result.push(...blocks({childNodes:[nested]},width));}}
    continue;
   }
   if(['DIV','BLOCKQUOTE'].includes(node.nodeName)){
    if(annex&&node.classList?.contains('closing-block')){
     const children=[...node.children];
     children.forEach((child,index)=>result.push(paragraph(child,{keepNext:index<children.length-1,keepLines:true})));
     continue;
    }
    const nested=blocks(node,width);
    if(node.classList?.contains('signature')){
     result.push(new Paragraph({text:'',spacing:{after:240}}));
     for(const child of node.children)result.push(paragraph(child,{alignment:AlignmentType.RIGHT,spacing:{before:child.classList?.contains('sign-space')?700:0,after:80,line:240}}));
    }else result.push(...nested);
   }else result.push(paragraph(node,{},width));
  }
  return result;
 }
 const sections=pages.map(item=>{
  const document=parseHTML(`<html><body>${item.html}</body></html>`).document;
  const margin={top:1134,bottom:1134,left:1134,right:1134};
  const pageSize=item.f4?{width:12189,height:18709}:{width:11906,height:16838};
  const width=item.landscape?(item.f4?16441:14570):(item.f4?9921:8505);
  tabWidth=item.landscape?(item.f4?16441:14570):(item.f4?9921:9638);
  const pageNumber=pageNumberValue(item),formatType=item.part==='front'?NumberFormat.LOWER_ROMAN:NumberFormat.DECIMAL;
  const footer=!item.annex&&pageNumber!==undefined?new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,border:{top:{style:BorderStyle.SINGLE,size:4}},children:[...(item.part==='front'?[]:[new TextRun({text:item.footerTitle||item.footer,size:18}),new TextRun({text:'     |     ',size:18})]),PageNumber.CURRENT]})]}):null;
  return {properties:{page:{size:{...pageSize,orientation:item.landscape?PageOrientation.LANDSCAPE:PageOrientation.PORTRAIT},margin,...(pageNumber!==undefined?{pageNumbers:{start:pageNumber,formatType}}:{})}},...(footer?{footers:{default:footer}}:{}),children:blocks(document.body,width)};
 });
 const buffer=await Packer.toBuffer(new Document({title,creator:'SIPANDA',description:'Dokumen Word dapat disunting; tata letak dapat menyesuaikan aplikasi Word.',features:{updateFields:false},numbering:{config:numbering},styles:{default:{document:{run:{font,size:24}}}},sections}));
 return addTableOfContentsField(buffer);
}

const wordNamespace='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function fieldRun(document,childName,text,attributes={}){
 const run=document.createElementNS(wordNamespace,'w:r'),child=document.createElementNS(wordNamespace,`w:${childName}`);
 for(const [name,value] of Object.entries(attributes))child.setAttributeNS(wordNamespace,`w:${name}`,value);
 if(text!==undefined)child.appendChild(document.createTextNode(text));
 run.appendChild(child);return run;
}
function replaceFieldMarker(document,marker,replacements){
 const nodes=document.getElementsByTagNameNS(wordNamespace,'t');
 for(let index=0;index<nodes.length;index++){
  const text=nodes[index];if(text.textContent!==marker)continue;
  const run=text.parentNode,parent=run.parentNode;
  for(const replacement of replacements)parent.insertBefore(replacement,run);
  parent.removeChild(run);return true;
 }
 return false;
}
async function addTableOfContentsField(buffer){
 const zip=await JSZip.loadAsync(buffer),entry=zip.file('word/document.xml');
 if(!entry)return buffer;
 const document=new DOMParser().parseFromString(await entry.async('string'),'application/xml');
 const begin=[fieldRun(document,'fldChar',undefined,{fldCharType:'begin'}),fieldRun(document,'instrText',' TOC \\o "1-3" \\h \\z \\u ',{})];
 begin[1].firstChild.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');
 begin.push(fieldRun(document,'fldChar',undefined,{fldCharType:'separate'}));
 const foundBegin=replaceFieldMarker(document,'SIPANDA_TOC_FIELD_BEGIN',begin);
 const foundEnd=replaceFieldMarker(document,'SIPANDA_TOC_FIELD_END',[fieldRun(document,'fldChar',undefined,{fldCharType:'end'})]);
 if(!foundBegin||!foundEnd)throw new Error('Penanda field Daftar Isi tidak ditemukan pada DOCX editable.');
 zip.file('word/document.xml',new XMLSerializer().serializeToString(document));
 return zip.generateAsync({type:'nodebuffer'});
}
