export function editableContentNodes(root) {
 const nodes=[];
 function visit(node) {
  if(node.classList.contains('doc-section-break'))return;
  if(node.classList.contains('doc-section')||[...node.classList].some(name=>name.startsWith('paste-'))){
   for(const child of node.children)visit(child);
   return;
  }
  nodes.push(node);
 }
 for(const child of root.children)visit(child);
 return nodes;
}

/** Normalize legacy subsection orientation wrappers without discarding mixed content. */
export function normalizeSubsectionOrientation(subsection, parseHtml) {
 const sub={...subsection,orientation:subsection?.orientation==='landscape'?'landscape':'portrait',pageBreakBefore:subsection?.pageBreakBefore===true};
 if(typeof sub.content!=='string'||!parseHtml)return {subsection:sub,mixedLegacy:false,migrated:false};
 const root=parseHtml(sub.content);
 const children=[...root.children].filter(node=>node.nodeType===1);
 const meaningful=children.filter(node=>node.tagName!=='BR');
 if(meaningful.length===1&&meaningful[0].classList.contains('doc-section')){
  const wrapper=meaningful[0],landscape=wrapper.classList.contains('doc-section-landscape');
  const mixedInside=wrapper.querySelector('.doc-section-break,.doc-section-portrait');
  if((landscape||wrapper.classList.contains('doc-section-portrait'))&&!mixedInside){
   sub.orientation=landscape?'landscape':'portrait';
   sub.content=wrapper.innerHTML;
   return {subsection:sub,mixedLegacy:false,migrated:true};
  }
 }
 const wrappers=[...root.querySelectorAll('.doc-section-landscape,.doc-section-portrait,.doc-section-break')];
 const mixedLegacy=wrappers.length>0&&(wrappers.some(node=>node.classList.contains('doc-section-break'))||new Set(wrappers.map(node=>node.dataset.orientation|| (node.classList.contains('doc-section-landscape')?'landscape':'portrait'))).size>1||meaningful.some(node=>!node.matches('.doc-section-landscape,.doc-section-portrait')));
 return {subsection:sub,mixedLegacy,migrated:false};
}
