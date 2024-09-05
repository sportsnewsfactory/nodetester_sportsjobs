import { MYSQL_DB } from "../../classes/MYSQL_DB";
import { AE } from "../../types/AE";
import { DB } from "../../types/DB";
import { GENERALNEWS } from "../SPORTNEWS";
import { NEXTMATCHES } from "../NEXTMATCHES";
import { STANDINGS } from "../STANDINGS";
import { formatDateAndTime } from "./formatDateTime";
import { StandingsOptions, generateLayerName } from "./generateLayerName";

export interface ProcessScheduleProps {
    DB: MYSQL_DB;
    lang: string;
}

export async function processSchedule(
    {DB, lang,}: ProcessScheduleProps
): Promise<AE.Json.TextImport[]> {
    
    let texts: AE.Json.TextImport[] = [];
    
    const items: DB.Item.JoinedNews[] = await GENERALNEWS.getTransItemsByLang(DB, lang);

    if (items.length === 0) {
        throw new Error(`No items found for lang ${lang} in table RAPID__TRANS_NEWS`);
    }

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        const item = items[itemIndex];

        const hasSchedule = !!item.show_next_matches && !!item.schedule_league_season_id;

        if (hasSchedule) {

        console.log(`Processing schedule for item ${itemIndex + 1}`);
        // Process schedule if available
            let schedule: DB.NextMatch_NewFormat[] = await NEXTMATCHES.getBySportNameAndLeagueSeasonId(
                DB,
                item.sport_name!,
                item.schedule_league_season_id!
            );

            if (schedule.length > 10) schedule = schedule.slice(0, 10); // we only need the top 10
            
            const scheduleAttributes: DB.Jobs.Mapping.ScheduleKey[] = ['date', 'time', 'home_team', 'away_team'];

            for (let j = 0; j < schedule.length; j++) {
                const match = schedule[j];
                const {date,time} = formatDateAndTime(match.start_time_seconds);
                match.date = date;
                match.time = time;
                scheduleAttributes.forEach(attribute => {
                    const textLayerName = generateLayerName('txt', itemIndex + 1, 'schedule', undefined, { matchNum: j + 1, attribute });
                    const text: AE.Json.TextImport = {
                        text: match[attribute],
                        textLayerName,
                        recursiveInsertion: false,
                    };
                    // console.log(`Generated schedule layer: ${JSON.stringify(text)}`);
                    texts.push(text);
                });
            }
        }
    }
    return texts;
}