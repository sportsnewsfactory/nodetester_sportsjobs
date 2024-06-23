/**
 * Here we'll convert data from the DB to a Json.Payload object
 */

import fs from 'fs';
import axios from 'axios';

import { MYSQL_DB } from './classes/MYSQL_DB';
import { GENERALNEWS } from './functions/GENERALNEWS';
import { STANDINGS } from './functions/STANDINGS';
import identifyRenderMachine from './functions/identifyRenderMachine';
import { AE } from './types/AE';
import { DB } from './types/DB';
import { PATHS } from './functions/PATHS';
import { itemTextKeys, mappingFuncs, itemFileKeys, standingTextKeys } from './functions/MAPPING';
import { PRESENTERSCHEMES } from './functions/PRESENTERSCHEMES';
import { DailyPresenterScheme, getDailyPresenterScheme, getPresenterSchemeFiles } from './functions/Presenters';
import { NEXTMATCHES } from './functions/NEXTMATCHES';
import { CORE } from './types/CORE';
import { coreTables } from './constants/coreTables';
import { getBrandEditionProduct } from './functions/helper/getBrandEditionProduct';
import { buildAbsoluteSubfolderStructure__AE } from './functions/helper/buildAbsoluteSubfolderStructure';
import path from 'path';
import { TMPTables } from './constants/templateTables';
import { Template } from './types/CORE/Template';

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

        const now = new Date();
        const PORT = 9411;
        const API_Endpoint = '/api/extboiler/';

        let texts: AE.Json.TextImport[] = [];
        let files: AE.Json.FileImport[] = [];
        let trimSyncData: AE.Json.TS.Sequence = [];

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
        const actions: Template.Action[] = await BackofficeDB.SELECT(TMPTables.actions);
        const elementActions: Template.Element.Action[] = await BackofficeDB.SELECT(TMPTables.elementActions);

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

            // let realizedElement: Template.Element.Realized = {
            //     element_name: elementBluePrint.element_name,
            //     element_type: elementBluePrint.element_type,
            //     container_type: elementBluePrint.container_type,
            //     label_color: elementBluePrint.label_color,
            //     layerCompName,
            //     isOptional: false,
            // }

            let elementActions = actions.filter(action => action.element_name === templateElement.element_name);

            /**
             * Let's try getting the content now
             * We know that the element presenter is a footageFile
             */
            if (elementBluePrint.element_name === 'presenter') {
                const presenterFilePath: string = dailyPresenterFilePaths[templateElement.element_subtype as keyof DailyPresenterScheme];
                if (!fs.existsSync(presenterFilePath))
                    throw `Presenter file path does not exist: ${presenterFilePath}`;
                files.push({
                    absolutePath: presenterFilePath,
                    compositionName: layerCompName,
                    resizeAction: 'fitToComp',
                });
            }
            // stage01_elements.push(realizedElement)
        }

        console.log(`files: ${JSON.stringify(files, null, 4)}`);
        return;

        /**
         * The news-item objects are the only objects
         * that we need to calculate the number of instances
         * accross multiple clusters.
         * Perhaps in future we'll think of a better way to do this
         */
        let newsItemNumInstances = templateClusters
            .filter(cluster => cluster.cluster_name === 'news-cluster')
            .map(cluster => Number(cluster.num_object_instances))
            .reduce((acc, val) => acc + val, 0);

        let newsItemCounter = 0;
        /**
         * With the objects we get to their elements
         * via the objects actions @param TMPTables.objectActions
         */
        for (const cluster of templateClusters){
            // console.log(`%cCluster: ${JSON.stringify(cluster, null, 4)}`,'color: pink');
            const clusterObjects: Template.Obj[] = objects.filter(obj => obj.cluster_name === cluster.cluster_name);

            // for debugging purposes
            if (cluster.cluster_name !== 'news-cluster') continue;

            for (const obj of clusterObjects){
                // console.log(`%cclusterObject: ${JSON.stringify(obj, null, 4)}`,'color: orange');
                let numItem: number = 0;
                let numObjectInstances = Number(cluster.num_object_instances);
                
                while (numItem <= numObjectInstances){
                    if (obj.object_name === 'news-item') newsItemCounter++;
                    numItem++;

                    const objElements: Template.Obj.Element[] = objectElements.filter(e => e.object_name === obj.object_name);
                    for (const objElement of objElements){
                        
                        const itemType: string = objElement.object_name; // i.e. 'news-item'
                        const elementBluePrint: Template.Element.DB_Blueprint | undefined = elementBluePrints.find(e => e.element_name === objElement.element_name);
                        if (!elementBluePrint) throw `Element blueprint not found for element ${objElement.element_name} in object ${obj.object_name} in cluster ${cluster.cluster_name} in template ${templateName}`;

                        if (elementBluePrint.element_type === 'preexisting') continue;

                        // console.log(elementBluePrint.variables);

                        let newsItemNumItem = obj.object_name === 'news-item' ? newsItemCounter : numItem;
                        if (newsItemNumItem > newsItemNumInstances) break;

                        let layerCompName: string = elementBluePrint.naming_scheme
                            .replace('$sub_type', objElement.element_subtype || '')
                            .replace('$item_type', itemType)
                            .replace('$num_item', String(newsItemNumItem));
                        
                        console.log(`%cLayerCompName: ${layerCompName}`, 'color: pink');

                        let realizedElement: Template.Element.Realized = {
                            element_name: elementBluePrint.element_name,
                            element_type: elementBluePrint.element_type,
                            container_type: elementBluePrint.container_type,
                            label_color: elementBluePrint.label_color,
                            layerCompName,
                            isOptional: !!objElement.is_optional,
                        }

                        stage01_elements.push(realizedElement);
                    }
                }

                
            }
        }

        // console.log(`stage01_elements: ${JSON.stringify(stage01_elements, null, 4)}`);

        return;

        // console.log(`joinedNewsItems.length: ${joinedNewsItems.length}`);
        // console.log(`joinedNewsItems: ${JSON.stringify(joinedNewsItems[0], null, 4)}`);
        // return;

        // now we know that we have at least 1 template and 1 background

        const setPresenterFiles = async () => {
            const presenterScheme: DB.Jobs.PresenterSchemeRecord[] = 
                await PRESENTERSCHEMES.getByName(SportsDB, edition.presenter_scheme);
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = dayNames[now.getDay()];
            const todaysPresenterScheme: DB.Jobs.PresenterSchemeRecord | undefined = presenterScheme.find(scheme => scheme.day === dayName.toLowerCase());
            if (!todaysPresenterScheme) throw `No presenter scheme found for day ${dayName}`;

            const presenterFilePaths: DailyPresenterScheme = 
                getPresenterSchemeFiles(
                    subFolders.presenters, // absoluteFolderPaths.presenters, 
                    todaysPresenterScheme, 
                    edition.lang
                );
            
            // pathKey = 'opener' | 'closer'
            for (const pathKey in presenterFilePaths){
                const absoluteFilePath = presenterFilePaths[pathKey as keyof DailyPresenterScheme];
                if (!fs.existsSync(absoluteFilePath))
                    throw `absoluteFilePath path does not exist: ${absoluteFilePath}`;
                files.push({
                    absolutePath: absoluteFilePath,
                    compositionName: mappingFuncs.presenter(pathKey),
                    resizeAction: 'fitToComp',
                });
            }
        }

        // const presenterFiles = await getPresnterScheme();
        // await setPresenterFiles();

        /**
         * Now for every item we get the texts and files
         * if there are standings we get the standings texts
         * currently the schedule texts are not implemented
         */
        const runThroughItems = async () => {
            // const items: DB.Item.JoinedNews[] = await GENERALNEWS.getTransItemsByLang(DB, lang);

            // if (items.length === 0) throw `No items found for lang ${lang} in table RAPID__TRANS_NEWS`;

            // console.log(`itemsLength: ${itemsLength}`);
            // const i=0;

            // for (const item of items) {
            for (let i=0; i<newsItems.length; i++) {
                const item = newsItems[i];
                // console.log(`item: ${i+1}: ${JSON.stringify(item)}`);
                // return;
                // firstly let's generate the texts and files (relative, cause we're creating a job)
                // starting with the texts of the news item (headline, sub_headline)

                const populateItemTexts = () => {
                    for (const itemTextKey of itemTextKeys) {
                        const textLayerName =
                            mappingFuncs[itemTextKey as DB.Jobs.Mapping.ItemFileKey](
                                item
                            );

                        const text: AE.Json.TextImport = {
                            text: item[itemTextKey as keyof DB.Item.News],
                            textLayerName,
                            recursiveInsertion: false,
                        };
                        texts.push(text);
                    }
                }

                populateItemTexts();
                // console.log(JSON.stringify(texts));
                // return;

                const populateItemFiles = () => {
                    // for (const itemFileKey of itemFileKeys) { // narration, background, logo
                    //     // narration needs to be converted to file_name
                    //     const correctedItemKey = itemFileKey === 'narration' ? 'file_name' : itemFileKey;
                    //     // const optionalLangAddition = itemFileKey === 'narration' ? `${lang}/` : '';
                    //     let folderKey = itemFileKey as string;
                    //     switch (itemFileKey) {
                    //         case 'background':
                    //             folderKey = 'dynamic_backgrounds';
                    //             break;
                    //         case 'logo':
                    //             folderKey = 'logos';
                    //             break;
                    //     }
                    //     let absoluteFilePath = `${absoluteFolderPaths[folderKey as keyof typeof absoluteFolderPaths]}`;
                    //     absoluteFilePath += (itemFileKey === 'background' || itemFileKey === 'logo') ? `S_B_${item.sport_name}/` : ``;
                    //     absoluteFilePath += item[correctedItemKey as keyof DB.Item.News];

                       
                    // }
                    
                    // throw `item: ${JSON.stringify(item)}`

                    const itemFiles: {[key: string ]: string} = {
                        narration: `${subFolders.narration}${item.file_name}`,
                        background: path.resolve(subFolders.dynamic_backgrounds.replace('$item_specific_sport_name',item.sport_name),item.background).replace(/\\/g, '/'),
                        logo: `${generalFolderPaths.logos.replace('$item_specific_sport_name',item.sport_name)}/${item.logo}`,
                    }

                    // throw `itemFiles: ${JSON.stringify(itemFiles, null, 2)}`

                    for (let key in itemFiles){
                        const absoluteFilePath = itemFiles[key];
                        // console.log(`absoluteFilePath for key: ${key} : ${absoluteFilePath}`);

                        if (!fs.existsSync(absoluteFilePath))
                            throw `absoluteFilePath path does not exist: ${absoluteFilePath}`;
                        files.push({
                            absolutePath: absoluteFilePath,
                            compositionName:
                                mappingFuncs[
                                    key as DB.Jobs.Mapping.ItemFileKey
                                ](item),
                            resizeAction: key === 'logo' ? 'fitToMedia' : null // 'fitToComp', // currently fitToComp is throwing an error
                        });
                    }
                }
                
                populateItemFiles();

                const hasStandings = // false;
                    !!item.show_standings && !!item.standings_league_season_id;
                // console.log(`hasStandings: ${hasStandings}`);

                if (hasStandings) {
                    /**
                     * If we have standings we throw loads of texts into the texts array
                     * 
                     * Here unfortunately we get the league_season_name
                     * in every row and need to place it once in the converted
                     * object
                     */
                    const populateStandingsTexts = async () => {
                        let standings: DB.StandingAug[] =
                            // await STANDINGS.getStandingsByLang(
                            await STANDINGS.getStandingsEN(
                                SportsDB,
                                item.sport_name!,
                                item.standings_league_season_id!,
                                // lang
                            );

                        standings = standings.slice(0, 10); // we only need the top 10

                        // console.log(`%cStandings length: ${standings.length}`, `color: pink`);
                        // console.log(`%csample: ${JSON.stringify(standings, null, 4)}`, `color: pink`);

                        // Insert ranking header over the standings table
                        // console.log(`LeagueSeason_name: ${standings[0].league_season_name}`)
                        
                        const leagueSeasonName = standings[0].league_season_name || ''; // will be inserted as text
                        const standingsHeaderLayerName = `Ranking-header-${i+1}`;
                        texts.push({
                            text: leagueSeasonName,
                            textLayerName: standingsHeaderLayerName,
                            recursiveInsertion: false,
                        });

                        // Standings title -- N, W, L
                        // structure ranking-stat${col#}-header${item#}
                        for (let j=0; j<standingTextKeys.length; j++) {
                            const standingTextKey = standingTextKeys[j];
                            if (standingTextKey === 'team_name') continue; // we don't need the team name (it's already in the item text
                            const textLayerName = `ranking-stat${j}-header${i+1}`;
                            const text: AE.Json.TextImport = {
                                text: standingTextKey.charAt(0).toUpperCase(),
                                textLayerName,
                                recursiveInsertion: false,
                            };
                            texts.push(text);
                        }

                        standings.forEach((standing, index) => {
                            //console.log(JSON.stringify(standing));
                            
                            if (index >= 10) return; // we only need the top 10

                            for (const standingTextKey of standingTextKeys) {
                                //console.log(standingTextKey);
                                
                                let standingText =
                                    standing[standingTextKey as keyof DB.StandingAug];
                                if (!standingText) standingText = ' ' // throw `No value for ${standingTextKey}`;

                                const textLayerName = mappingFuncs[
                                    standingTextKey as DB.Jobs.Mapping.StandingTextKey
                                ](item, standing);

                                const text: AE.Json.TextImport = {
                                    text: standingText, // might be a number
                                    textLayerName,
                                    recursiveInsertion: false,
                                };

                                // console.log(`%cText: ${JSON.stringify(text, null, 4)}`, 'color: pink');

                                texts.push(text);
                            }
                        });
                    }

                    await populateStandingsTexts();
                }

                //console.warn(`hasSchedule: ${item.show_next_matches} && ${item.schedule_league_season_id}`)
                const hasSchedule = !!item.show_next_matches && !!item.schedule_league_season_id;
                //console.log(`%chasSchedule: ${hasSchedule}`, 'color: Orange');

                if (hasSchedule) {
                    // const populateScheduleTexts = async () => {
                    //     let schedule: DB.NextMatch_WithTeamNames[] = await NEXTMATCHES.getBySportNameAndLeagueSeasonId(
                    //         DB,
                    //         item.sport_name!,
                    //         item.schedule_league_season_id!
                    //     );

                    //     console.log(`%cSchedule length: ${schedule.length}`, `color: orange`);

                    //     if (schedule.length > 10) schedule = schedule.slice(0, 10); // we only need the top 10
                    //     // if (schedule.length < 10){ 
                    //     //     console.warn(`There are less than 10 matches in the schedule for sport ${item.sport_name} item ${item.id} league_season_id ${item.schedule_league_season_id}`);
                    //     //     return;
                    //     // }

                    //     for (let j=0; j<schedule.length; j++) {
                    //         const match = schedule[j];
                    //         const formatDateAndTime = () => {
                    //             // convert the mysql timestamp to a js date
                    //             const jsDate = new Date(match.start_time_timestamp);
                    //             let hours = jsDate.getHours();
                    //             const minutes = jsDate.getMinutes();
                    //             const formattedHours = hours > 12 ? hours -= 12 : hours;
                    //             const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
                    //             const AMPM = hours > 12 ? 'PM' : 'AM';

                    //             // console.log(`%cstart_time_timestamp: ${match.start_time_timestamp}`, 'color: Orange');
                                
                    //             // const splittedTimeStamp = String(match.start_time_timestamp).split('T');
                    //             // const splittedTimeStamp = jsDate.split(' ');
                    //             // const splittedDate = splittedTimeStamp[0].split('-');
                    //             // const splittedTime = splittedTimeStamp[1].split(':');
                    //             // temporarily we'll use the dd/mm/yyyy format for the date
                    //             // and hh:mm for the time
                    //             const formattedDate = `${jsDate.getDate()} ${tempMonths[jsDate.getMonth() + 1]}`;
                    //             const formattedTime = `${formattedHours}:${formattedMinutes} ${AMPM}`;
                    //             return [formattedDate, formattedTime];
                    //         }

                    //         const [formattedDate, formattedTime] = formatDateAndTime();
                            
                    //         const dateLayerName = mappingFuncs.scheduleMatchDate(i+1, j+1);
                    //         const timeLayerName = mappingFuncs.scheduleMatchTime(i+1, j+1);
                    //         const homeTeamLayerName = mappingFuncs.scheduleHomeTeam(i+1, j+1);
                    //         const awayTeamLayerName = mappingFuncs.scheduleAwayTeam(i+1, j+1);

                    //         texts.push({
                    //             text: formattedDate,
                    //             textLayerName: dateLayerName,
                    //             recursiveInsertion: false,
                    //         });
                    //         texts.push({
                    //             text: formattedTime,
                    //             textLayerName: timeLayerName,
                    //             recursiveInsertion: false,
                    //         });
                    //         texts.push({
                    //             text: match.home_team_name,
                    //             textLayerName: homeTeamLayerName,
                    //             recursiveInsertion: false,
                    //         });
                    //         texts.push({
                    //             text: match.away_team_name,
                    //             textLayerName: awayTeamLayerName,
                    //             recursiveInsertion: false,
                    //         });

                    //         console.log(`%ctime: ${formattedDate} ${formattedTime}\nhome: ${match.home_team_name} away: ${match.away_team_name}`, 'color: Cyan');
                    //     }
                        
                    // }

                    // await populateScheduleTexts();

                    /**
                     * Every team is supposed to have a logo
                     * Currently there's no mechanism for this
                     */
                    const populateScheduleFiles = async () => {
                        
                    }
                }
            } // end items for loop
        }

        await runThroughItems();

        /**
         * The trimming can be done immediately after the presenter files have been inserted
         */
        const trimPresenterFiles = () => {
            const compNames = ['Presenter Open','Presenter Close'];
            for (const compName of compNames) {
                const sync: AE.Json.TS.Trim = {
                    method: 'trimByAudio',
                    layerOrCompName: compName,
                };
                trimSyncData.push(sync);
            }
        }

        trimPresenterFiles();

        const trimNarration = () => {
            // firstly we trim the narration comps
            for (let i = 1; i <= 5; i++) {
                const narrationCompName = `News-Narration${i}`;
                const trim: AE.Json.TS.Trim = {
                    method: 'trimByAudio',
                    layerOrCompName: narrationCompName,
                };
                trimSyncData.push(trim);
            }
        }

        trimNarration();

        const trimSyncNews = () => {
            // now let's sync narration comps and trim the news comps
            for (let ii = 1; ii <= 2; ii++) {
                
                const syncNarrationComps = () => {
                    // first we sync the internal narration comps
                    // narration comps 1-3 are in News comp 1 and 4-5 are in News comp 2
                    
                    // we start with syncing the first narration comp
                    // to the beginning of the timeline (cause it's been trimmed)
                    const syncFirstNarrationLayerToStart = () => {
                        const narrationCompNumber = (ii - 1) * 3 + 1; // 1 or 4
                        const narrationCompName = `News-Narration${narrationCompNumber}`;
                        const sync: AE.Json.TS.Sync = {
                            method: 'syncHeadTail',
                            padding: 0.1,
                            layerAName: narrationCompName,
                            layerBName: `stickToStart${ii}`, // 1 or 2
                        };
                        trimSyncData.push(sync);
                    }
                    syncFirstNarrationLayerToStart();

                    const numberOfNarrationComps = 4 - ii;
                    for (let jj = 1; jj < numberOfNarrationComps; jj++) {
                        const narrationCompNumber = (ii - 1) * 3 + jj; // 1-2 for news 1 and 4 for news 2
                        // console.log(`narrationCompNumber: ${narrationCompNumber}`);
                        const nextNarrationCompNumber = narrationCompNumber + 1;
                        const narrationCompName = `News-Narration${narrationCompNumber}`;
                        const nextNarrationCompName = `News-Narration${nextNarrationCompNumber}`;
                        const sync: AE.Json.TS.Sync = {
                            method: 'syncHeadTail',
                            padding: 0.1,
                            layerAName: nextNarrationCompName,
                            layerBName: narrationCompName,
                        };
                        trimSyncData.push(sync);
                    }
                }
                syncNarrationComps();
                
                const syncBackgrounds = () => {
                    // Each background needs to get synced with the previous narration end
                    const numberOfBackgroundComps = 4 - ii;
                    for (let jj = 2; jj <= numberOfBackgroundComps; jj++) {
                        const backgroundCompNumber = (ii - 1) * 3 + jj; // 2-3 for news 1 and 5 for news 2
                        // console.log(`narrationCompNumber: ${narrationCompNumber}`);
                        const prevNarrationCompNumber = backgroundCompNumber - 1;
                        const backgroundCompName = `News-BG${backgroundCompNumber}`;
                        const prevNarrationCompName = `News-Narration${prevNarrationCompNumber}`;
                        const sync: AE.Json.TS.Sync = {
                            method: 'syncHeadTail',
                            padding: 0.1,
                            layerAName: backgroundCompName,
                            layerBName: prevNarrationCompName,
                        };
                        trimSyncData.push(sync);
                    }
                }
                syncBackgrounds();

                const newsCompName = `News comp ${ii}`;
                const trim: AE.Json.TS.Trim = {
                    method: 'trimByAudio',
                    layerOrCompName: newsCompName,
                };
                trimSyncData.push(trim);

                /**
                 * Now we sync the markers of Todays news ${i}
                 * with the ends of the previous narration comps
                 */
                const relocateMarkers = () => {
                    const markerLayerName = `Todays news ${ii}`;
                    let soundMarkerLayerNames: string[] = [];
                    const numberOfNarrationComps = 4 - ii;
                    for (let kk = 1; kk < numberOfNarrationComps; kk++) {
                        const narrationCompNumber = (ii - 1) * 3 + kk; // 1-2 for news 1 and 4 for news 2
                        // console.log(`narrationCompNumber: ${narrationCompNumber}`);
                        const narrationCompName = `News-Narration${narrationCompNumber}`;
                        soundMarkerLayerNames.push(narrationCompName);
                    }
                    
                    const sync: AE.Json.TS.SyncMarker = {
                        method: 'markersSync',
                        padding: 0,
                        layerAName: markerLayerName,
                        layerBName: soundMarkerLayerNames,
                    };
                    trimSyncData.push(sync);
                }

                relocateMarkers();
            }
        }

        trimSyncNews();

        /**
         * We're done with inserting files and texts
         * and we're done with trimming narration and presenters
         * and syncing the news items internally (syncing the layers IN the news comps)
         * now it's time to sync the main comp layers
         * 
         * Syncing is done by pulling the next layer's start 
         * to the previous layer's end.
         * 
         * we'll start with Presenter Open to Intro
         * then News comp 1 to Presenter Open
         * then News comp 2 to News comp 1
         * then Presenter Close to News comp 2
         * 
         * Once all that's done we sync the soundtrack
         * and the markers
         */
        const syncMainCompLayers = () => {
            // Presenter Open to Intro
            trimSyncData.push({
                method: 'syncHeadTail',
                padding: 0,
                layerAName: 'Presenter Open',
                layerBName: 'Intro',
            });

            // News comp 1 to Presenter Open
            trimSyncData.push({
                method: 'syncHeadTail',
                padding: 0,
                layerAName: 'News comp 1',
                layerBName: 'Presenter Open',
            });

            // News comp 2 to News comp 1
            trimSyncData.push({
                method: 'syncHeadTail',
                padding: 0,
                layerAName: 'News comp 2',
                layerBName: 'News comp 1',
            });
            
            // Presenter Close to News comp 2
            trimSyncData.push({
                method: 'syncHeadTail',
                padding: 0,
                layerAName: 'Presenter Close',
                layerBName: 'News comp 2',
            });

            // Ending to Presenter Close via single marker
            trimSyncData.push({
                method: 'syncMarkerToOutPoint',
                padding: 0,
                layerAName: 'Ending',
                layerBName: 'Presenter Close',
            });

            const syncTransitions = () => {
                const transitionLayerNames = [
                    'trans-presOpen-news1',
                    'trans-news1-news2',
                    'trans-news2-presClose',
                ];

                const syncToLayers = [
                    'Presenter Open',
                    'News comp 1',
                    'News comp 2',
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
                    layerAName: 'Sound ending',
                    layerBName: 'Presenter Close',
                }
                trimSyncData.push(syncMarker);

                // now we trim the loop to the beginning of
                // the sound ending
                const trim: AE.Json.TS.Trim = {
                    method: 'trimOutToIn',
                    layerOrCompName: 'Intro news III Loop',
                    trimToLayer: 'Sound ending',
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
            trimToLayer: 'Ending',
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