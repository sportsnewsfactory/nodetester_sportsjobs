import { MYSQL_DB } from "../../../../classes/MYSQL_DB";
import { NEXTMATCHES } from "../../../../functions/NEXTMATCHES";
import { Schedule } from "../../../../types/CORE/Schedule";
import { DB } from "../../../../types/DB";

export default async function lists_NextMatches(SportsDB: MYSQL_DB,
    sortedNewsItems: DB.Item.JoinedNews[],
    scheduleLeagueSeasonIds: (string | null)[]
): Promise<Schedule.List[]> {

    let schedule: Schedule.List[] = [];

    for (let i=0; i<sortedNewsItems.length; i++){
        const newsItem: DB.Item.JoinedNews = sortedNewsItems[i];
        const scheduleLeagueSeasonId = scheduleLeagueSeasonIds[i];

        if (!scheduleLeagueSeasonId){
            schedule.push({entries: [], header: ''});
            continue;
        } 

        const regularSchedule: DB.NextMatch_NewFormat[] = await NEXTMATCHES.getBySportNameAndLeagueSeasonId(SportsDB, newsItem.sport_name, scheduleLeagueSeasonIds[i] as string);
        if (regularSchedule.length === 0){
            schedule.push({entries: [], header: ''});
        } else {
            schedule.push({entries: regularSchedule, header: regularSchedule[0].league_season_id});
        }
            
    }
    return schedule;
}
