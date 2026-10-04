import {parseHTML} from 'linkedom';
import {Document,Packer,Paragraph,TextRun,ImageRun,Table,TableRow,TableCell,Footer,WidthType,PageOrientation,AlignmentType,BorderStyle,TableLayoutType} from 'docx';

// Native Word option retains editable text and tables. Fixed-layout export remains available.
export async function editableDocx(page,title,{annex=false}={}){
 const font=annex?'Bookman Old Style':'Times New Roman';
 const svg=await page.$('.cover svg');const logo=svg?Buffer.from(await svg.screenshot({type:'png'})):null;
 const pages=await page.$$eval('.paper',nodes=>nodes.map(node=>{
  node.querySelectorAll('img').forEach(image=>{image.dataset.docxWidth=String(image.width);image.dataset.docxHeight=String(image.height);if(image.src.startsWith('data:image/webp')){const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext('2d').drawImage(image,0,0);image.dataset.docxSrc=canvas.toDataURL('image/png');}});
  return {landscape:node.classList.contains('landscape'),f4:node.classList.contains('f4'),annex:node.classList.contains('annex'),html:node.querySelector('.page-body').innerHTML,footer:node.querySelector('footer').textContent};
 }));
 function runs(node,style={}){
  if(node.nodeType===3)return [new TextRun({text:node.textContent,font,...style})];
  const tag=node.nodeName;
  if(tag==='BR')return [new TextRun({break:1})];
  if(tag==='IMG'){
   const match=(node.dataset.docxSrc || node.getAttribute('src'))?.match(/^data:image\/(png|jpeg);base64,(.+)$/s);
   if(!match)return [new TextRun({text:node.getAttribute('alt')||'[Gambar]'})];
   return [new ImageRun({type:match[1]==='jpeg'?'jpg':'png',data:Buffer.from(match[2],'base64'),transformation:{width:Number(node.dataset.docxWidth)||240,height:Number(node.dataset.docxHeight)||180}})];
  }
  const next={...style,...(!annex&&['B','STRONG'].includes(tag)?{bold:true}:{}),...(['I','EM'].includes(tag)?{italics:true}:{}),...(tag==='U'?{underline:{}}:{})};
  return [...node.childNodes].flatMap(child=>runs(child,next));
 }
 function paragraph(node,extra={}){
  const tag=node.nodeName,center=/^H[12]$/.test(tag)||node.classList?.contains('doc-caption'),align=node.getAttribute?.('style')?.match(/text-align:\s*(left|center|right|justify)/)?.[1],openingOrClosing=!!node.parentElement?.closest('.opening-block,.closing-block');
  const options={alignment:center?AlignmentType.CENTER:align|| (openingOrClosing?AlignmentType.LEFT:AlignmentType.JUSTIFIED),spacing:{after:120,line:300},keepNext:/^H[123]$/.test(tag)||node.classList?.contains('doc-caption'),...(annex&&tag==='P'&&!node.classList?.contains('doc-caption')&&!openingOrClosing?{indent:{firstLine:567}}:{}),...extra};
  if(node.classList?.contains('toc-row')){
   const spans=[...node.children];return new Paragraph({...options,children:[new TextRun({text:spans[0]?.textContent||'',size:22}),new TextRun({text:'  . . . . . . . . . . . . . . . .  ',size:22}),new TextRun({text:spans.at(-1)?.textContent||'',size:22})]});
  }
  return new Paragraph({...options,children:runs(node,{size:annex?24:tag==='H1'?36:tag==='H2'?28:24,bold:!annex&&/^H[123]$/.test(tag),italics:!annex&&node.classList?.contains('doc-caption')})});
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
     let index=0;return new TableRow({tableHeader:row.parentNode.nodeName==='THEAD',cantSplit:true,children:[...row.children].map(cell=>{
      const span=Number(cell.getAttribute('colspan')||1),cellWidth=widths.slice(index,index+span).reduce((a,b)=>a+b,0);index+=span;
      const header=cell.nodeName==='TH',bold=!annex&&(header||row.classList?.contains('aggregate'));
      return new TableCell({columnSpan:span,rowSpan:Number(cell.getAttribute('rowspan')||1),width:{size:cellWidth,type:WidthType.DXA},shading:header?{fill:'EEEEEE'}:undefined,margins:{top:60,bottom:60,left:60,right:60},children:[new Paragraph({alignment:header?AlignmentType.CENTER:AlignmentType.LEFT,spacing:{after:0,line:220},children:runs(cell,{size:annex?24:18,bold})})]});
     })});
    })}));continue;
   }
   if(node.classList?.contains('cover')){
    const items=blocks(node,width);result.push(...items);continue;
   }
   if(['DIV','UL','OL','BLOCKQUOTE'].includes(node.nodeName)){
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
   }else result.push(paragraph(node));
  }
  return result;
 }
 const sections=pages.map(item=>{
  const document=parseHTML(`<html><body>${item.html}</body></html>`).document;
  const margin={top:1134,bottom:1134,left:1134,right:1134};
  const pageSize=item.f4?{width:12189,height:18709}:{width:11906,height:16838};
  const width=item.landscape?(item.f4?16441:14570):(item.f4?9921:8505);
  return {properties:{page:{size:{...pageSize,orientation:item.landscape?PageOrientation.LANDSCAPE:PageOrientation.PORTRAIT},margin}},...(!item.annex?{footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,border:{top:{style:BorderStyle.SINGLE,size:4}},children:[new TextRun({text:item.footer,size:18})]})]})}}:{}),children:blocks(document.body,width)};
 });
 return Packer.toBuffer(new Document({title,creator:'SIPANDA',description:'Dokumen Word dapat disunting; tata letak dapat menyesuaikan aplikasi Word.',styles:{default:{document:{run:{font,size:24}}}},sections}));
}
