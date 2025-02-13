import path from 'path';
import fs from 'fs';
import { MYSQL_DB } from '../classes/MYSQL_DB';
import { NAMES } from '../config/DB_NAMES';
import { DB } from '../types/DB';

export const FOLDERS = {
    async getAll(
        DB: MYSQL_DB,
        renderMachine: DB.RenderMachine
    ): Promise<{ [key in DB.Jobs.FolderName]: string }> {
        const foldersArray = await DB.SELECT<DB.Jobs.Folder>(NAMES.folders);
        const folderNames: DB.Jobs.FolderName[] = [
            'narration',
            'backgrounds',
            'logos',
            'exports',
            'projects',
            'projsaves',
        ];

        let folders = {} as { [key in DB.Jobs.FolderName]: string };

        // Check if the folders exist
        for (const folderName of folderNames) {
            if (!foldersArray.find((folder) => folder.name === folderName))
                throw `Folder not found: ${folderName}`;
        }

        for (const folder of foldersArray) {
            const absolutePath = path
                .resolve(
                    renderMachine[folder.root_folder],
                    folder.relative_path
                )
                .replace(/\\/g, '/') + '/';
            if (!fs.existsSync(absolutePath))
                throw `Folder path does not exist: ${absolutePath}`;
            folders[folder.name] = absolutePath;
        }

        // console.log(JSON.stringify(folders, null, 4));

        return folders;
    },
    // /**
    //  * Here we're gonna be using the 
    //  * new CORE general folders table
    //  * @param DB 
    //  * @param renderMachine 
    //  * @returns 
    //  */
    // async getAll__CORE(
    //     DB: MYSQL_DB,
    //     renderMachine: RenderMachine
    // ): Promise<{ [key in CORE.FolderType]: string }> {
    //     const folderNames: CORE.FolderType[] = [
    //         'narration',
    //         'dynamic_backgrounds',
    //         'logos',
    //     ];
        
    //     const generalFolders: DB.Jobs.GeneralFolder[] = 
    //         await DB.SELECT<DB.Jobs.GeneralFolder>(NAMES.general_folders);

    //     let folders = {} as { [key in DB.Jobs.GeneralFolderName]: string };

    //     // Check if the folders exist
    //     for (const folderName of folderNames) {
    //         if (!generalFolders.find((folder) => folder.folder_name === folderName))
    //             throw `Folder not found: ${folderName}`;
    //     }

    //     for (const folder of generalFolders) {
    //         const absolutePath = path
    //             .resolve(
    //                 renderMachine[folder.root_folder],
    //                 folder.folder_path
    //             )
    //             .replace(/\\/g, '/') + '/';
    //         if (!fs.existsSync(absolutePath))
    //             throw `Folder path does not exist: ${absolutePath}`;
    //         folders[folder.folder_name] = absolutePath;
    //     }

    //     // console.log(JSON.stringify(folders, null, 4));

    //     return folders;
    // },
};
