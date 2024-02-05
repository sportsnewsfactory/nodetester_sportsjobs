/**
 * Here we'll convert data from the DB to a Json.Payload object
 */

import { MYSQL_DB } from './classes/MYSQL_DB';
import { GENERALNEWS } from './functions/GENERALNEWS';
import { JOBS } from './functions/JOBS';
import { STANDINGS } from './functions/STANDINGS';
import identifyRenderMachine from './functions/identifyRenderMachine';
import { AE } from './types/AE';
import { DB } from './types/DB';
import { RenderMachine } from './types/RenderMachine';
import { SportEdition } from './types/SportEdition';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { EDITIONS } from './functions/EDITIONS';
import { FOLDERS } from './functions/FOLDERS';

async function main() {
    //console.log('hi');
    const DB = new MYSQL_DB();
    DB.createPool();

    try {
        const editions = await EDITIONS.getAll(DB);
        const folders = await FOLDERS.getAll(DB);
        const renderMachine: RenderMachine = await identifyRenderMachine(DB);

        const PORT = 9411;
        const API_Endpoint = '/api/extboiler/';

        // const lang = 'HI';

        // const narrationFolderPath = path.resolve(
        //     renderMachine.drive_path,
        //     'Sports',
        //     'S_Studio',
        //     'S_S_Narration',
        //     'S_S_N_Mixed',
        //     'HI'
        // );
        // const backgroundFolderPath = path.resolve(
        //     renderMachine.drive_path,
        //     'Sports',
        //     'S_Studio',
        //     'S_S_Backgrounds'
        // );
        // const logoFolderPath = path.resolve(
        //     renderMachine.drive_path,
        //     'Sports',
        //     'S_Studio',
        //     'S_S_Logos'
        // );

        // verify all exist
        const narrationFolderExists = fs.existsSync(narrationFolderPath);
        if (!narrationFolderExists)
            throw `Narration folder path does not exist: ${narrationFolderPath}`;
        const backgroundFolderExists = fs.existsSync(backgroundFolderPath);
        if (!backgroundFolderExists)
            throw `Background folder path does not exist: ${backgroundFolderPath}`;
        const logoFolderExists = fs.existsSync(logoFolderPath);
        if (!logoFolderExists)
            throw `Logo folder path does not exist: ${logoFolderPath}`;

        let texts: AE.Json.TextImport[] = [];
        let files: AE.Json.FileImport[] = [];
        let trimSyncData: AE.Json.TS.Sequence = [];
        const paths: AE.Json.AbsolutePath.Obj = {
            exportFile: `${renderMachine.drive_path}Sports/S_Studio/mixed edition test export/export test.mp4`,
            projectFile: `${renderMachine.qnap_path}Studio/Sports/S_Victor Projects/S_V_AE Projects/General sports reduced folder collected/General sports reduced AE241.aep`,
            projectSaveFile: `${renderMachine.drive_path}Sports/S_Studio/mixed edition test save/save test.aep`,
        };

        // console.log(`renderMachine: ${JSON.stringify(renderMachine)}`);
        // return;
        // const jobs: DB.Job[] = await JOBS.test(DB);
        // console.log(`jobs: ${JSON.stringify(jobs[0])}`);
        // return;

        // const targetShape: AE.Json.Payload
        /**
         * Firstly we'll construct the data sorted by the items
         */
        const transitionShape: SportEdition.Mixed.NewsItem[] = [];

        const items: DB.Item.GeneralNews[] =
            await GENERALNEWS.getTransItemsByLang(DB, lang);
        //const item = items[2];
        for (const item of items) {
            const narrationFilePath = path.resolve(
                narrationFolderPath,
                `${lang}${item.id}.wav`
            );
            if (!fs.existsSync(narrationFilePath))
                throw `Narration file path does not exist: ${narrationFilePath}`;

            let converted: SportEdition.Mixed.NewsItem = {
                meta: {
                    id: Number(item.id),
                    lang,
                    when_created: item.when_created,
                },
                texts: {
                    headline: item.headline,
                    sub_headline: item.sub_headline,
                    narration: item.narration,
                },
                footage: {
                    background: item.background,
                    logo: item.logo,
                },
                audio: {
                    narrationFile: narrationFilePath,
                },
                obj: {
                    standings: null,
                },
            };
            const hasStandings =
                !!item.show_standings && !!item.league_season_id;
            // console.log(`hasStandings: ${hasStandings}`);

            if (hasStandings) {
                /**
                 * Here unfortunately we get the league_season_name
                 * in every row and need to place it once in the converted
                 * object
                 */
                const standings: DB.StandingAug[] =
                    await STANDINGS.getStandingsByLang(
                        DB,
                        item.sport_name!,
                        item.league_season_id!,
                        'HI'
                    );
                converted.obj.standings = {
                    text: {
                        leagueSeasonName: standings[0].league_season_name, // will be inserted as text
                    },
                    rows: standings.map((standing) => {
                        return {
                            text: {
                                teamName: standing.team_name,
                                position: standing.position,
                                wins: standing.wins,
                                losses: standing.losses,
                            },
                        };
                    }),
                };
            }
            transitionShape.push(converted);
        }

        for (const item of transitionShape) {
            // console.log(`item: ${JSON.stringify(item)}`);
            // now we map each text, file and trimSync to the AE.Json.Payload
            const parentCompNumber = item.meta.id <= 3 ? 1 : 2; // items 1-3 are in News comp 1, items 4-5 are in News comp 2
            const parentCompName = `News comp ${parentCompNumber}`;

            // first we map the texts
            for (const textKey in item.texts) {
                let textLayerName = '';
                switch (textKey) {
                    case 'headline':
                        textLayerName = `Headline${item.meta.id}`;
                        break;
                    case 'sub_headline':
                        textLayerName = `headlinetext${item.meta.id}1`;
                        break;
                    default:
                        continue;
                }
                const text: AE.Json.TextImport = {
                    text: item.texts[
                        textKey as keyof SportEdition.Mixed.NewsItem['texts']
                    ],
                    textLayerName,
                    recursiveInsertion: false,
                };
                texts.push(text);
            }

            // now we map the footage files
            for (const fileKey in item.footage) {
                let compositionName = '';
                let fileType = '';
                let sourceFolder = '';
                switch (fileKey) {
                    case 'background':
                        compositionName = `News-BG${item.meta.id}`;
                        fileType = '.mp4';
                        sourceFolder = backgroundFolderPath;
                        break;
                    case 'logo':
                        compositionName = `News-logo${item.meta.id}`;
                        fileType = '.png';
                        sourceFolder = logoFolderPath;
                        break;
                    default:
                        continue;
                }
                const absolutePath = path.resolve(
                    sourceFolder,
                    `${item.footage[fileKey]}${fileType}`
                );
                const filePathExists: boolean = fs.existsSync(absolutePath);
                if (!filePathExists)
                    throw `${fileKey} file path does not exist: ${absolutePath} for item #${item.meta.id}`;

                const file: AE.Json.FileImport = {
                    absolutePath,
                    compositionName,
                    resizeAction: 'fitToComp',
                };
                files.push(file);
            }

            // insert narraion files
            for (const fileKey in item.audio) {
                const compositionName = `News-Narration${item.meta.id}`;
                const fileType = '.wav';
                const sourceFolder = narrationFolderPath;
                const absolutePath = path.resolve(
                    sourceFolder,
                    `${lang}${item.meta.id}${fileType}`
                );
                const filePathExists: boolean = fs.existsSync(absolutePath);
                if (!filePathExists)
                    throw `Audio file path does not exist: ${absolutePath}`;

                const file: AE.Json.FileImport = {
                    absolutePath,
                    compositionName,
                    resizeAction: null,
                };
                files.push(file);

                // for every audio file we add a trim action
                // and we sync all narration compositions within the same parent comp
                // all sync actions for narration comps will occur after all trim actions
                // and after syncing all narration comps we'll trim and sync the news comps
                const trim: AE.Json.TS.Trim = {
                    method: 'trimByAudio',
                    layerOrCompName: compositionName,
                };
                trimSyncData.push(trim);
            }
        }

        // now let's sync narration comps and trim the news comps
        for (let i = 1; i <= 2; i++) {
            // first we sync the internal narration comps
            // narration comps 1-3 are in News comp 1 and 4-5 are in News comp 2
            const numberOfNarrationComps = 4 - i;
            for (let j = 1; j < numberOfNarrationComps; j++) {
                const narrationCompNumber = (i - 1) * 3 + j; // 1-2 for news 1 and 4 for news 2
                // console.log(`narrationCompNumber: ${narrationCompNumber}`);
                const nextNarrationCompNumber = narrationCompNumber + 1;
                const narrationCompName = `News-Narration${narrationCompNumber}`;
                const nextNarrationCompName = `News-Narration${nextNarrationCompNumber}`;
                const sync: AE.Json.TS.Sync = {
                    method: 'syncHeadTail',
                    padding: 0.1,
                    layerAName: narrationCompName,
                    layerBName: nextNarrationCompName,
                };
                trimSyncData.push(sync);
            }

            const newsCompName = `News comp ${i}`;
            const trim: AE.Json.TS.Trim = {
                method: 'trimByAudio',
                layerOrCompName: newsCompName,
            };
        }

        // now let's sync the news comps
        trimSyncData.push({
            method: 'syncHeadTail',
            padding: 0.1,
            layerAName: 'News comp 1',
            layerBName: 'News comp 2',
        });

        const payload: AE.Json.Payload = {
            files,
            texts,
            trimSyncData,
            names: {
                exportComp: '0_Main comp',
                importBin: 'Imports',
            },
            paths,
            dbg: {
                dbgLevel: 0,
                saveExportClose: {
                    isSave: false,
                    isExport: false,
                    isClose: false,
                },
            },
        };

        const jsoned = JSON.stringify(payload).replace(/\\\\/g, '/');
        // console.warn(jsoned);

        const axiosResponse = await axios.post(
            `http://localhost:${PORT}${API_Endpoint}`,
            { stringifiedJSON: jsoned }
        );
        console.log(JSON.stringify(axiosResponse.data));
    } catch (e) {
        console.warn(`Problem with main: ${e}`);
    } finally {
        await DB.pool.end();
    }

    // const payload: Json.Payload = {
    //     files: [],
    //     texts: [],
    //     trimSync: [],
    //     names: {
    //         exportComp: 'exportComp',
    //         importBin: 'importBin',
    //     },
    //     paths: {
    //         exportFile: 'exportFile',
    //         projectFile: 'projectFile',
    //         projectSaveFile: 'projectSaveFile',
    //     },
    // };
    // console.log(`items`, items);
    // console.log(`payload`, payload);
}

main();
