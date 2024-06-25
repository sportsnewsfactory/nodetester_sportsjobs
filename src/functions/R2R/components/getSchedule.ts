import { MYSQL_DB } from "../../../classes/MYSQL_DB";
import { Motorsport } from "../../../types/Motorsport";
import { MOTORSPORT_EVENTS } from "../../MOTORSPORT_EVENTS";
import { MOTORSPORT_STANDINGS } from "../../MOTORSPORT_STANDINGS";

export async function getMotorsportSchedule(
    SportsDB: MYSQL_DB,
    leagueSeasonsIds: (string | null)[]
): Promise<Motorsport.Schedule.List[]>{
    try {
        const schedule: Motorsport.Schedule.List[] = [];

        for (let i=1; i<=leagueSeasonsIds.length; i++){
            const leagueSeasonId = leagueSeasonsIds[i];
            if (leagueSeasonId === null) { schedule.push({events: []}); continue }
            const leagueEvents: Motorsport.Schedule.List = 
                await MOTORSPORT_EVENTS.getByLeagueSeasonId(SportsDB, leagueSeasonId);
            schedule.push(leagueEvents);
            // console.log(`leagueStandings: ${JSON.stringify(schedule, null, 4)}`);
            // throw 'stop';
        }
        return schedule;
    } catch (e) {
        throw `getMotorsportSchedule failed with: ${e}`;
    }
}