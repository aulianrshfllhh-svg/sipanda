export function tableGrid(table) {
  const rows = [...table.querySelectorAll('tr')].filter(row => row.closest('table') === table);
  const grid = [], cells = [], errors = [];
  rows.forEach((row, r) => {
    grid[r] ||= []; let c = 0;
    for (const node of [...row.children].filter(node => ['TD','TH'].includes(node.tagName))) {
      while (grid[r][c]) c++;
      const rs = Math.max(1, Number(node.getAttribute('rowspan')) || 1), cs = Math.max(1, Number(node.getAttribute('colspan')) || 1);
      const cell = { node, r, c, rs: Math.min(rs, rows.length - r), cs };
      if (rs > rows.length - r) errors.push('Sel gabungan melewati baris terakhir');
      cells.push(cell);
      for (let y = r; y < r + cell.rs; y++) {
        grid[y] ||= [];
        for (let x = c; x < c + cs; x++) { if (grid[y][x]) errors.push('Sel gabungan bertumpuk'); grid[y][x] = cell; }
      }
      c += cs;
    }
  });
  const width = Math.max(0, ...grid.map(row => row.length));
  if (grid.some(row => Array.from({ length: width }, (_, i) => row[i]).some(cell => !cell))) errors.push('Ada celah pada susunan sel');
  return { grid, cells, height: rows.length, width, errors, headerRows: rows.filter(row => row.parentNode.tagName === 'THEAD').length };
}

function rebuild(table, model) {
  const doc = table.ownerDocument;
  for (const section of [...table.children]) if (['THEAD','TBODY','TFOOT'].includes(section.tagName)) section.remove();
  for (const row of [...table.children]) if (row.tagName === 'TR') row.remove();
  const head = doc.createElement('thead'), body = doc.createElement('tbody');
  for (let r = 0; r < model.height; r++) {
    const row = doc.createElement('tr');
    for (const cell of model.cells.filter(cell => cell.r === r).sort((a,b) => a.c - b.c)) {
      cell.node.removeAttribute('rowspan'); cell.node.removeAttribute('colspan');
      if (cell.rs > 1) cell.node.setAttribute('rowspan', String(cell.rs));
      if (cell.cs > 1) cell.node.setAttribute('colspan', String(cell.cs));
      row.append(cell.node);
    }
    (r < model.headerRows ? head : body).append(row);
  }
  if (head.children.length) table.append(head);
  table.append(body);
  return table;
}

