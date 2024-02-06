import path from 'path';
import { AE } from '../types/AE';
import { DB } from '../types/DB';
import fs from 'fs';

export const PATHS = {
    getAll(
        absoluteFolderPaths: { [key in DB.Jobs.FolderName]: string },
        edition: DB.Jobs.Edition
    ): AE.Json.AbsolutePath.Obj {
        const paths: AE.Json.AbsolutePath.Obj = {
            exportFile: path.resolve(
                absoluteFolderPaths.exports,
                edition.export_file_name
            ),
            projectFile: path.resolve(
                absoluteFolderPaths.projects,
                edition.project_file_name
            ),
            projectSaveFile: path.resolve(
                absoluteFolderPaths.projsaves,
                edition.project_save_file_name
            ),
        };

        const projectFilePathExists = fs.existsSync(paths.projectFile);
        if (!projectFilePathExists)
            throw `projectFilePathExists does not exist: ${paths.projectFile}`;

        return paths;
    },
};
