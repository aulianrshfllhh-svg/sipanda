export interface GridCell { node: HTMLTableCellElement; r: number; c: number; rs: number; cs: number }
export function tableGrid(table: HTMLTableElement): { grid: GridCell[][]; cells: GridCell[]; width: number; height: number; errors: string[]; headerRows: number };
export function editTable(table: HTMLTableElement, action: string, options?: { row?: number; column?: number; selected?: number[]; value?: string }): HTMLTableElement;
export function tidyTable(table: HTMLTableElement): { changes: number; warnings: string[] };
export function parseIndonesianNumber(text: string): number | null;
