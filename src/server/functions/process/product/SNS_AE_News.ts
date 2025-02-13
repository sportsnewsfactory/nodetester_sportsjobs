import fs from 'fs';
import { MYSQL_DB } from '../../../../classes/MYSQL_DB';
import { CORE } from '../../../../types/CORE';
import { DB } from '../../../../types/DB';
import { getLang } from '../../../../functions/getLang';
import { coreTables } from '../../../../constants/coreTables';
import { TMPTables } from '../../../../constants/templateTables';
import { filterElements } from '../../../../functions/filterElements';
import { SPORTNEWS } from '../../../../functions/SPORTNEWS';
import { getIntroDate } from '../../../../functions/getIntroDate';
import identifyRenderMachine from '../../../../functions/identifyRenderMachine';
import { getGeneralPaths } from '../../../../functions/R2R/components/getGeneralPaths';
import { getSubfolderStrucure } from '../../../../functions/R2R/components/getSubfolderStructure';
import { populateNewsElements } from '../../../../functions/R2R/populateNewsElements';
import { LEGACY__syncMainCompLayersSNS } from '../../../../functions/R2R/process/LEGACY__mainLayersSNS';
import { newsClusterLevel } from '../../../../functions/R2R/process/newsClusterLevel';
import { processTemplateElementsNoPresenters } from '../../../../functions/R2R/process/templateElementsNoPresenters';
import { selectMixedNews } from '../../../../functions/selectMixedNews';
import { AE } from '../../../../types/AE';
import { Paths } from '../../../../types/CORE/Paths';
import { Template } from '../../../../types/CORE/Template';
import { processPayloadWithDBG } from '../payload';
import { GenericProcessProps } from '../EDIT';
import getNewsItemsByEdition from '../../get/newsItemsByEdition';

