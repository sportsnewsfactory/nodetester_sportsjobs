import { CORE } from '../../../../types/CORE';
import { coreTables } from '../../../../constants/coreTables';
import { TMPTables } from '../../../../constants/templateTables';
import { filterElements } from '../../../../functions/filterElements';
import { getIntroDate } from '../../../../functions/getIntroDate';
import { getLang } from '../../../../functions/getLang';
import { getStandingsScheduleLists } from '../../../../functions/getStandingsScheduleLists';
import identifyRenderMachine from '../../../../functions/identifyRenderMachine';
import {
    DailyPresenterScheme,
    getDailyPresenterScheme,
} from '../../../../functions/Presenters';
import { getGeneralPaths } from '../../../../functions/R2R/components/getGeneralPaths';
import { getSubfolderStrucure } from '../../../../functions/R2R/components/getSubfolderStructure';
import { populateNewsElements } from '../../../../functions/R2R/populateNewsElements';
import { populateScheduleElements__TESTING } from '../../../../functions/R2R/populateScheduleElementsCWINZexperiment';
import { populateStandingsElements } from '../../../../functions/R2R/populateStandingsElements';
import { LEGACY__syncMainCompLayers } from '../../../../functions/R2R/process/LEGACY__mainLayers';
import { newsClusterLevel } from '../../../../functions/R2R/process/newsClusterLevel';
import { processTemplateElements } from '../../../../functions/R2R/process/templateElements';
import { AE } from '../../../../types/AE';
import { Paths } from '../../../../types/CORE/Paths';
import { Template } from '../../../../types/CORE/Template';
import { DB } from '../../../../types/DB';
import { processPayloadWithDBG } from '../payload';
import { GenericProcessProps } from '../EDIT';
import getNewsItemsByEdition from '../../get/newsItemsByEdition';
import { VictorResult } from './processVictorResult';
import { processPayloadWithVictorResult } from './processPayloadWithVictorResult';
import { PATHS } from '../../../../functions/PATHS';