export function editTable(table, action, { row = 0, column = 0, selected = [], value = '' } = {}) {
  const model = tableGrid(table);
  if (model.errors.length && !['tidy','fit','auto','repeat','no-split'].includes(action)) throw new Error('Perbaiki sel gabungan yang rusak sebelum mengubah susunan tabel.');
  const current = model.grid[row]?.[column];
  const create = (r,c) => ({ node: table.ownerDocument.createElement(r < model.headerRows ? 'th' : 'td'), r, c, rs:1, cs:1 });
  if (action === 'row-add') {
    const index = row + 1;
    for (const cell of model.cells) { if (cell.r >= index) cell.r++; else if (cell.r + cell.rs > index) cell.rs++; }
    for (let c = 0; c < model.width; c++) if (!model.cells.some(cell => cell.r <= index && cell.r + cell.rs > index && cell.c <= c && cell.c + cell.cs > c)) model.cells.push(create(index,c));
    model.height++; if (index < model.headerRows) model.headerRows++;
  } else if (action === 'column-add') {
    const index = column + 1;
    for (const cell of model.cells) { if (cell.c >= index) cell.c++; else if (cell.c + cell.cs > index) cell.cs++; }
    for (let r = 0; r < model.height; r++) if (!model.cells.some(cell => cell.r <= r && cell.r + cell.rs > r && cell.c <= index && cell.c + cell.cs > index)) model.cells.push(create(r,index));
    model.width++; table.querySelector('colgroup')?.remove();
  } else if (action === 'row-delete' || action === 'column-delete') {
    const vertical = action === 'row-delete', axis = vertical ? 'r' : 'c', span = vertical ? 'rs' : 'cs', index = vertical ? row : column;
    if ((vertical ? model.height : model.width) <= 1) throw new Error('Tabel harus memiliki sedikitnya satu baris dan satu kolom.');
    model.cells = model.cells.filter(cell => {
      if (cell[axis] === index && cell[span] === 1) return false;
      if (cell[axis] > index) cell[axis]--;
      else if (cell[axis] <= index && cell[axis] + cell[span] > index) cell[span]--;
      return true;
    });
    if (vertical) { model.height--; if (row < model.headerRows) model.headerRows--; }
    else { model.width--; table.querySelector('colgroup')?.remove(); }
  } else if (action === 'split' && current) {
    const { r,c,rs,cs } = current; current.rs = 1; current.cs = 1;
    for (let y=r;y<r+rs;y++) for(let x=c;x<c+cs;x++) if(y!==r||x!==c)model.cells.push(create(y,x));
  } else if (action === 'merge') {
    const chosen = selected.map(index => model.cells[index]).filter(Boolean);
    if (chosen.length < 2) throw new Error('Sorot isi beberapa sel yang bersebelahan untuk digabung.');
    const top=Math.min(...chosen.map(cell=>cell.r)),left=Math.min(...chosen.map(cell=>cell.c)),bottom=Math.max(...chosen.map(cell=>cell.r+cell.rs)),right=Math.max(...chosen.map(cell=>cell.c+cell.cs));
    const within=model.cells.filter(cell=>cell.r<bottom&&cell.r+cell.rs>top&&cell.c<right&&cell.c+cell.cs>left);
    if(within.some(cell=>cell.r<top||cell.c<left||cell.r+cell.rs>bottom||cell.c+cell.cs>right)||within.some(cell=>!chosen.includes(cell)))throw new Error('Pilih semua sel dalam satu persegi panjang.');
    if(top<model.headerRows&&bottom>model.headerRows)throw new Error('Sel judul dan isi tidak dapat digabung.');
    const first=within.sort((a,b)=>a.r-b.r||a.c-b.c)[0];
    for(const cell of within.slice(1)){if(first.node.textContent.trim()&&cell.node.textContent.trim())first.node.append(table.ownerDocument.createElement('br'));first.node.append(...cell.node.childNodes);}
    first.rs=bottom-top;first.cs=right-left;model.cells=model.cells.filter(cell=>!within.includes(cell)||cell===first);
  } else if (action === 'transpose') {
    for(const cell of model.cells){[cell.r,cell.c]=[cell.c,cell.r];[cell.rs,cell.cs]=[cell.cs,cell.rs];}
    [model.height,model.width]=[model.width,model.height];model.headerRows=1;table.querySelector('colgroup')?.remove();
  } else if (action === 'align' || action === 'vertical') {
    const chosen=selected.length?selected.map(index=>model.cells[index]).filter(Boolean):current?[current]:[];
    const accepted=action==='align'?['left','center','right']:['top','middle','bottom'];
    if(!accepted.includes(value))return table;
    for(const cell of chosen)cell.node.style[action==='align'?'textAlign':'verticalAlign']=value;
  } else if (action === 'repeat') table.classList.toggle('table-no-repeat');
  else if (action === 'no-split') table.classList.toggle('table-allow-split');
  else if (action === 'fit' || action === 'auto') {
    table.removeAttribute('style');table.style.width='100%';table.style.tableLayout=action==='fit'?'fixed':'auto';
    table.querySelector('colgroup')?.remove();
  } else if (action === 'width') {
    const percent=Number(value);if(!Number.isFinite(percent)||percent<2||percent>95)throw new Error('Lebar kolom harus 2 sampai 95 persen.');
    const existing=[...table.querySelectorAll('col')];let widths=Array.from({length:model.width},(_,i)=>Number(existing[i]?.style.width?.replace('%',''))||100/model.width);
    const rest=widths.reduce((sum,width,i)=>sum+(i===column?0:width),0);
    widths=widths.map((width,i)=>i===column?percent:(100-percent)*width/rest);
    table.querySelector('colgroup')?.remove();const group=table.ownerDocument.createElement('colgroup');
    widths.forEach(width=>{const col=table.ownerDocument.createElement('col');col.style.width=`${width}%`;group.append(col);});table.prepend(group);table.style.tableLayout='fixed';
  } else if (action === 'total') {
    for(let c=0;c<model.width;c++){
      const cell=table.ownerDocument.createElement('td');
      const values=model.cells.filter(item=>item.c===c&&item.r>=model.headerRows&&item.cs===1).map(item=>parseIndonesianNumber(item.node.textContent));
      cell.textContent=c===0?'JUMLAH':values.length&&values.every(value=>value!==null)?new Intl.NumberFormat('id-ID',{maximumFractionDigits:10}).format(values.reduce((sum,value)=>sum+value,0)):'';
      model.cells.push({node:cell,r:model.height,c,rs:1,cs:1});
    }
    model.height++;
  }
  return rebuild(table,model);
}

