/**
 * This is the MOTORSPORT only edition
 * we'll be doing english so no need for translation
 */

import fs from 'fs';
import axios from 'axios';

import { MYSQL_DB } from '../../classes/MYSQL_DB';
import { GENERALNEWS } from '../GENERALNEWS';
import identifyRenderMachine from '../identifyRenderMachine';
import { AE } from '../../types/AE';
import { DB } from '../../types/DB';
import { PATHS } from '../PATHS';
import { DailyPresenterScheme, getDailyPresenterScheme, getPresenterSchemeFiles } from '../Presenters';
import { CORE } from '../../types/CORE';
import { coreTables } from '../../constants/coreTables';
import { getBrandEditionProduct } from '../helper/getBrandEditionProduct';
import { buildAbsoluteSubfolderStructure__AE } from '../helper/buildAbsoluteSubfolderStructure';
import path from 'path';
import { TMPTables } from '../../constants/templateTables';
import { Template } from '../../types/CORE/Template';
import { populateNewsElements } from './populateNewsElements';
import { newsClusterLevel } from './process/newsClusterLevel';
import { getGeneralPaths } from './components/getGeneralPaths';
import { Paths } from '../../types/CORE/Paths';
import { getSubfolderStrucure } from './components/getSubfolderStructure';
import { MOTORSPORT_STANDINGS } from '../MOTORSPORT_STANDINGS';
import { getMotorsportStandings } from './components/getStandings';
import { populateStandingsElements } from './populateStandingsElementsR2RObsolete';
import { Motorsport } from '../../types/Motorsport';
import { getMotorsportSchedule } from './components/getSchedule';
import { populateScheduleElements } from './populateScheduleElements';

/**
 * Testing Race2Real AE daily edition with the new core tables
 */
