/**
 * Here we'll convert data from the DB to a Json.Payload object
 */

import { MYSQL_DB } from './classes/MYSQL_DB';
import { GENERALNEWS } from './functions/GENERALNEWS';
import { STANDINGS } from './functions/STANDINGS';
import identifyRenderMachine from './functions/identifyRenderMachine';
import { AE } from './types/AE';
import { DB } from './types/DB';
import { RenderMachine } from './types/RenderMachine';
import fs from 'fs';
import axios from 'axios';
import { EDITIONS } from './functions/EDITIONS';
import { FOLDERS } from './functions/FOLDERS';
import { PATHS } from './functions/PATHS';

async function main() {
    const DB = new MYSQL_DB();
    DB.createPool();

    try {
        const editions = await EDITIONS.getAll(DB);
        const renderMachine: RenderMachine = await identifyRenderMachine(DB);
        const absoluteFolderPaths: {
            [key in DB.Jobs.FolderName]: string;
        } = await FOLDERS.getAll(DB, renderMachine);

        const PORT = 9411;
        const API_Endpoint = '/api/extboiler/';

        let texts: AE.Json.TextImport[] = [];
        let files: AE.Json.FileImport[] = [];
        let trimSyncData: AE.Json.TS.Sequence = [];

        const standingTextKeys: DB.Jobs.Mapping.StandingTextKey[] = [
            'team_name',
            'position',
            'wins',
            'losses',
        ];
        const itemTextKeys: DB.Jobs.Mapping.ItemTextKey[] = [
            'headline',
            'sub_headline',
        ];
        const itemFileKeys: DB.Jobs.Mapping.ItemFileKey[] = [
            'narration',
            'background',
            'logo',
        ];

        const mappingFuncs: DB.Jobs.Mapping.Scheme = {
            headline: (item: DB.Item.JoinedNews) => `Headline${item.id}`,
            sub_headline: (item: DB.Item.JoinedNews) =>
                `headlinetext${item.id}1`,
            team_name: (item: DB.Item.JoinedNews, standing: DB.StandingAug) =>
                `ranking-name-team${item.id}-${standing.position}`,
            position: (item: DB.Item.JoinedNews, standing: DB.StandingAug) =>
                `ranking-stat1-team${item.id}-${standing.position}`,
            wins: (item: DB.Item.JoinedNews, standing: DB.StandingAug) =>
                `ranking-stat2-team${item.id}-${standing.position}`,
            losses: (item: DB.Item.JoinedNews, standing: DB.StandingAug) =>
                `ranking-stat3-team${item.id}-${standing.position}`,
            narration: (item: DB.Item.JoinedNews) => `News-Narration${item.id}`,
            background: (item: DB.Item.JoinedNews) => `News-BG${item.id}`,
            logo: (item: DB.Item.JoinedNews) => `News-logo${item.id}`,
        };

        const edition = editions[0];
        //for (const edition of editions) {
        // export file, project file and project save file
        const absoluteFilePaths: AE.Json.AbsolutePath.Obj = PATHS.getAll(
            absoluteFolderPaths,
            edition
        );

        const lang = edition.lang;

        const items: DB.Item.JoinedNews[] =
            await GENERALNEWS.getTransItemsByLang(DB, lang);

        // const item = items[0];

        for (const item of items) {
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
                for (const itemFileKey of itemFileKeys) {
                    const correctedItemKey = itemFileKey === 'narration' ? 'file_name' : itemFileKey;
                    const optionalLangAddition = itemFileKey === 'narration' ? `${lang}/` : '';
                    let folderKey: DB.Jobs.FolderName = itemFileKey as DB.Jobs.FolderName;
                    switch (itemFileKey) {
                        case 'background':
                            folderKey = 'backgrounds';
                            break;
                        case 'logo':
                            folderKey = 'logos';
                            break;
                    }
                    const absoluteFilePath = `${absoluteFolderPaths[folderKey as keyof typeof absoluteFolderPaths]}${optionalLangAddition}${item[correctedItemKey as keyof DB.Item.News]}`;
                        
                    if (!fs.existsSync(absoluteFilePath))
                        throw `absoluteFilePath path does not exist: ${absoluteFilePath}`;
                    files.push({
                        absolutePath: absoluteFilePath,
                        compositionName:
                            mappingFuncs[
                                itemFileKey as DB.Jobs.Mapping.ItemFileKey
                            ](item),
                        resizeAction: null // 'fitToComp', // currently fitToComp is throwing an error
                    });
                }
            }
            
            populateItemFiles();

            const hasStandings = // false;
                !!item.show_standings && !!item.league_season_id;
            console.log(`hasStandings: ${hasStandings}`);

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
                        await STANDINGS.getStandingsByLang(
                            DB,
                            item.sport_name!,
                            item.league_season_id!,
                            lang
                        );

                    standings = standings.slice(0, 10); // we only need the top 10

                    const leagueSeasonName = standings[0].league_season_name; // will be inserted as text
                    
                    standings.forEach((standing, index) => {
                        //console.log(JSON.stringify(standing));
                        
                        if (index >= 10) return; // we only need the top 10

                        for (const standingTextKey of standingTextKeys) {
                            //console.log(standingTextKey);
                            
                            let standingText =
                                standing[standingTextKey as keyof DB.StandingAug];
                            if (!standingText) standingText = 'default' // throw `No value for ${standingTextKey}`;

                            // const textLayerName = eval(
                            //     dbNameToAELayerNameMappingScheme[
                            //         standingTextKey as keyof typeof dbNameToAELayerNameMappingScheme
                            //     ]
                            // );
                            const textLayerName = mappingFuncs[
                                standingTextKey as DB.Jobs.Mapping.StandingTextKey
                            ](item, standing);

                            const text: AE.Json.TextImport = {
                                text: standingText, // might be a number
                                textLayerName,
                                recursiveInsertion: false,
                            };
                            texts.push(text);
                        }
                    });
                }

                await populateStandingsTexts();
            }
        }

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
            for (let i = 1; i <= 2; i++) {
                
                const syncNarrationComps = () => {
                    // first we sync the internal narration comps
                    // narration comps 1-3 are in News comp 1 and 4-5 are in News comp 2
                    
                    // we start with syncing the first narration comp
                    // to the beginning of the timeline (cause it's been trimmed)
                    const syncFirstNarrationLayerToStart = () => {
                        const narrationCompNumber = (i - 1) * 3 + 1; // 1 or 4
                        const narrationCompName = `News-Narration${narrationCompNumber}`;
                        const sync: AE.Json.TS.Sync = {
                            method: 'syncHeadTail',
                            padding: 0.1,
                            layerAName: narrationCompName,
                            layerBName: `stickToStart${i}`, // 1 or 2
                        };
                        trimSyncData.push(sync);
                    }
                    syncFirstNarrationLayerToStart();

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
                            layerAName: nextNarrationCompName,
                            layerBName: narrationCompName,
                        };
                        trimSyncData.push(sync);
                    }
                }
                syncNarrationComps();
                
                const syncBackgrounds = () => {
                    // Each background needs to get synced with the previous narration end
                    const numberOfBackgroundComps = 4 - i;
                    for (let j = 2; j <= numberOfBackgroundComps; j++) {
                        const backgroundCompNumber = (i - 1) * 3 + j; // 2-3 for news 1 and 5 for news 2
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

                const newsCompName = `News comp ${i}`;
                const trim: AE.Json.TS.Trim = {
                    method: 'trimByAudio',
                    layerOrCompName: newsCompName,
                };
                trimSyncData.push(trim);

                const relocateMarkers = () => {
                    const markerLayerName = `Todays news ${i}`;
                    let soundMarkerLayerNames: string[] = [];
                    const numberOfNarrationComps = 4 - i;
                    for (let j = 1; j < numberOfNarrationComps; j++) {
                        const narrationCompNumber = (i - 1) * 3 + j; // 1-2 for news 1 and 4 for news 2
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

        const syncNewsComps = () => {
            // now after we've trimmed the news comps let's sync the news comps
            trimSyncData.push({
                method: 'syncHeadTail',
                padding: 0.1,
                layerAName: 'News comp 2',
                layerBName: 'News comp 1',
            });
        }

        //syncNewsComps();

        let payload: AE.Json.Payload = {
            files,
            texts,
            trimSyncData,
            names: {
                exportComp: '0_Main comp',
                importBin: 'Imports',
            },
            paths: absoluteFilePaths,
            dbg: {
                dbgLevel: 0,
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
        // console.log(JSON.stringify(axiosResponse.data));
        
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