export function parseIndonesianNumber(text) {
  const cleaned=text.trim().replace(/\u00a0/g,' ');
  if(!/^-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(cleaned))return null;
  const value=Number(cleaned.replace(/\./g,'').replace(',','.'));return Number.isFinite(value)?value:null;
}

export function tidyTable(table) {
  let changes=0;
  const model=tableGrid(table), warnings=[...new Set(model.errors)];
  for(const element of [table,...table.querySelectorAll('*')]){
    for(const attribute of ['style','color','face','size','bgcolor'])if(element.hasAttribute(attribute)){element.removeAttribute(attribute);changes++;}
  }
  for(const cell of model.cells){
    const walk=node=>{for(const child of node.childNodes){if(child.nodeType===3){const before=child.textContent;child.textContent=before.replace(/[\u200b-\u200d\ufeff]/g,'').replace(/[\t\u00a0 ]+/g,' ');if(before!==child.textContent)changes++;}else walk(child);}};walk(cell.node);
    if(warnings.length)cell.node.classList.add('table-cell-warning');
  }
  // Delete empty axes only when the merge grid is valid, avoiding speculative repairs.
  if(!warnings.length){
    for(let r=model.height-1;r>=0;r--)if(tableGrid(table).grid[r].every(cell=>!cell.node.textContent.trim()&&!cell.node.querySelector('img'))&&model.height>1){editTable(table,'row-delete',{row:r});model.height--;changes++;}
    for(let c=tableGrid(table).width-1;c>=0;c--){const live=tableGrid(table);if(live.width>1&&live.grid.every(row=>!row[c].node.textContent.trim()&&!row[c].node.querySelector('img'))){editTable(table,'column-delete',{column:c});changes++;}}
  }
  const live=tableGrid(table);
  if(!live.headerRows&&live.height){
    live.headerRows=1;
    // A header spanning several rows must carry the complete merged group into THEAD.
    for(let r=0;r<live.headerRows;r++)for(const cell of live.cells.filter(cell=>cell.r===r))live.headerRows=Math.max(live.headerRows,cell.r+cell.rs);
    rebuild(table,live);changes++;
  }
  for(let c=0;c<live.width;c++){
    const cells=live.cells.filter(cell=>cell.c===c&&cell.r>=live.headerRows&&cell.cs===1);
    const numeric=cells.filter(cell=>cell.node.textContent.trim()&&!/^\(\d+\)$/.test(cell.node.textContent.trim()));
    if(numeric.length&&numeric.every(cell=>parseIndonesianNumber(cell.node.textContent)!==null))for(const cell of numeric){const before=cell.node.textContent;const formatted=new Intl.NumberFormat('id-ID',{maximumFractionDigits:10}).format(parseIndonesianNumber(before));if(before!==formatted){cell.node.textContent=formatted;changes++;}cell.node.style.textAlign='right';}
  }
  for(const cell of live.cells)if(/^\(\d+\)$/.test(cell.node.textContent.trim()))cell.node.style.textAlign='center';
  table.classList.remove('table-no-repeat','table-allow-split');
  editTable(table,'fit');
  const weights=Array.from({length:live.width},(_,c)=>Math.min(40,Math.max(6,...live.cells.filter(cell=>cell.c===c).map(cell=>cell.node.textContent.length/cell.cs))));
  const group=table.ownerDocument.createElement('colgroup'),total=weights.reduce((sum,n)=>sum+n,0);
  weights.forEach(weight=>{const col=table.ownerDocument.createElement('col');col.style.width=`${weight/total*100}%`;group.append(col);});table.prepend(group);
  return { changes:changes+1, warnings };
}
