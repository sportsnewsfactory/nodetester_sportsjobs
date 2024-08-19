/**
 * This is the MOTORSPORT only edition
 * we'll be doing english so no need for translation
 */

import fs from 'fs';
import axios from 'axios';

import { MYSQL_DB } from '../../classes/MYSQL_DB';
import { GENERALNEWS, SPORTNEWS } from '../GENERALNEWS';
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
import { getMotorsportStandings } from './components/getStandings';
import { populateStandingsElements } from './populateStandingsElements';
import { Motorsport } from '../../types/Motorsport';
import { getMotorsportSchedule } from './components/getSchedule';
import { populateScheduleElements } from './populateScheduleElements';
import { STANDINGS } from '../STANDINGS';
import { Standings } from '../../types/CORE/Standings';
import { Schedule } from '../../types/CORE/Schedule';
import { NEXTMATCHES } from '../NEXTMATCHES';
import { selectMixedNews } from '../selectMixedNews';
import { getStandingsScheduleLists } from '../getStandingsScheduleLists';
import { processTemplateElements } from './process/templateElements';
import { LEGACY__syncMainCompLayers } from './process/LEGACY__mainLayers';
import { processPayload } from './process/payload';
import { filterElements } from '../filterElements';
import { populateScheduleElements__TESTING } from './populateScheduleElementsCWINZexperiment';

/**
 * Testing CWINZ AE daily edition with the new core tables
 */
export async function CWINZ_AE_daily_news__MIXED_EN() {    
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
        const brand_name: string = 'CWINZ';
        const product_name: CORE.Keys.Product = 'AE_Daily_News';
        const lang: CORE.Keys.Lang = 'EN';
        const renderMachine: DB.RenderMachine = await identifyRenderMachine(SportsDB);
        const sportName: DB.SportName = 'Football';

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
         */
        const allNewsItems: {[key in DB.SportName]: DB.Item.JoinedNews[]} = 
            await SPORTNEWS.getTransItemsByLangAndSport(SportsDB, lang);

        /**
         * @param newsItems and @param presenterFiles
         * contain all of the raw data we need
         */
        const newsItems: DB.Item.JoinedNews[] = 
            await selectMixedNews(allNewsItems);
        // console.log(`newsItems: ${JSON.stringify(newsItems, null, 4)}`);
        // return;

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

        const {newsItemElements, standingsElements, scheduleElements} = filterElements(
            objectElements,
            elementBluePrints
        );

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

        const {standingsLists, scheduleLists} = await getStandingsScheduleLists(
            SportsDB,
            newsItems,
        )

        populateStandingsElements(
            standingsLists,
            standingsElements,
            texts,
        );

        populateScheduleElements__TESTING(
            scheduleLists,
            scheduleElements,
            texts
        );

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

        processTemplateElements(
            templateElements,
            elementBluePrints,
            elementActions,
            templateName,
            files,
            trimSyncData,
            RAW_DATA
        )

        // console.log(`trimSyncData: ${JSON.stringify(trimSyncData, null, 4)}`);
        // return;

        LEGACY__syncMainCompLayers(trimSyncData);

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

        const axiosResponse = await processPayload(
            files,
            texts,
            trimSyncData,
            subFolders,
            edition,
            PORT,
            API_Endpoint
        );

        console.log(JSON.stringify(axiosResponse.data));
    } catch (error) {
        console.error(error);
    } finally {
        await SportsDB.pool.end();
        await BackofficeDB.pool.end();
    }
}