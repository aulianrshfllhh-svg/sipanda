export type ArchiveCategory = 'Renja Murni' | 'Renja Perubahan' | 'Renstra' | 'Lampiran Matriks';
export interface ArchiveDocument {
 id:string;opdId:string;judul:string;jenis:string;category:ArchiveCategory;tahun:string;status:string;
 matrixKind:'Murni'|'Perubahan'|null;periodStart:string|null;periodEnd:string|null;
 verifiedAt:string|null;verifier:string|null;version:number|null;revisionCount:number;
 verificationSource:string;cara:string;isLampiranOtomatis:boolean;fileName:string|null;available:boolean;
 createdAt?:string;submittedAt?:string;catatanRevisi?:string|null;
 nomerRegistrasiArsip?:string|null;tteNumber?:string|null;finalizedAt?:string|null;
 timeline?:Array<{dari?:string|null;ke:string;oleh?:string;alasan?:string|null;waktu:string}>;
 verifications?:Array<{status:string;catatanRevisi?:string|null;createdAt:string;verifier?:{nama:string}}>
}
export interface MonitoringOpd {
 id:string;nama:string;kode:string;kategori:string|null;approvedCount:number;
 categories:Record<ArchiveCategory,{approved:number}>;
 documents:ArchiveDocument[];
 lastReminder?:{at:string;by?:string|null}|null;
}
