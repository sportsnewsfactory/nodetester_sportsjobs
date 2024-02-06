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
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { EDITIONS } from './functions/EDITIONS';
import { FOLDERS } from './functions/FOLDERS';
import { PATHS } from './functions/PATHS';

async function main() {
    //console.log('hi');
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

        // const dbNameToAELayerNameMappingScheme: DB.Jobs.Mapping.Scheme = {
        //     // texts per item
        //     headline: '`Headline${item.id}`', // item.headline
        //     sub_headline: '`headlinetext${item.id}1`', // item.sub_headline

        //     // texts per standing
        //     team_name: '`ranking-name-team${item.id}-${standing.position}`', // standing.team_name
        //     position: '`ranking-stat1-team${item.id}-${standing.position}`', // standing.position
        //     wins: '`ranking-stat2-team${item.id}-${standing.position}`', // standing.wins
        //     losses: '`ranking-stat3-team${item.id}-${standing.position}`', // standing.losses

        //     // files
        //     narration: '`News-Narration${item.id}`', // item.narration
        //     background: '`News-BG${item.id}`', // item.background
        //     logo: '`News-logo${item.id}`', // item.logo
        // };

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
        //const item = items[2];

        /**
         * Here we'll implement the mapping scheme.
         * A mapping scheme is an object of the shape {[key: string]: {loopOver: string | null, formula: string}}
         * we need to write down the logic for deriving the content
         * via pointing to the correct location in the DB
         *
         * For example:
         * We can write a mapping scheme for the narration file like this:
         * narrationFilePath: {loopOver: "newsItems", formula: "`${absoluteFolderPaths.narration}${item.file_name}`"}
         *
         * regarding files, the job needs to be able to be executed on any PC or Mac
         * so the pathing has to be relative in the job.
         * So with files we put a formula to calculate the absolute path locally
         * and we assume that when evaluating the formula we have the required resources
         *
         * this way we can calculate the narration file path for each item
         * like this:
         * const narrationFilePath = eval(mappingScheme.narrationFilePath.formula)
         *
         * Now let's look at texts. Texts can be absolute in the job
         * so we point to the location of the text
         */

        for (const item of items) {
            // absolute pathing is done on the local machine
            const absoluteNarrationFilePath = path.resolve(
                absoluteFolderPaths.narration,
                lang,
                item.file_name
            );
            if (!fs.existsSync(absoluteNarrationFilePath))
                throw `Narration file path does not exist: ${absoluteNarrationFilePath}`;

            // firstly let's generate the texts and files (relative, cause we're creating a job)
            // starting with the texts of the news item (headline, sub_headline)

            for (const itemTextKey of itemTextKeys) {
                const textLayerName =
                    mappingFuncs[itemTextKey as DB.Jobs.Mapping.ItemFileKey](
                        item
                    );

                // const textLayerName = eval(
                //     dbNameToAELayerNameMappingScheme[
                //         itemTextKey as keyof typeof dbNameToAELayerNameMappingScheme
                //     ]
                // );
                const text: AE.Json.TextImport = {
                    text: item[itemTextKey as keyof DB.Item.News],
                    textLayerName,
                    recursiveInsertion: false,
                };
                texts.push(text);
            }

            // now let's generate the files
            for (const itemFileKey of itemFileKeys) {
                const absoluteFilePath = path
                    .resolve(
                        absoluteFolderPaths[
                            itemFileKey as keyof typeof absoluteFolderPaths
                        ],
                        item[itemFileKey as keyof DB.Item.News]
                    )
                    .replace(/\\/g, '/');
                if (!fs.existsSync(absoluteFilePath))
                    throw `File path does not exist: ${absoluteFilePath}`;
                files.push({
                    absolutePath: absoluteFilePath,
                    // compositionName: eval(
                    //     dbNameToAELayerNameMappingScheme[
                    //         itemFileKey as keyof typeof dbNameToAELayerNameMappingScheme
                    //     ]
                    // ),
                    compositionName:
                        mappingFuncs[
                            itemFileKey as DB.Jobs.Mapping.ItemFileKey
                        ](item),
                    resizeAction: 'fitToComp',
                });
            }

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
                        lang
                    );

                const leagueSeasonName = standings[0].league_season_name; // will be inserted as text
                standings.forEach((standing) => {
                    for (const standingTextKey of standingTextKeys) {
                        const standingText =
                            standing[standingTextKey as keyof DB.StandingAug];
                        if (!standingText)
                            throw `No value for ${standingTextKey}`;

                        // const textLayerName = eval(
                        //     dbNameToAELayerNameMappingScheme[
                        //         standingTextKey as keyof typeof dbNameToAELayerNameMappingScheme
                        //     ]
                        // );
                        const textLayerName = mappingFuncs[
                            standingTextKey as DB.Jobs.Mapping.StandingTextKey
                        ](item, standing);

                        const text: AE.Json.TextImport = {
                            text: standingText,
                            textLayerName,
                            recursiveInsertion: false,
                        };
                        texts.push(text);
                    }
                });
            }
        }

        // firstly we trim the narration comps
        for (let i = 1; i <= 5; i++) {
            const narrationCompName = `News-Narration${i}`;
            const trim: AE.Json.TS.Trim = {
                method: 'trimByAudio',
                layerOrCompName: narrationCompName,
            };
            trimSyncData.push(trim);
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
                    layerAName: nextNarrationCompName,
                    layerBName: narrationCompName,
                };
                trimSyncData.push(sync);
            }

            const newsCompName = `News comp ${i}`;
            const trim: AE.Json.TS.Trim = {
                method: 'trimByAudio',
                layerOrCompName: newsCompName,
            };
            trimSyncData.push(trim);
        }

        // now after we've trimmed the news comps let's sync the news comps
        trimSyncData.push({
            method: 'syncHeadTail',
            padding: 0.1,
            layerAName: 'News comp 2',
            layerBName: 'News comp 1',
        });

        const payload: AE.Json.Payload = {
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

        const jsoned = JSON.stringify(payload).replace(/\\\\/g, '/');
        // console.warn(jsoned);

        const axiosResponse = await axios.post(
            `http://localhost:${PORT}${API_Endpoint}`,
            { stringifiedJSON: jsoned }
        );
        console.log(JSON.stringify(axiosResponse.data));
        //}
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
