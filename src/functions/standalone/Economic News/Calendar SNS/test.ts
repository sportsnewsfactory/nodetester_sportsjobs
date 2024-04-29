import axios from "axios";
import { MYSQL_DB } from "../../../../classes/MYSQL_DB";
import { RenderMachine } from "../../../../types/RenderMachine";
import identifyRenderMachine from "../../../identifyRenderMachine";
import { Calendar } from "./AE/CalendarTypes";
import { EditionMetaV2 } from "./types/EditionMeta";
import { Lang } from "./types/Lang";
import { LangScheme } from "./types/LangScheme";
import { AE } from "../../../../types/AE";

/**
 * Here we'll grab the English data
 * and throw it to victor using @type {Json.payload}
 */
export async function testCalendarSNSAE(){
    const PORT = 9411;
    const API_Endpoint = '/api/extboiler/';
    
    const relevantTableNames = {
        langs: 'economicnews.ECN_CORE_langs',
        langSchemes: 'economicnews.ECN_CORE_L1_langSchemes',
        editionsMeta: 'economicnews.ECN_CORE_L2_editionsMeta',
        economicCalendarDataEN: 'economicnews.ECN_CORE_econCalEN',
    }
    
    const DB = new MYSQL_DB();
    DB.createPool();

    const schemeName = 'ENF';
    const langCode = 'EN';
    const editionName = 'Academy100 EN';

    try {
        const renderMachine: RenderMachine = await identifyRenderMachine(DB);
        
        const langs = await DB.SELECT<Lang>(
            relevantTableNames.langs, 
            { whereClause: { langCode }}
        );

        if (langs.length !== 1) 
            throw new Error(`Expected 1 lang, got ${langs.length}`); 

        const lang = langs[0];
        
        const langSchemes = await DB.SELECT<LangScheme>(
            relevantTableNames.langSchemes,
            { whereClause: { schemeName }}
        );

        if (langSchemes.length !== 1) 
            throw new Error(`Expected 1 langScheme, got ${langSchemes.length}`);

        const langScheme = langSchemes[0];
        
        const editionMeta = await DB.SELECT<EditionMetaV2>(
            relevantTableNames.editionsMeta,
            { whereClause: { editionName, schemeName }}
        );

        if (editionMeta.length !== 1) 
            throw new Error(`Expected 1 editionMeta, got ${editionMeta.length}`);

        const edition = editionMeta[0];

        const allCalendarItemsEN = await DB.SELECT<Calendar.DBItem>(
            relevantTableNames.economicCalendarDataEN,
        );

        let texts: AE.Json.TextImport[] = [];

        for (let item of allCalendarItemsEN) {
            console.log(JSON.stringify(item));
        }

        let payload: AE.Json.Payload = {
            files: [],
            texts: [],
            trimSyncData: [],
            names: {
                exportComp: '0_Main comp',
                importBin: 'Imports',
            },
            paths: {
                exportFile: 'C:/Users/alexa/Desktop/Exports/CalendarData.json',
                projectFile: 'C:/Users/alexa/Desktop/Exports/CalendarData.aep',
                projectSaveFile: 'C:/Users/alexa/Desktop/Exports/CalendarData.aep',
            },
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

        // const axiosResponse = await axios.post(
        //     `http://localhost:${PORT}${API_Endpoint}`,
        //     { stringifiedJSON: jsoned }
        // );
        // console.log(JSON.stringify(axiosResponse.data));
    } catch (e) {
        console.error(e);
    } finally {
        await DB.pool.end();
    }
}
