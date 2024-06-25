import fs from 'fs';
import { CORE } from '../../../types/CORE';
import { DB } from '../../../types/DB';
import { Paths } from '../../../types/CORE/Paths';

/** 
 * build the subfolders as an object with the absolute paths
 * where the keys are of @type {CORE.Keys.AE.ProductSubFolder}
 */
export function getSubfolderStrucure(
    productSubfolders: CORE.AE.ProductSubFolder[], 
    renderMachine: DB.RenderMachine,
    edition: CORE.Edition,
    brand: CORE.Brand,
    product: CORE.Product,
    generalFolderPaths: Paths.GeneralFolders,
): { [key in CORE.Keys.AE.ProductSubFolder]: string } {

    /** 
     * let's start building the path hierarchy.
     * The dollar sign is used since that's the symbol
     * that appears on the variables in the database
     */
    let $: { [key in Partial<CORE.Keys.AE.ExpectedPathVariables>]: string } = {
        drive_path: renderMachine.drive_path,
        qnap_path: renderMachine.qnap_path,
        sport: `${edition.sport}/`, // edition.sport === 'General' ? 'Mixed/' : `${edition.sport}/`,
        lang: edition.lang,
        brand_path: `${renderMachine[brand.root_folder]}${brand.brand_path}`,
        product_path: product.product_path,
        
        dynamic_backgrounds: generalFolderPaths.dynamic_backgrounds,
        narration: generalFolderPaths.narration,
        logos: generalFolderPaths.logos,
    };
    $.product_path = $.product_path.replace('$brand_path/', $.brand_path);
    
    if (!fs.existsSync($.brand_path)) throw `Brand folder not found: ${$.brand_path}`;
    if (!fs.existsSync($.product_path)) throw `Product folder not found: ${$.product_path}`;


    // console.log(`%c${JSON.stringify(subfolderStructure, null, 2)}`, 'color: yellow');

    /**
     * Let's just make sure that all templated paths
     * have a forward slash at the end
     */
    for (const subFolder of productSubfolders) {
        if (!subFolder.subfolder_path.endsWith('/')) 
            throw `Subfolder path must end with a forward slash: ${subFolder.subfolder_path}\n@ ${subFolder.product_name} ${subFolder.folder_type}`;
    }    

    let subFolders: { [key in CORE.Keys.AE.ProductSubFolder]: string } = {} as { [key in CORE.Keys.AE.ProductSubFolder]: string };
    // const PSSubfolderArray: CORE.Keys.PS.ProductSubFolder[] = ['saves', 'exports', 'templates', 'staticBackgrounds', 'logos'];
    // const AESubfolderArray: CORE.Keys.AE.ProductSubFolder[] = ['saves', 'exports', 'templates', 'dynamic_backgrounds', 'narration','presenters'];
    // const allPossibleSubfolders = [...PSSubfolderArray, ...AESubfolderArray];

    for (const subfolder of productSubfolders) {
        // if (!AESubfolderArray.includes(subfolder.folder_type)) throw `Subfolder key not found: ${subfolder.folder_type}`;
        // console.log(`%c${JSON.stringify(subfolder)}`, 'color: pink');
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