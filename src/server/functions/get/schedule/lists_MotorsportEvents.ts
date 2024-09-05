import { MYSQL_DB } from "../../../../classes/MYSQL_DB";
import { MOTORSPORT_EVENTS } from "../../../../functions/MOTORSPORT_EVENTS";
import { DB } from "../../../../types/DB";
import { Motorsport } from "../../../../types/Motorsport";

export default async function lists_MotorsportEvents(
    SportsDB: MYSQL_DB,
    sortedNewsItems: DB.Item.JoinedNews[],
    scheduleLeagueSeasonIds: (string | null)[]
): Promise<Motorsport.Schedule.List[]> {

    let schedule: Motorsport.Schedule.List[] = [];

    for (let i=0; i<sortedNewsItems.length; i++){
        const newsItem: DB.Item.JoinedNews = sortedNewsItems[i];
        const scheduleLeagueSeasonId = scheduleLeagueSeasonIds[i];

        if (!scheduleLeagueSeasonId){
            schedule.push({events: []});
            continue;
        } 
        
        const leagueEvents: Motorsport.Schedule.List = 
            await MOTORSPORT_EVENTS.getByLeagueSeasonId(SportsDB, scheduleLeagueSeasonId);
        schedule.push(leagueEvents);
        continue;
    }
    return schedule;
}