export default async function process__SNS_AE_News({
    SportsDB,
    BackofficeDB,
    brand,
    edition,
    product,
    dbgLevel = -7,
}: GenericProcessProps): Promise<string> {
    const funcName = 'process__SNS_AE_News';

    try {
        const lang: DB.Lang = await getLang(SportsDB, edition.lang);
        const renderMachine: DB.RenderMachine = await identifyRenderMachine(
            SportsDB
        );
        const sportName: DB.SportName = 'Basketball';
        const templateName: string = 'mixed-sports1';

        const PORT = 9411;
        const API_Endpoint = '/api/extboiler/';

        let texts: AE.Json.TextImport[] = [];
        let files: AE.Json.FileImport[] = [];
        let trimSyncData: AE.Json.TS.Sequence = [];

        const { introDate, targetDate } = getIntroDate(lang.date_format);

        // HARDCODED-MODIFY
        texts.push({
            text: introDate,
            textLayerName: 'introdate',
            recursiveInsertion: true,
        });

        // const {brand, edition, product} =
        //     await getBrandEditionProduct(SportsDB, brand_name, product_name, langCode, sportName);

        const generalFolderPaths: Paths.GeneralFolders = await getGeneralPaths(
            renderMachine,
            SportsDB
        );

        /**
         * get the buleprint of the subfolder structure for the given product.
         */
        let productSubfolders: CORE.AE.ProductSubFolder[] =
            await SportsDB.SELECT(coreTables.product_subfolders, {
                whereClause: { product_name: edition.product_name },
            });

        const subFolders = getSubfolderStrucure(
            productSubfolders,
            renderMachine,
            edition,
            brand,
            product,
            generalFolderPaths
        );

        const templateMainLayers = await BackofficeDB.SELECT(
            TMPTables.templateMainLayers,
            { whereClause: { template_name: templateName } }
        );
        let templateClusters: Template.Record.Cluster[] =
            await BackofficeDB.SELECT(TMPTables.templateClusters, {
                whereClause: { template_name: templateName },
            });

        // HARDCODED-MODIFY
        // removing manually the second cluster
        templateClusters = templateClusters.filter(
            (t) => t.cluster_index === 1
        );

        let templateElements: Template.Record.Element[] =
            await BackofficeDB.SELECT(TMPTables.templateElements, {
                whereClause: { template_name: templateName },
            });
        // HARDCODED-MODIFY
        // removing manually presenter elements
        templateElements = templateElements.filter(
            (t) => t.element_name !== 'presenter'
        );

        const objectElements: Template.Obj.Element[] =
            await BackofficeDB.SELECT(TMPTables.objectElements);
        const elementBluePrints: Template.Element.DB_Blueprint[] =
            await BackofficeDB.SELECT(TMPTables.elements);
        const objects: Template.Obj[] = await BackofficeDB.SELECT(
            TMPTables.objects
        );
        const elementActions: Template.Element.Action[] =
            await BackofficeDB.SELECT(TMPTables.elementActions);
        const clusterActions: Template.Cluster.Action[] =
            await BackofficeDB.SELECT(TMPTables.clusterActions);

        /**
         * We'll start with getting our raw data
         * then we will manipulate the data to fit the actions scheme
         * and then we'll export a sample json file.
         */
        // const allNewsItems: {[key in DB.SportName]: DB.Item.JoinedNews[]} =
        //     await SPORTNEWS.getTransItemsByLangAndSport(SportsDB, edition.lang);

        // console.log(JSON.stringify(allNewsItems.Basketball, null, 4));

        // console.log(Object.keys(allNewsItems).join(', '))
        // return;

        /**
         * @param newsItems and @param presenterFiles
         * contain all of the raw data we need
         */
        const newsItems: DB.Item.JoinedNews[] = await getNewsItemsByEdition({
            DB: SportsDB,
            edition,
            lang,
            targetDate,
        });
        // const newsItems: DB.Item.JoinedNews[] =
        //     await selectMixedNews(allNewsItems);
        // console.log(`newsItems: ${JSON.stringify(newsItems, null, 4)}`);
        // return;

        // console.log(`subFolders.presenters: ${JSON.stringify(subFolders.presenters, null, 4)}`);
        // return;
        // const dailyPresenterFilePaths: DailyPresenterScheme =
        //     await getDailyPresenterScheme(SportsDB, edition, targetDate, subFolders.presenters);

        /**
         * CONVERT LAYER TO SOURCES IN DB
         * we want wherever there's a file to be inserted
         * the formula to get to the filepath must be in the DB
         * This is another BIG STEP
         */
        // let RAW_DATA = {
        //     presenter: dailyPresenterFilePaths,
        // }

        const { newsItemElements, standingsElements, scheduleElements } =
            filterElements(objectElements, elementBluePrints);

        const threeFirstItems = newsItems.slice(0, 3);

        /**
         * Here we perform the element-level actions of the news items
         * These actions involve files and texts and insert and trimming actions
         */
        const populateLog: string = populateNewsElements(
            threeFirstItems,
            generalFolderPaths,
            newsItemElements,
            elementActions,
            texts,
            files,
            trimSyncData,
            targetDate
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

        processTemplateElementsNoPresenters(
            templateElements,
            elementBluePrints,
            elementActions,
            templateName,
            files,
            trimSyncData
        );

        // console.log(`trimSyncData: ${JSON.stringify(trimSyncData, null, 4)}`);
        // return;

        LEGACY__syncMainCompLayersSNS(trimSyncData);

        // Are we still going with random template?
        // const templateFolderContent: string[] = fs.readdirSync(subFolders.templates);
        // let templateFiles: string[] = templateFolderContent.filter(file => file.endsWith('.aep'));
        // if (templateFiles.length === 0) throw `No templates found in folder: ${subFolders.templates}`;

        // HARDCODED-MODIFY
        // set workarea
        const trim: AE.Json.TS.Trim = {
            method: 'trimWorkareaToLayerOut',
            layerOrCompName: '0_Main comp',
            trimToLayer: 'outro',
        };
        trimSyncData.push(trim);

        const axiosResponse = await processPayloadWithDBG(
            files,
            texts,
            trimSyncData,
            subFolders,
            edition,
            PORT,
            API_Endpoint,
            lang.allowed_chars,
            dbgLevel
        );

        return `${funcName}:\npopulateLog:\n${populateLog}\n${JSON.stringify(
            axiosResponse.data
        )}`;
    } catch (e) {
        return `${funcName}: ${e}`;
    }
}
