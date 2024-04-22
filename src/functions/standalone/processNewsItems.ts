import { MYSQL_DB } from "../../classes/MYSQL_DB";
import { AE } from "../../types/AE";
import { DB } from "../../types/DB";
import { GENERALNEWS } from "../GENERALNEWS";
import { NEXTMATCHES } from "../NEXTMATCHES";
import { STANDINGS } from "../STANDINGS";
import { formatDateAndTime } from "./formatDateTime";
import { StandingsOptions, generateLayerName } from "./generateLayerName";

export interface RunThroughItemsOptions {
    DB: MYSQL_DB;
    lang: string;
    itemTextKeys: DB.Jobs.Mapping.ItemTextKey[];
    itemFileKeys: DB.Jobs.Mapping.ItemFileKey[];
}

/**
 * The AE Daily News product version, with standings and schedule
 */
export async function processNewsItems({
    DB, 
    lang,
    itemTextKeys = ['headline', 'sub_headline'], 
    itemFileKeys = ['narration', 'background', 'logo']
}: RunThroughItemsOptions): Promise<{
    files: AE.Json.FileImport[], 
    texts: AE.Json.TextImport[]
}> {
    
    let files: AE.Json.FileImport[] = [];
    let texts: AE.Json.TextImport[] = [];
    
    const items = await GENERALNEWS.getTransItemsByLang(DB, lang);

    if (items.length === 0) {
        throw new Error(`No items found for lang ${lang} in table RAPID__TRANS_NEWS`);
    }

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        const item = items[itemIndex];

        // Process texts for the news item
        itemTextKeys.forEach((key) => {
            const textLayerName = generateLayerName('txt', itemIndex + 1, key);
            const text: AE.Json.TextImport = {
                text: item[key as keyof typeof item] as string,
                textLayerName,
                recursiveInsertion: false,
            };
            // console.log(`Generated text layer: ${JSON.stringify(text)}`);
            texts.push(text);
        });

        // Process files associated with the news item
        itemFileKeys.forEach((key) => {
            const fileName = item[key as keyof typeof item] as string;
            const compositionName = generateLayerName('file', itemIndex + 1, key);
            const file: AE.Json.FileImport = {
                absolutePath: `/path/to/files/${fileName}`, // Placeholder path, adjust as needed
                compositionName,
                resizeAction: 'fitToMedia'
            };
            // Assume `files` is a part of some higher scope or returned/processed further
            // console.log(`Generated file layer: ${JSON.stringify(file)}`);
            files.push(file);
        });

        const hasStandings = // false;
            !!item.show_standings && !!item.standings_league_season_id;
        // console.log(`hasStandings: ${hasStandings}`);

        if (hasStandings) {
        // Process standings if available
            let standings: DB.StandingAug[] = await STANDINGS.getStandingsEN(
                DB,
                item.sport_name!,
                item.standings_league_season_id!,
                // lang
            );

            standings = standings.slice(0, 10); // we only need the top 10

            const leagueSeasonName = standings[0].league_season_name || '';
            const standingsHeaderLayerName = `Ranking-header-${itemIndex+1}`;
            texts.push({
                text: leagueSeasonName,
                textLayerName: standingsHeaderLayerName,
                recursiveInsertion: false,
            });

            const standingsAttributes: DB.Jobs.Mapping.StandingTextKey[] = ['team_name', 'position', 'wins', 'losses'];

            standings.forEach((standing, index) => {
                
                standingsAttributes.forEach(attribute => {
                    const textLayerName = generateLayerName('txt', itemIndex + 1, 'standings', { rowNum: index + 1, attribute });
                    const text: AE.Json.TextImport = {
                        text: standing[attribute],
                        textLayerName,
                        recursiveInsertion: false,
                    };
                    // console.log(`Generated standing layer: ${JSON.stringify(text)}`);
                    texts.push(text);
                });
            });
        }

        const hasSchedule = !!item.show_next_matches && !!item.schedule_league_season_id;
                //console.log(`%chasSchedule: ${hasSchedule}`, 'color: Orange');

        if (hasSchedule) {
        // Process schedule if available
            let schedule: DB.NextMatch_NewFormat[] = await NEXTMATCHES.getBySportNameAndLeagueSeasonId(
                DB,
                item.sport_name!,
                item.schedule_league_season_id!
            );

            // console.log(`%cSchedule length: ${schedule.length}`, `color: orange`);

            if (schedule.length > 10) schedule = schedule.slice(0, 10); // we only need the top 10
            
            const scheduleAttributes: DB.Jobs.Mapping.ScheduleKey[] = ['date', 'time', 'home_team', 'away_team'];

            schedule.forEach((match, index) => {
                const {date,time} = formatDateAndTime(match.start_time_seconds);
                match.date = date;
                match.time = time;
                scheduleAttributes.forEach(attribute => {
                    const textLayerName = generateLayerName('txt', itemIndex + 1, 'schedule', undefined, { matchNum: index + 1, attribute });
                    const text: AE.Json.TextImport = {
                        text: match[attribute],
                        textLayerName,
                        recursiveInsertion: false,
                    };
                    // console.log(`Generated schedule layer: ${JSON.stringify(text)}`);
                    texts.push(text);
                });
            });
        }
    }
    return { files, texts };
}

/* 
    Example usage (assuming DB and other imports are correctly set up)
    runThroughItems({
        DB: yourDBInstance,
        lang: 'en',
        itemTextKeys: ['headline', 'sub_headline'],
        itemFileKeys: ['narration', 'background', 'logo']
    }).catch(console.error);
*/
