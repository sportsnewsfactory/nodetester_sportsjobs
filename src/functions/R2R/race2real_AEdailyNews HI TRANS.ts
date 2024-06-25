/**
 * Here we'll convert data from the DB to a Json.Payload object
 */

import fs from 'fs';
import axios from 'axios';

import { MYSQL_DB } from '../../classes/MYSQL_DB';
import { GENERALNEWS } from '../GENERALNEWS';
import { STANDINGS } from '../STANDINGS';
import identifyRenderMachine from '../identifyRenderMachine';
import { AE } from '../../types/AE';
import { DB } from '../../types/DB';
import { PATHS } from '../PATHS';
import { itemTextKeys, mappingFuncs, itemFileKeys, standingTextKeys } from '../MAPPING';
import { PRESENTERSCHEMES } from '../PRESENTERSCHEMES';
import { DailyPresenterScheme, getDailyPresenterScheme, getPresenterSchemeFiles } from '../Presenters';
import { NEXTMATCHES } from '../NEXTMATCHES';
import { CORE } from '../../types/CORE';
import { coreTables } from '../../constants/coreTables';
import { getBrandEditionProduct } from '../helper/getBrandEditionProduct';
import { buildAbsoluteSubfolderStructure__AE } from '../helper/buildAbsoluteSubfolderStructure';
import path from 'path';
import { TMPTables } from '../../constants/templateTables';
import { Template } from '../../types/CORE/Template';
import { processElement } from './process/processElement';
import { populateNewsElements } from './populateNewsElements';
import { newsClusterLevel } from './process/newsClusterLevel';

/**
 * Testing Race2Real AE daily edition with the new core tables
 */
