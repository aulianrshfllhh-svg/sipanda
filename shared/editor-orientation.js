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
