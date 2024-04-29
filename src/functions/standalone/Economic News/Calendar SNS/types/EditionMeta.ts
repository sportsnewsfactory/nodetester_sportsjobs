export interface EditionMeta {
    editionName: string;
    lang: string;
    schemeName: string;
    m5Row: number;
    exportName: string;
    fileName: string;
    filePath: string;
    txtName: string;
    gender: string;
    langFolder: string;
    dateFormat: string;
    list: string;
    nameDaily: string;
    CopyToFolderA: string;
    CopyToFolderB: string;
    dyntubeProjectId: string;
    noonEvening: string;
}

export type EditionMetaV2 = EditionMeta & {
    ps: string;
    insta: string;
};
