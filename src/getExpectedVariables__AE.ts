import fs from 'fs';
import path from 'path';

import { CORE } from './types/CORE';
import { coreTables } from './constants/coreTables';
import { DB } from './types/DB';
import { MYSQL_DB } from './classes/MYSQL_DB';

type GetExpectedVariablesAEProps = {
    renderMachine: DB.RenderMachine,
    DB: MYSQL_DB,
    brand: CORE.Brand, 
    edition: CORE.Edition, 
    product: CORE.Product
}

/**
 * We will split our expected variables firstly into 2:
 *      A. Variables that are paths
 *      B. Variables that are not paths
 * 
 * The variables that are paths are:
 * 1. The AE specific folders: dynamic_backgrounds, narration, logos
 * 2. The renderMachine specific folders: drive_path, qnap_path
 * 
 * The variables that are not paths are
 * The edition specific: sport, lang
 * 
 * the @param folderTypes will contain the AE specific folders: dynamic_backgrounds, narration, logos
 */
export async function getExpectedVariables__AE({
    renderMachine, DB, brand, edition, product
}: GetExpectedVariablesAEProps
): Promise<{[key in CORE.Keys.AE.ExpectedPathVariables]: string}>{
    try {
        const folderTypes: CORE.FolderType[] = await DB.SELECT(coreTables.folder_types);
        const generelFolderKeys: CORE.Keys.AE.ExpectedPathVariables[] = ['dynamic_backgrounds', 'narration', 'logos'];
            
        let $: {
            [key in CORE.Keys.AE.ExpectedPathVariables]: string
        } = {
            drive_path: renderMachine.drive_path,
            qnap_path: renderMachine.qnap_path,
            brand_path: `${renderMachine[brand.root_folder]}${brand.brand_path}`,
            product_path: product.product_path,

            dynamic_backgrounds: '',
            narration: '',
            logos: '',

            sport: `${edition.sport}/`, // edition.sport === 'General' ? 'Mixed/' : `${edition.sport}/`,
            lang: edition.lang,
        };

        /**
         * The product path builds upon the brand path so:
         */
        $.product_path = $.product_path.replace('$brand_path/', $.brand_path);

        /**
         * Populate only the general paths.
         * We'll also validate that the folders exist.
         */
        for (const generalFolderKey of generelFolderKeys) {
            const folderType: CORE.FolderType | undefined = folderTypes.find(folder => folder.name === generalFolderKey);
            if (!folderType) throw `Folder type not found: ${generalFolderKey}`;
            $[generalFolderKey as 'dynamic_backgrounds' | 'narration' | 'logos'] = 
                path.resolve(
                    renderMachine[folderType.root_folder as keyof DB.RenderMachine] as string, 
                    folderType.folder_path as string
                ).replace(/\\/g, '/');
            if (!fs.existsSync($[generalFolderKey as 'dynamic_backgrounds' | 'narration' | 'logos'])) 
                throw `Folder not found: ${$[generalFolderKey as 'dynamic_backgrounds' | 'narration' | 'logos']}`;
        }
        
        if (!fs.existsSync($.brand_path)) throw `Brand folder not found: ${$.brand_path}`;
        if (!fs.existsSync($.product_path)) throw `Product folder not found: ${$.product_path}`;

        return $;
    } catch (e) {
        throw new Error (`getExpectedVariables__AE: ${e}`);
    }
}