export interface FormatIssue {id:string;code:string;message:string;level:'required'|'suggestion';babId:string;subId:string;target:{type:string;index?:number;number?:string;objectId?:string}}
export interface FormatReport {score:number;canSubmit:boolean;issues:FormatIssue[];chapters:Array<{id:string;title:string;complete:number;total:number;required:number}>}
export function checkDocumentFormat(doc:any,rootForSub:(sub:any)=>HTMLElement):FormatReport;
