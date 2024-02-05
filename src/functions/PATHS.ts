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

        for (const pathKey in paths) {
            if (paths.hasOwnProperty(pathKey)) {
                const pathExists = fs.existsSync(
                    paths[pathKey as keyof AE.Json.AbsolutePath.Obj]
                );
                if (!pathExists)
                    throw `Path does not exist: ${
                        paths[pathKey as keyof AE.Json.AbsolutePath.Obj]
                    }`;
            }
        }

        return paths;
    },
};