export async function process__AE_Daily_News__AERENDER({
    TD,
    SportsDB,
    BackofficeDB,
    brand,
    edition,
    product,
    dbgLevel = -7,
}: GenericProcessProps): Promise<VictorResult> {
    const funcName = 'process__AE_Daily_News__AERENDER';

    try {
        // const brand_name: string = 'CWINZ';
        // const product_name: CORE.Keys.Product = 'AE_Daily_News';
        // const langCode: string = 'AR';
        const lang: DB.Lang = await getLang(SportsDB, edition.lang);
        const renderMachine: DB.RenderMachine = await identifyRenderMachine(
            SportsDB
        );
        const templateName: string = 'mixed-sports1';

        const PORT = 9411;
        const API_Endpoint = '/api/extboiler/';

        const payloadCoreData: Omit<
            AE.Json.Payload,
            'names' | 'paths' | 'dbgLevel'
        > = {
            texts: [],
            files: [],
            trimSyncData: [],
            aeRenderSeq: ['H.264 - Match Render Settings - 15 Mbps'],
        };

        const { introDate, targetDate } = getIntroDate(lang.date_format);

        // HARDCODED-MODIFY
        payloadCoreData.texts.push({
            text: introDate,
            textLayerName: 'introdate',
            recursiveInsertion: true,
        });

        // const {brand, edition, product} =
        //     await getBrandEditionProduct(SportsDB, brand_name, product_name, langCode);

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

        // const templateMainLayers = await BackofficeDB.SELECT(TMPTables.templateMainLayers, {whereClause: {template_name: templateName}});
        const templateClusters: Template.Record.Cluster[] =
            await BackofficeDB.SELECT(TMPTables.templateClusters, {
                whereClause: { template_name: templateName },
            });
        const templateElements: Template.Record.Element[] =
            await BackofficeDB.SELECT(TMPTables.templateElements, {
                whereClause: { template_name: templateName },
            });
        const objectElements: Template.Obj.Element[] =
            await BackofficeDB.SELECT(TMPTables.objectElements);
        const elementBluePrints: Template.Element.DB_Blueprint[] =
            await BackofficeDB.SELECT(TMPTables.elements);
        // const objects: Template.Obj[] = await BackofficeDB.SELECT(TMPTables.objects);
        const elementActions: Template.Element.Action[] =
            await BackofficeDB.SELECT(TMPTables.elementActions);
        const clusterActions: Template.Cluster.Action[] =
            await BackofficeDB.SELECT(TMPTables.clusterActions);

        // new newsItems fetching method 050924
        const newsItems: DB.Item.JoinedNews[] = await getNewsItemsByEdition({
            DB: SportsDB,
            edition,
            lang,
            targetDate,
        });

        // throw JSON.stringify(newsItems, null, 4);

        const dailyPresenterFilePaths: DailyPresenterScheme =
            await getDailyPresenterScheme(
                SportsDB,
                edition,
                targetDate,
                subFolders.presenters
            );

        /**
         * CONVERT LAYER TO SOURCES IN DB
         * we want wherever there's a file to be inserted
         * the formula to get to the filepath must be in the DB
         * This is another BIG STEP
         */
        let RAW_DATA = {
            presenter: dailyPresenterFilePaths,
        };

        const { newsItemElements, standingsElements, scheduleElements } =
            filterElements(objectElements, elementBluePrints);

        const { standingsLists, scheduleLists } =
            await getStandingsScheduleLists(SportsDB, newsItems);

        /**
         * Here we perform the element-level actions of the news items
         * These actions involve files and texts and insert and trimming actions
         */
        const populateLog: string = populateNewsElements(
            newsItems,
            generalFolderPaths,
            newsItemElements,
            elementActions,
            payloadCoreData.texts,
            payloadCoreData.files,
            payloadCoreData.trimSyncData,
            targetDate
        );

        populateStandingsElements(
            standingsLists,
            standingsElements,
            payloadCoreData.texts
        );

        populateScheduleElements__TESTING(
            scheduleLists,
            scheduleElements,
            payloadCoreData.texts,
            lang.date_format
        );

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
            payloadCoreData.trimSyncData
        );

        processTemplateElements(
            templateElements,
            elementBluePrints,
            elementActions,
            templateName,
            payloadCoreData.files,
            payloadCoreData.trimSyncData,
            RAW_DATA
        );

        LEGACY__syncMainCompLayers(payloadCoreData.trimSyncData);

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
        payloadCoreData.trimSyncData.push(trim);

        // const axiosResponse = await processPayloadWithDBG(
        //     files,
        //     texts,
        //     trimSyncData,
        //     subFolders,
        //     edition,
        //     PORT,
        //     API_Endpoint,
        //     lang.allowed_chars,
        //     dbgLevel
        // );

        const { files, texts, trimSyncData, aeRenderSeq } = payloadCoreData;

        // const paths = {
        //     exportFile: `E:/GivTrade EN folder/AE/`,
        //     projectFile: `E:/GivTrade EN folder/AE/GivTrade EN backup.aep`,
        //     projectSaveFile: `E:/GivTrade EN folder/AE/GivTrade EN backup.mp4`,
        // };

        // const paths = {
        //     exportFile: subFolders.exports,
        //     projectFile: subFolders.templates,
        //     projectSaveFile: subFolders.exports,
        // };

        const paths = PATHS.getAll__CORE(subFolders, edition);

        const victorResult: VictorResult = await processPayloadWithVictorResult(
            files,
            texts,
            trimSyncData,
            PORT,
            API_Endpoint,
            dbgLevel,
            paths,
            'Imports',
            '0_Main comp',
            aeRenderSeq
        );

        console.log(
            `%c${JSON.stringify(victorResult, null, 4)}`,
            'color: yellow'
        );

        return victorResult;
    } catch (e) {
        throw `${funcName}: ${e}`;
    }
}
