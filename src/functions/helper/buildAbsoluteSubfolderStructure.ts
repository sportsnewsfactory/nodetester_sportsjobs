import fs from 'fs';
import { CORE } from '../../types/CORE';

/** 
 * build the subfolders as an object with the absolute paths
 * where the keys are of @type {CORE.Keys.PS.ProductSubFolder}
 */
export function buildAbsoluteSubfolderStructure__AE(
    subfolderStructure: CORE.AE.ProductSubFolder[], 
    $: { [key in CORE.Keys.ExpectedPathVariables]: string }
): { [key in CORE.Keys.AE.ProductSubFolder]: string } {

    // console.log(`%c${JSON.stringify(subfolderStructure, null, 2)}`, 'color: yellow');

    /**
     * Let's just make sure that all templated paths
     * have a forward slash at the end
     */
    for (const subFolder of subfolderStructure) {
        if (!subFolder.subfolder_path.endsWith('/')) 
            throw `Subfolder path must end with a forward slash: ${subFolder.subfolder_path}\n@ ${subFolder.product_name} ${subFolder.folder_type}`;
    }    

    let subFolders: { [key in CORE.Keys.AE.ProductSubFolder]: string } = {} as { [key in CORE.Keys.AE.ProductSubFolder]: string };
    // const PSSubfolderArray: CORE.Keys.PS.ProductSubFolder[] = ['saves', 'exports', 'templates', 'staticBackgrounds', 'logos'];
    // const AESubfolderArray: CORE.Keys.AE.ProductSubFolder[] = ['saves', 'exports', 'templates', 'dynamic_backgrounds', 'narration','presenters'];
    // const allPossibleSubfolders = [...PSSubfolderArray, ...AESubfolderArray];

    for (const subfolder of subfolderStructure) {
        // if (!AESubfolderArray.includes(subfolder.folder_type)) throw `Subfolder key not found: ${subfolder.folder_type}`;
        console.log(`%c${JSON.stringify(subfolder)}`, 'color: pink');
        const expectedVariables: string[] = [];
        if (!subfolder.expected_variables.includes(',')) expectedVariables.push(subfolder.expected_variables);
        else expectedVariables.push(...subfolder.expected_variables.split(', '));
        subFolders[subfolder.folder_type] = subfolder.subfolder_path;
        for (const variable of expectedVariables) {
            const cleanVar = variable.replace('$', '') as CORE.Keys.ExpectedPathVariables;
            if (!(cleanVar in $)) throw `Variable not found: ${cleanVar}`;
            subFolders[subfolder.folder_type] = subFolders[subfolder.folder_type].replace(`${variable}/`, $[cleanVar]);
        }
        if (subFolders[subfolder.folder_type].includes('$item_specific_sport_name')) continue;
        if (!subFolders[subfolder.folder_type].endsWith('/')) subFolders[subfolder.folder_type] = subFolders[subfolder.folder_type] + '/';
        if (!fs.existsSync(subFolders[subfolder.folder_type])) throw `Subfolder not found: ${subFolders[subfolder.folder_type]}`;
    }

    return subFolders;
}