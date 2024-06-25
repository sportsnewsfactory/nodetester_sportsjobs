import { MYSQL_DB } from "../../../classes/MYSQL_DB";
import { Motorsport } from "../../../types/Motorsport";
import { MOTORSPORT_STANDINGS } from "../../MOTORSPORT_STANDINGS";

export async function getMotorsportStandings(
    SportsDB: MYSQL_DB,
    leagueSeasonsIds: (string | null)[]
): Promise<Motorsport.Standings.List[]>{
    try {
        const standings: Motorsport.Standings.List[] = [];

        for (let i=1; i<=leagueSeasonsIds.length; i++){
            const leagueSeasonId = leagueSeasonsIds[i];
            if (leagueSeasonId === null) { standings.push({entries: []}); continue }
            const leagueStandings = 
                await MOTORSPORT_STANDINGS.getStandingsEN(SportsDB, leagueSeasonId);
            standings.push(leagueStandings);
            // console.log(`leagueStandings: ${JSON.stringify(leagueStandings, null, 4)}`);
            // return;
        }
        return standings;
    } catch (e) {
        throw `getMotorsportStandings failed with: ${e}`;
    }
}