export function pasteDocument(document: Document, html: string): HTMLElement;
export function sanitizePaste(root: HTMLElement, options?: { allowBold?: boolean; preserveStructure?: boolean }): string;
export function sanitizePasteAsync(root: HTMLElement, options?: { allowBold?: boolean; preserveStructure?: boolean }, progress?: (percent: number) => void): Promise<string>;
export function plainTextHtml(document: Document, text: string): string;
