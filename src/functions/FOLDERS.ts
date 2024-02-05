import path from 'path';
import fs from 'fs';
import { MYSQL_DB } from '../classes/MYSQL_DB';
import { NAMES } from '../config/DB_NAMES';
import { DB } from '../types/DB';
import { RenderMachine } from '../types/RenderMachine';

export const FOLDERS = {
    async getAll(
        DB: MYSQL_DB,
        renderMachine: RenderMachine
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
            const absolutePath = path.resolve(
                renderMachine[folder.root_folder],
                folder.relative_path
            );
            if (!fs.existsSync(absolutePath))
                throw `Folder does not exist: ${absolutePath}`;
            folders[folder.name] = absolutePath;
        }

        return folders;
    },
};