export async function Race2Real_AE_daily_news() {    
    const SportsDB = new MYSQL_DB();
    SportsDB.createPool('SPORTS');

    const BackofficeDB = new MYSQL_DB();
    BackofficeDB.createPool('BACKOFFICE');

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
        const brand_name: string = 'Race2Real';
        const product_name: CORE.Keys.Product = 'AE_Daily_News';
        const lang: CORE.Keys.Lang = 'HI';
        const renderMachine: DB.RenderMachine = await identifyRenderMachine(SportsDB);
        const templateName: string = 'mixed-sports1';

        const PORT = 9411;
        const API_Endpoint = '/api/extboiler/';

        const now = new Date();
        // introDate formatted as dd MMM YYYY
        const options = { day: '2-digit', month: 'short', year: 'numeric' } as Intl.DateTimeFormatOptions;
        const introDate = now.toLocaleDateString('en-US', options);

        // console.log(introDate);

        // return;

        let texts: AE.Json.TextImport[] = [];
        let files: AE.Json.FileImport[] = [];
        let trimSyncData: AE.Json.TS.Sequence = [];

        texts.push({
            text: introDate,
            textLayerName: 'introdate',
            recursiveInsertion: true,
        });

        const {brand, edition, product} = 
            await getBrandEditionProduct(SportsDB, brand_name, product_name);

        // console.log(`brand: ${JSON.stringify(brand, null, 4)}`);
        // console.log(`edition: ${JSON.stringify(edition, null, 4)}`);
        // console.log(`product: ${JSON.stringify(product, null, 4)}`);

        // return;

        /**
         * Folder types contain some of the general paths
         */
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
            narration: generalFolderPaths.narration,
            logos: generalFolderPaths.logos,
        };
        $.product_path = $.product_path.replace('$brand_path/', $.brand_path);
        
        if (!fs.existsSync($.brand_path)) throw `Brand folder not found: ${$.brand_path}`;
        if (!fs.existsSync($.product_path)) throw `Product folder not found: ${$.product_path}`;

        /** 
         * get the buleprint of the subfolder structure for the given product.
         */
        let subfolderStructure: CORE.AE.ProductSubFolder[] = 
            await SportsDB.SELECT(coreTables.product_subfolders,
            {whereClause: {product_name: edition.product_name}}
        );

        /** 
         * build the subfolders as an object with the absolute paths
         * where the keys are of @type {CORE.Keys.AE.ProductSubFolder}
         */
        const subFolders: {[key in CORE.Keys.AE.ProductSubFolder]: string} = 
            buildAbsoluteSubfolderStructure__AE(subfolderStructure, $);
        
        // console.log(`subFolders: ${JSON.stringify(subFolders, null, 4)}`);
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

        // Are we still going with random template?
        const templateFolderContent: string[] = fs.readdirSync(subFolders.templates);
        let templateFiles: string[] = templateFolderContent.filter(file => file.endsWith('.aep'));
        if (templateFiles.length === 0) throw `No templates found in folder: ${subFolders.templates}`;

        // const backgroundPaths: {[key in DB.SportName]: string} = {
        //     Cricket: subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Cricket'),
        //     Football: subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Football'),
        //     Tennis: subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Tennis'),
        //     Motorsport: subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Motorsport'),
        //     Basketball: subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Basketball'),
        //     Baseball: '',
        // }

        // for (let sportName in backgroundPaths){
        //     if (sportName === 'Baseball') continue;
        //     if (!fs.existsSync(backgroundPaths[sportName as DB.SportName])) 
        //         throw `Background folder not found: ${backgroundPaths[sportName as DB.SportName]}`;
        // }

        // let backgrounds: {[key in DB.SportName]: string[]} = 
        // {
        //     Cricket: fs.readdirSync(subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Cricket')),
        //     Football: fs.readdirSync(subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Football')),
        //     Tennis: fs.readdirSync(subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Tennis')),
        //     Motorsport: fs.readdirSync(subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Motorsport')),
        //     Basketball: fs.readdirSync(subFolders.dynamic_backgrounds.replace('$item_specific_sport_name', 'Basketball')),
        //     Baseball: [],
        // }
        
        // for (let sportName in backgrounds){
        //     if (sportName === 'Baseball') continue;
        //     let backgroundFiles: string[] = backgrounds[sportName as DB.SportName].filter(
        //         file => file.endsWith('.mp4')
        //     );
        //     if (backgroundFiles.length === 0) throw `No backgrounds found in folder: ${backgroundPaths[sportName as DB.SportName]}`;
        //     backgrounds[sportName as DB.SportName] = backgroundFiles;
        // }

        /**
         * Here we renewing the procedure to use
         * the new structure of the DB
         * Now let's get the template total structure:
         * clusters, objects, elements, actions, mainLayers
         */
        const templateMainLayers = await BackofficeDB.SELECT(TMPTables.templateMainLayers, {whereClause: {template_name: templateName}});
        const templateClusters: Template.Record.Cluster[] = await BackofficeDB.SELECT(TMPTables.templateClusters, {whereClause: {template_name: templateName}});
        const templateElements: Template.Record.Element[] = await BackofficeDB.SELECT(TMPTables.templateElements, {whereClause: {template_name: templateName}});
        
        const objectElements: Template.Obj.Element[] = await BackofficeDB.SELECT(TMPTables.objectElements);

        // const templateActions = await BackofficeDB.SELECT(TMPTables.templateActions, {whereClause: {template_name: templateName}});
        // const clusterActions = await BackofficeDB.SELECT(TMPTables.actions, {whereClause: {template_name: templateName}});

        const elementBluePrints: Template.Element.DB_Blueprint[] = await BackofficeDB.SELECT(TMPTables.elements);
        const objects: Template.Obj[] = await BackofficeDB.SELECT(TMPTables.objects);
        // const actions: Template.Action[] = await BackofficeDB.SELECT(TMPTables.actions);
        const elementActions: Template.Element.Action[] = await BackofficeDB.SELECT(TMPTables.elementActions);
        const clusterActions: Template.Cluster.Action[] = await BackofficeDB.SELECT(TMPTables.clusterActions);

        /**
         * We'll start with getting our raw data
         * then we will manipulate the data to fit the actions scheme
         * and then we'll export a sample json file.
         * 
         * @param newsItems and @param presenterFiles
         * contain all of the raw data we need
         */
        const newsItems: DB.Item.JoinedNews[] = 
            await GENERALNEWS.getTransItemsByLang(SportsDB, lang);

        // console.log(`subFolders.presenters: ${JSON.stringify(subFolders.presenters, null, 4)}`);
        // return;
        const dailyPresenterFilePaths: DailyPresenterScheme = 
            await getDailyPresenterScheme(SportsDB, edition, now, subFolders.presenters);
        
        /**
         * This will allow to address the data in a more structured way
         */
        let RAW_DATA = {
            presenter: dailyPresenterFilePaths,
        }

        const newsItemElements: Template.Element.DB_Blueprint[] = 
            objectElements
                .filter(e => e.object_name === 'news-item')
                .map(e => elementBluePrints.find(b => b.element_name === e.element_name) as Template.Element.DB_Blueprint);

        /**
         * Here we perform the element-level actions of the news items
         * These actions involve files and texts and insert and trimming actions
         */
        populateNewsElements(
            newsItems,
            generalFolderPaths,
            newsItemElements,
            elementActions,
            texts,
            files,
            trimSyncData,
        )

        // console.log(`texts: ${JSON.stringify(texts, null, 4)}`);
        // console.log(`files: ${JSON.stringify(files, null, 4)}`);

        // return;

        /**
         * Now we want to perform the cluster-level actions.
         * Now we don't care about the files and texts.
         * The cluster-level actions are trim, sync and marker
         * Let's sort so that the first action is the first in the array
         */
        newsClusterLevel(
            clusterActions,
            templateClusters,
            elementBluePrints,
            trimSyncData
        );

        // console.log(`trimSyncData: ${JSON.stringify(trimSyncData, null, 4)}`);
        // return;

        /**
         * We start with processing the smallest building blocks @param elements
         * and build up from there... @param clusters, @param templateMainLayers.
         * We need to start only with the elements that are of types:
         * 'footageFile' | 'text' | 'audioFile' as inserting files and texts 
         * is the first step
         */
        // let stage01_elements: Template.Element.Realized[] = [];
        for (const templateElement of templateElements){
            
            const elementBluePrint: Template.Element.DB_Blueprint | undefined = elementBluePrints.find(e => e.element_name === templateElement.element_name);
            if (!elementBluePrint) throw `Element blueprint not found for element ${templateElement.element_name} in template ${templateName}`;

            if (elementBluePrint.element_type === 'preexisting') continue;
            /**
             * Now we have the blueprint.
             * We need to resolve the naming scheme and variables
             * example of the only template level element that answers
             * to this category is the 'presenter' elements
             * element_type: 'footageFile'
             * naming_scheme: presenter-$sub_type
             * variables: $sub_type ('open' | 'close')
             */
            
            let layerCompName: string = elementBluePrint.naming_scheme
                .replace('$sub_type', templateElement.element_subtype || '');

            /**
             * There are two actions for files
             * but despite having the order written down
             * in the DB, the AE extension will deal with it.
             */
            let eActions: Template.Element.Action[] = elementActions.filter(action => action.element_name === templateElement.element_name);

            /**
             * Let's try getting the files now
             * We know that the element presenter is a footageFile
             */
            for (let action of eActions){
                switch (action.action_type){
                    case 'insertFile': {
                        // locate filePath
                        if (templateElement.element_name in RAW_DATA){
                            const data = RAW_DATA[templateElement.element_name as keyof typeof RAW_DATA];
                            if (
                                templateElement.element_subtype 
                                && templateElement.element_subtype in data
                            ){
                                const filePath = data[templateElement.element_subtype as keyof typeof data];
                                if (!fs.existsSync(filePath))
                                    throw `File path does not exist: ${filePath}`;

                                const method = action.method as AE.Method.Resize;

                                files.push({
                                    absolutePath: filePath,
                                    compositionName: layerCompName,
                                    resizeAction: method,
                                });
                            } else {
                                /**
                                 * We regard @param RAW_DATA[templateElement.element_name]
                                 * as a file path and not as an object
                                 */
                            }
                        }
                        break;
                    }
                    case 'insertText': {
                        // locate text source
                        break;
                    }
                    case 'trim': {
                        const layerOrCompName: string = layerCompName;
                        
                        const trim: AE.Json.TS.Trim = {
                            method: action.method as AE.Method.Trim,
                            layerOrCompName: layerOrCompName,
                        };
                        trimSyncData.push(trim);
                        break;
                    }
                    case 'sync': {
                        break;
                    }
                    case 'marker': {
                        break;
                    }
                    default: throw `Action type not recognized: ${action.action_type}`;
                }
            }

            // if (elementBluePrint.element_name === 'presenter') {
            //     const presenterFilePath: string = dailyPresenterFilePaths[templateElement.element_subtype as keyof DailyPresenterScheme];
            //     if (!fs.existsSync(presenterFilePath))
            //         throw `Presenter file path does not exist: ${presenterFilePath}`;
            //     files.push({
            //         absolutePath: presenterFilePath,
            //         compositionName: layerCompName,
            //         resizeAction: 'fitToComp',
            //     });
            // }
            // stage01_elements.push(realizedElement)
        }

        // console.log(`%cfiles: ${JSON.stringify(files, null, 4)}`,'color: pink');
        // console.log(`trimSyncData: ${JSON.stringify(trimSyncData, null, 4)}`);
        // return;

        /**
         * The news-item objects are the only objects
         * that we need to calculate the number of instances
         * accross multiple clusters.
         * Perhaps in future we'll think of a better way to do this
         */

        /**
         * We're done with inserting files and texts
         * and we're done with trimming narration and presenters
         * and syncing the news items internally (syncing the layers IN the news comps)
         * now it's time to sync the main comp layers
         * 
         * Syncing is done by pulling the next layer's start 
         * to the previous layer's end.
         * 
         * we'll start with presenter-open to Intro
         * then News comp 1 to presenter-open
         * then News comp 2 to News comp 1
         * then presenter-close to News comp 2
         * 
         * Once all that's done we sync the soundtrack
         * and the markers
         */
        const syncMainCompLayers = () => {
            // presenter-open to Intro
            trimSyncData.push({
                method: 'syncHeadTail',
                padding: 0,
                layerAName: 'presenter-open',
                layerBName: 'intro',
            });

            // News comp 1 to presenter-open
            trimSyncData.push({
                method: 'syncHeadTail',
                padding: 0,
                layerAName: 'news-cluster1',
                layerBName: 'presenter-open',
            });

            // news-cluster2 to news-cluster1
            trimSyncData.push({
                method: 'syncHeadTail',
                padding: 0,
                layerAName: 'news-cluster2',
                layerBName: 'news-cluster1',
            });
            
            // presenter-close to news-cluster2
            trimSyncData.push({
                method: 'syncHeadTail',
                padding: 0,
                layerAName: 'presenter-close',
                layerBName: 'news-cluster2',
            });

            // Ending to presenter-close via single marker
            trimSyncData.push({
                method: 'syncMarkerToOutPoint',
                padding: 0,
                layerAName: 'outro',
                layerBName: 'presenter-close',
            });

            const syncTransitions = () => {
                const transitionLayerNames = [
                    'trans-presenter-open',
                    'trans-news-cluster1',
                    'trans-news-cluster2',
                ];

                const syncToLayers = [
                    'presenter-open',
                    'news-cluster1',
                    'news-cluster2',
                ]

                for (let i=0; i<transitionLayerNames.length; i++){
                    const transLayerName = transitionLayerNames[i];
                    const syncToLayer = syncToLayers[i];
                    const syncMarker: AE.Json.TS.Sync = {
                        method: 'syncMarkerToOutPoint',
                        padding: 0,
                        layerAName: transLayerName,
                        layerBName: syncToLayer,
                    }
                    trimSyncData.push(syncMarker);
                }
            }

            syncTransitions();

            const syncSoundtrack = () => {
                const syncMarker: AE.Json.TS.Sync = {
                    method: 'syncMarkerToOutPoint',
                    padding: 0,
                    layerAName: 'soundtrack-outro',
                    layerBName: 'presenter-close',
                }
                trimSyncData.push(syncMarker);

                // now we trim the loop to the beginning of
                // the soundtrack-outro
                const trim: AE.Json.TS.Trim = {
                    method: 'trimOutToIn',
                    layerOrCompName: 'soundtrack-body',
                    trimToLayer: 'soundtrack-outro',
                };
                trimSyncData.push(trim);
            }

            syncSoundtrack();
        }

        syncMainCompLayers();

        // set workarea
        const trim: AE.Json.TS.Trim = {
            method: 'trimWorkareaToLayerOut',
            layerOrCompName: '0_Main comp',
            trimToLayer: 'outro',
        };
        trimSyncData.push(trim);

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
        await SportsDB.pool.end();
        await BackofficeDB.pool.end();
    }
}