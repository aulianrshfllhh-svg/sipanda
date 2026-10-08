// Search ranges are kept outside the document HTML, so highlights never enter autosave.
export function findTextRanges(root: HTMLElement, query: string): Range[] {
  if (!query) return [];
  const ranges: Range[] = [];
  for (const block of root.querySelectorAll<HTMLElement>('.ProseMirror')) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const nodes: Array<{ node: Text; start: number }> = [];
    let text = '', node: Node | null;
    while ((node = walker.nextNode())) {
      nodes.push({ node: node as Text, start: text.length });
      text += node.textContent || '';
    }
    const source = text.toLocaleLowerCase('id-ID'), needle = query.toLocaleLowerCase('id-ID');
    for (let offset = source.indexOf(needle); offset >= 0; offset = source.indexOf(needle, offset + needle.length)) {
      const first = nodes.find(item => offset >= item.start && offset < item.start + item.node.length);
      const end = offset + needle.length;
      const last = nodes.find(item => end > item.start && end <= item.start + item.node.length);
      if (!first || !last) continue;
      const range = document.createRange();
      range.setStart(first.node, offset - first.start);
      range.setEnd(last.node, end - last.start);
      ranges.push(range);
    }
  }
  return ranges;
}

export function showSearchHighlights(ranges: Range[], active?: Range) {
  const host = window as unknown as { Highlight?: new (...ranges: Range[]) => unknown };
  const registry = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
  if (!host.Highlight || !registry) return;
  registry.set('editor-search', new host.Highlight(...ranges));
  registry.set('editor-search-active', new host.Highlight(...(active ? [active] : [])));
}

export function clearSearchHighlights() {
  const registry = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
  registry?.delete('editor-search');
  registry?.delete('editor-search-active');
}

export function selectionEditor(): HTMLElement | null {
  const selection = window.getSelection();
  if (!selection?.anchorNode || !selection.focusNode) return null;
  const element = selection.anchorNode instanceof HTMLElement ? selection.anchorNode : selection.anchorNode.parentElement;
  const root = element?.closest<HTMLElement>('.ProseMirror[contenteditable="true"]');
  return root?.contains(selection.focusNode) ? root : null;
}
