export function compareDocumentVersions(left,right){
 const flatten=value=>(value.sections||value||[]).flatMap(b=>(b.subsections||[]).map(s=>({babId:b.babId||b.id,babTitle:b.babTitle||b.title,...s})));
 const old=new Map(flatten(left).map(s=>[s.id,s])),fresh=new Map(flatten(right).map(s=>[s.id,s]));
 const result=[...new Set([...old.keys(),...fresh.keys()])].map(id=>{const before=old.get(id),after=fresh.get(id);return {id,babId:(after||before).babId,title:`${(after||before).code||''} ${(after||before).title}`,status:!before?'added':!after?'removed':JSON.stringify([before.content,before.tables])===JSON.stringify([after.content,after.tables])?'unchanged':'changed',before:before||null,after:after||null};});
 if(JSON.stringify(left.frontMatter)!==JSON.stringify(right.frontMatter))result.unshift({id:'front-matter',title:'Kata pengantar',status:'changed',before:{content:left.frontMatter?.preface||''},after:{content:right.frontMatter?.preface||''}});
 if(left.sourceArchive?.sha256!==right.sourceArchive?.sha256)result.unshift({id:'source-file',title:'Berkas sumber',status:'changed',before:{content:left.sourceArchive?.name||''},after:{content:right.sourceArchive?.name||''}});
 return result;
}
