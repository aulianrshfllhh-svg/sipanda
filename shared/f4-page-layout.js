export const F4_PAGE_LAYOUT = Object.freeze({
  marginMm: 20,
  portrait: Object.freeze({ widthMm: 215, heightMm: 330, contentWidthMm: 175, contentHeightMm: 290, widthPx: 812, heightPx: 1247 }),
  landscape: Object.freeze({ widthMm: 330, heightMm: 215, contentWidthMm: 290, contentHeightMm: 175, widthPx: 1247, heightPx: 812 })
});

const { marginMm, portrait, landscape } = F4_PAGE_LAYOUT;

export const F4_PAGE_CSS = `
 :root{--f4-margin:${marginMm}mm;--f4-portrait-width:${portrait.widthMm}mm;--f4-portrait-height:${portrait.heightMm}mm;--f4-portrait-content-height:${portrait.contentHeightMm}mm;--f4-landscape-width:${landscape.widthMm}mm;--f4-landscape-height:${landscape.heightMm}mm;--f4-landscape-content-height:${landscape.contentHeightMm}mm}
 .paper.f4{width:var(--f4-portrait-width);height:var(--f4-portrait-height);padding:var(--f4-margin);page:f4-portrait}
 .paper.f4 .page-body{height:var(--f4-portrait-content-height)}
 .paper.f4.landscape{width:var(--f4-landscape-width);height:var(--f4-landscape-height);padding:var(--f4-margin);page:f4-landscape}
 .paper.f4.landscape .page-body{height:var(--f4-landscape-content-height)}
 @page f4-portrait{size:${portrait.widthMm}mm ${portrait.heightMm}mm;margin:0}
 @page f4-landscape{size:${landscape.widthMm}mm ${landscape.heightMm}mm;margin:0}
`;

export const F4_SCREEN_LAYOUT_CSS = `
 @media screen {
  body{overflow:auto!important}
  #pages{display:flex!important;flex-direction:column;align-items:center;justify-content:flex-start;gap:16px;padding:16px;width:max-content;min-width:100%;margin:0 auto}
  #pages>.paper{flex:none;margin:0!important}
  #pages>.paper.f4:not(.landscape){width:${portrait.widthPx}px!important;height:${portrait.heightPx}px!important}
  #pages>.paper.f4.landscape{width:${landscape.widthPx}px!important;height:${landscape.heightPx}px!important}
 }
`;
