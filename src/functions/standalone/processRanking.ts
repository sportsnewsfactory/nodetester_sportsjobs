import { MYSQL_DB } from "../../classes/MYSQL_DB";
import { AE } from "../../types/AE";
import { DB } from "../../types/DB";
import { GENERALNEWS } from "../GENERALNEWS";
import { NEXTMATCHES } from "../NEXTMATCHES";
import { STANDINGS } from "../STANDINGS";
import { formatDateAndTime } from "./formatDateTime";
import { StandingsOptions, generateLayerName } from "./generateLayerName";

export interface ProcessRankingProps {
    DB: MYSQL_DB;
    lang: string;
}

/**
 * The AE Daily News product version, with standings and schedule
 */
export async function processRanking({
    DB, 
    lang,
}: ProcessRankingProps): Promise<
    // files: AE.Json.FileImport[], 
    AE.Json.TextImport[]
> {
    
    let files: AE.Json.FileImport[] = [];
    let texts: AE.Json.TextImport[] = [];
    
    const items = await GENERALNEWS.getTransItemsByLang(DB, lang);

    if (items.length === 0) {
        throw new Error(`No items found for lang ${lang} in table RAPID__TRANS_NEWS`);
    }

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        const item = items[itemIndex];

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
            // const standingsHeaderLayerName = `Ranking-header-${itemIndex+1}`;

            // when no rowNum is passed it's the header: `txt-item1-ranking-header`
            const rankingHeaderLayerName: string = generateLayerName('txt', itemIndex + 1, 'standings');
            texts.push({
                text: leagueSeasonName,
                textLayerName: rankingHeaderLayerName,
                recursiveInsertion: false,
            });

            /* 
                now let's do the titles.
                titles appear at the top of the standings,
                hence, only once per item.
                We're currently doing only wins and losses as this
                is relevant for all sports we're currently working with.
                
                The titles are as follows:
                    txt-item1-ranking-title-wins
                    txt-item1-ranking-title-losses
            */

            const titles: DB.Jobs.Mapping.StandingTextKey[] = ['wins', 'losses'];
            for (let i=0; i<titles.length; i++) {
                const title = titles[i];
                const titleLayerName = generateLayerName('txt', itemIndex + 1, 'standings', { attribute: title });
                const text: AE.Json.TextImport = {
                    text: title,
                    textLayerName: titleLayerName,
                    recursiveInsertion: false,
                };
                texts.push(text);
            }

            const standingsAttributes: DB.Jobs.Mapping.StandingTextKey[] = ['team_name', 'position', 'wins', 'losses'];

            for (let j=0; j<standings.length; j++) {
                const standing = standings[j];
            // standings.forEach((standing, index) => {
                
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
            }
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
                    console.log(`Generated schedule layer: ${JSON.stringify(text)}`);
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
