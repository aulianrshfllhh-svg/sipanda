type F4OrientationLayout = Readonly<{
  widthMm: number;
  heightMm: number;
  contentWidthMm: number;
  contentHeightMm: number;
  widthPx: number;
  heightPx: number;
}>;

export const F4_PAGE_LAYOUT: Readonly<{
  marginMm: number;
  portrait: F4OrientationLayout;
  landscape: F4OrientationLayout;
}>;

export const F4_PAGE_CSS: string;
export const F4_SCREEN_LAYOUT_CSS: string;
