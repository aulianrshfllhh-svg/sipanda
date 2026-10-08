export interface CaptionEntry {
  id: string; kind: string; title: string; number: string; label: string; subId: string; babId: string;
  caption: HTMLElement | null; object: HTMLElement | null; orphan: boolean;
}
export interface CaptionSub { id: string; content: string; tables?: Array<{id: string; type: string}> }
export interface CaptionSection { id?: string; babId?: string; subsections: CaptionSub[] }
export function captionTitle(node: HTMLElement): string;
export function captionObject(caption: HTMLElement, root: HTMLElement): HTMLElement | null;
export function setCaptionNumber(caption: HTMLElement, number: string, id?: string): void;
export function indexCaptions(sections: CaptionSection[], rootForSub: (sub: CaptionSub) => HTMLElement, options?: { normalize?: boolean; tableTitle?: (type: string) => string; editable?: (babId: string) => boolean }): { entries: CaptionEntry[]; roots: Array<{root: HTMLElement; sub: CaptionSub; bab: CaptionSection}>; broken: Array<{id: string; subId: string; babId: string}> };
