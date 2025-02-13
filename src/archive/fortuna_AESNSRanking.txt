/**
 * Here we'll convert data from the DB to a Json.Payload object
 */

import fs from 'fs';
import axios from 'axios';

import { MYSQL_DB } from '../classes/MYSQL_DB';
import { GENERALNEWS } from '../functions/SPORTNEWS';
import { STANDINGS } from '../functions/STANDINGS';
import identifyRenderMachine from '../functions/identifyRenderMachine';
import { AE } from '../types/AE';
import { DB } from '../types/DB';
import { EDITIONS } from '../functions/EDITIONS';
import { FOLDERS } from '../functions/FOLDERS';
import { PATHS } from '../functions/PATHS';
import { itemTextKeys, mappingFuncs, itemFileKeys, standingTextKeys } from '../functions/MAPPING';
import { PRESENTERSCHEMES } from '../functions/PRESENTERSCHEMES';
import { getPresenterSchemeFiles } from '../functions/Presenters';
import { NEXTMATCHES } from '../functions/NEXTMATCHES';
import { CORE } from '../types/CORE';
import { coreTables } from '../constants/coreTables';
import { getBrandEditionProduct } from '../functions/helper/getBrandEditionProduct';
import { buildAbsoluteSubfolderStructure__AE } from '../functions/helper/buildAbsoluteSubfolderStructure';
import path from 'path';
import { getFormattedDate } from '../functions/helper/getFormattedDate';
import { processRanking } from '../functions/standalone/processRanking';

const tempMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export async function Fortuna_SNS_AE_Ranking__CORE() {    
    const DB = new MYSQL_DB();
    DB.createPool();

    try {
        /**
         * Firstly we define the two main variables
         * @param brand_name string,
         * @param lang of the type @type {CORE.Keys.Lang} 
         * @param product_name of the @type {CORE.Keys.Product}
         * 
         * When transitioning into the UI, these will be
         * the two main variables that will be set by the user
         * 
         * besides these, we'll try and make all the data flow
         * from the database.
         */
        const brand_name: string = 'Fortuna';
        const product_name: CORE.Keys.Product = 'SNS_AE_Ranking';
        const lang: CORE.Keys.Lang = 'RO';
        const renderMachine: DB.RenderMachine = await identifyRenderMachine(DB);
        
        const now = new Date();
        const PORT = 9411;
        const API_Endpoint = '/api/extboiler/';

        const {brand, edition, product} = 
            await getBrandEditionProduct(DB, brand_name, product_name);

        /**
         * Folder types contain some of the general paths
         */
        const folderTypes: CORE.FolderType[] = await DB.SELECT(coreTables.folder_types);
        const generalFolderKeys = ['dynamic_backgrounds', 'logos'];

        let generalFolderPaths: {[key in 'dynamic_backgrounds' | 'logos']: string} = {} as {[key in 'dynamic_backgrounds' | 'narration' | 'logos']: string};
        for (const generalFolderKey of generalFolderKeys) {
            const folderType: CORE.FolderType | undefined = folderTypes.find(folder => folder.name === generalFolderKey);
            if (!folderType) throw `Folder type not found: ${generalFolderKey}`;
            
            const rootFolder = String(renderMachine[folderType.root_folder as keyof DB.RenderMachine])            
            generalFolderPaths[generalFolderKey as 'dynamic_backgrounds' | 'logos'] = 
                path.resolve(
                    rootFolder, 
                    folderType.folder_path as string
                ).replace(/\\/g, '/');
        }

        // console.log(`generalFolderPaths: ${JSON.stringify(generalFolderPaths, null, 2)}`);
        // return;
        /*
            generalFolderPaths: {
                "dynamic_backgrounds": "G:/My Drive/Sports/S_Studio/S_S_Backgrounds/S_S_Backgrounds_$item_specific_sport_name",
                "narration": "G:/My Drive/Sports/S_Studio/S_S_Narration/S_S_N_",
                "logos": "G:/My Drive/Sports/S_Studio/S_S_Logos/S_B_$item_specific_sport_name"
            }
        */

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
            narration: '',
            logos: generalFolderPaths.logos,
        };
        $.product_path = $.product_path.replace('$brand_path/', $.brand_path);

        if (!fs.existsSync($.brand_path)) throw `Brand folder not found: ${$.brand_path}`;
        if (!fs.existsSync($.product_path)) throw `Product folder not found: ${$.product_path}`;

        /** 
         * get the buleprint of the subfolder structure for the given product.
         */
        let subfolderStructure: CORE.AE.ProductSubFolder[] = 
            await DB.SELECT(coreTables.product_subfolders,
            {whereClause: {product_name: edition.product_name}}
        );

        /** 
         * build the subfolders as an object with the absolute paths
         * where the keys are of @type {CORE.Keys.PS.ProductSubFolder}
         */
        const subFolders: {[key in CORE.Keys.AE.ProductSubFolder]: string} = 
            buildAbsoluteSubfolderStructure__AE(subfolderStructure, $);
        
        // console.log(`subFolders: ${JSON.stringify(subFolders, null, 2)}`);
        // return;
        /*
            subFolders: {
                "dynamic_backgrounds": "G:/My Drive/Sports/S_Studio/S_S_Backgrounds/S_S_Backgrounds_$item_specific_sport_name",
                "exports": "//NAS4Bay/Qnap3/Studio/Sports/S_Brands/Fortuna/AE/Daily News/exports/",
                "narration": "G:/My Drive/Sports/S_Studio/S_S_Narration/S_S_N_General/RO/",
                "presenters": "//NAS4Bay/Qnap3/Studio/Sports/S_Brands/Fortuna/presenters/RO/",
                "saves": "//NAS4Bay/Qnap3/Studio/Sports/S_Brands/Fortuna/AE/Daily News/saves/",
                "templates": "//NAS4Bay/Qnap3/Studio/Sports/S_Brands/Fortuna/AE/Daily News/templates/"
            }
        */

        /** 
         * because we want a to select a random template 
         * and background and take the selected file out of the pool
         * we first create the initial
         */
        const templateFolderContent: string[] = fs.readdirSync(subFolders.templates);
        let templateFiles: string[] = templateFolderContent.filter(file => file.endsWith('.aep'));
        if (templateFiles.length === 0) throw `No templates found in folder: ${subFolders.templates}`;

        // now we know that we have at least 1 template and 1 background
        
        let texts: AE.Json.TextImport[] = await processRanking({DB, lang});
        let files: AE.Json.FileImport[] = [];
        let trimSyncData: AE.Json.TS.Sequence = [];

        let payload: AE.Json.Payload = {
            files,
            texts,
            trimSyncData,
            names: {
                exportComp: '0_Main comp',
                importBin: 'Imports',
            },
            paths: PATHS.getAll__CORE(subFolders, edition),
            dbg: {
                dbgLevel: -7,
                saveExportClose: {
                    isSave: false,
                    isExport: false,
                    isClose: false,
                },
            },
        };

        for (let text of payload.texts) {
            text.text = typeof text.text === 'string' ? text.text : String(text.text);
            // Use convertedText here
        }

        const jsoned = JSON.stringify(payload).replace(/\\\\/g, '/');
        // console.warn(jsoned);

        // return;

        const axiosResponse = await axios.post(
            `http://localhost:${PORT}${API_Endpoint}`,
            { stringifiedJSON: jsoned }
        );
        console.log(JSON.stringify(axiosResponse.data));
    } catch (error) {
        console.error(error);
    } finally {
        await DB.pool.end();
    }
}

// Fortuna_SNS_AE_Ranking__CORE();