export async function Race2Real_AE_daily_news__MOTORSPORT_EN() {    
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
        const lang: CORE.Keys.Lang = 'EN';
        const renderMachine: DB.RenderMachine = await identifyRenderMachine(SportsDB);
        const sportName: DB.SportName = 'Motorsport';

        // WILL CHANGE TO motorsport1
        const templateName: string = 'mixed-sports1';

        const PORT = 9411;
        const API_Endpoint = '/api/extboiler/';

        const now = new Date();
        // target date is tomorrow if after 17:00
        const targetDate = now.getHours() > 17 ? new Date(now.getTime() + 24*60*60*1000) : now;

        const options = { day: '2-digit', month: 'short', year: 'numeric' } as Intl.DateTimeFormatOptions;
        const introDate = targetDate.toLocaleDateString('en-US', options);

        let texts: AE.Json.TextImport[] = [];
        let files: AE.Json.FileImport[] = [];
        let trimSyncData: AE.Json.TS.Sequence = [];

        // HARDCODED-MODIFY
        texts.push({
            text: introDate,
            textLayerName: 'introdate',
            recursiveInsertion: true,
        });

        const {brand, edition, product} = 
            await getBrandEditionProduct(SportsDB, brand_name, product_name, lang, sportName);

        // console.log(`brand: ${JSON.stringify(brand, null, 4)}`);
        // console.log(`edition: ${JSON.stringify(edition, null, 4)}`);
        // console.log(`product: ${JSON.stringify(product, null, 4)}`);

        // return;
        const generalFolderPaths: Paths.GeneralFolders =
            await getGeneralPaths(renderMachine, SportsDB);

        /** 
         * get the buleprint of the subfolder structure for the given product.
         */
        let productSubfolders: CORE.AE.ProductSubFolder[] = 
            await SportsDB.SELECT(coreTables.product_subfolders,
            {whereClause: {product_name: edition.product_name}}
        );

        const subFolders = getSubfolderStrucure(
            productSubfolders, renderMachine, edition, brand, product, generalFolderPaths
        );
        
        // console.log(`subFolders: ${JSON.stringify(subFolders, null, 4)}`);
        // return;

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
            await getDailyPresenterScheme(SportsDB, edition, targetDate, subFolders.presenters);
        
        /**
         * CONVERT LAYER TO SOURCES IN DB
         * we want wherever there's a file to be inserted
         * the formula to get to the filepath must be in the DB
         * This is another BIG STEP
         */
        let RAW_DATA = {
            presenter: dailyPresenterFilePaths,
        }

        const newsItemElements: Template.Element.DB_Blueprint[] = 
            objectElements
                .filter(e => e.object_name === 'news-item')
                .map(e => elementBluePrints.find(b => b.element_name === e.element_name) as Template.Element.DB_Blueprint);

        const standingsElements: Template.Element.DB_Blueprint[] = 
            objectElements
                .filter(e => e.object_name === 'standings-entry-MS')
                .map(e => elementBluePrints.find(b => b.element_name === e.element_name) as Template.Element.DB_Blueprint);

        const scheduleElements: Template.Element.DB_Blueprint[] =
            objectElements
                .filter(e => e.object_name === 'schedule-entry-MS')
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

        let leagueSeasonsIds: (string | null)[] = 
            newsItems.map((item, index) => {
                // console.warn(`item ${index}: ${item.headline} show standings: ${!!item.show_standings} show next matches: ${!!item.show_next_matches}`);
                if (!!item.show_next_matches && !!item.show_standings) return item.schedule_league_season_id;
                else return null;
            });

        // console.log(`leagueSeasonsIds: ${JSON.stringify(leagueSeasonsIds, null, 4)}`);
        // return;

        const motorsportStandings: Motorsport.Standings.List[] = 
            await getMotorsportStandings(SportsDB, leagueSeasonsIds);

        const motorsportsSchedule: Motorsport.Schedule.List[] =
            await getMotorsportSchedule(SportsDB, leagueSeasonsIds);

        // console.log(`Standings list length: ${motorsportStandings.length}`);
        // console.log(`Schedule list length: ${motorsportsSchedule.length}`);

        // return;

        // for (let i=0; i<5; i++){
        //     const standingsList: Motorsport.Standings.List = motorsportStandings[i];
        //     const scheduleList: Motorsport.Schedule.List = motorsportsSchedule[i];
        //     console.log(`%cstandings entries for list #${i+1}: ${standingsList.entries.length}`, `color: orange`);
        //     console.log(`%cschedule entries for list #${i+1}: ${scheduleList.events.length}`, `color: yellow`);
        // }

        // return;

        populateStandingsElements(
            motorsportStandings,
            standingsElements,
            texts,
        )

        populateScheduleElements(
            motorsportsSchedule,
            scheduleElements,
            texts
        )
        // return;

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
        }

        // HARDCODED-MODIFY
        const syncMainCompLayers = () => {
            // trim presenter containers
            const presenteropenTrim: AE.Json.TS.Trim = {
                method: 'trimByAudio',
                layerOrCompName: 'presenter-open-container',
            };
            trimSyncData.push(presenteropenTrim);
            const presentercloseTrim: AE.Json.TS.Trim = {
                method: 'trimByAudio',
                layerOrCompName: 'presenter-close-container',
            };
            trimSyncData.push(presentercloseTrim);
            
            // presenter-open to Intro
            trimSyncData.push({
                method: 'syncHeadTail',
                padding: 0,
                layerAName: 'presenter-open-container',
                layerBName: 'intro',
            });

            // News comp 1 to presenter-open
            trimSyncData.push({
                method: 'syncHeadTail',
                padding: 0,
                layerAName: 'news-cluster1',
                layerBName: 'presenter-open-container',
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
                layerAName: 'presenter-close-container',
                layerBName: 'news-cluster2',
            });

            // Ending to presenter-close via single marker
            trimSyncData.push({
                method: 'syncMarkerToOutPoint',
                padding: 0,
                layerAName: 'outro',
                layerBName: 'presenter-close-container',
            });

            const syncTransitions = () => {
                const transitionLayerNames = [
                    'trans-presenter-open-container',
                    'trans-news-cluster1',
                    'trans-news-cluster2',
                ];

                const syncToLayers = [
                    'presenter-open-container',
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
                    layerBName: 'presenter-close-container',
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

        // Are we still going with random template?
        const templateFolderContent: string[] = fs.readdirSync(subFolders.templates);
        let templateFiles: string[] = templateFolderContent.filter(file => file.endsWith('.aep'));
        if (templateFiles.length === 0) throw `No templates found in folder: ${subFolders.templates}`;

        // HARDCODED-MODIFY
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