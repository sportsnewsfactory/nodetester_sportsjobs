import path from "path";
import { coreTables } from "../../../constants/coreTables";
import { CORE } from "../../../types/CORE";
import { DB } from "../../../types/DB";
import { MYSQL_DB } from "../../../classes/MYSQL_DB";

/**
 * Folder types contain some of the general paths
 */
export async function getGeneralPaths(
    renderMachine: DB.RenderMachine,
    SportsDB: MYSQL_DB
){
    const folderTypes: CORE.FolderType[] = await SportsDB.SELECT(coreTables.folder_types);
    const generalFolderKeys = ['dynamic_backgrounds', 'narration', 'logos'];
    
    let generalFolderPaths: {[key in 'dynamic_backgrounds' | 'narration' | 'logos']: string} = {} as {[key in 'dynamic_backgrounds' | 'narration' | 'logos']: string};
    for (const generalFolderKey of generalFolderKeys) {
        const folderType: CORE.FolderType | undefined = folderTypes.find(folder => folder.name === generalFolderKey);
        if (!folderType) throw `Folder type not found: ${generalFolderKey}`;
        generalFolderPaths[generalFolderKey as 'dynamic_backgrounds' | 'narration' | 'logos'] = 
            path.resolve(
                renderMachine[folderType.root_folder as keyof DB.RenderMachine] as string, 
                folderType.folder_path as string
            ).replace(/\\/g, '/');
    }

    return generalFolderPaths;
}